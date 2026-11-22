import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { DownloadProgress, ManifestFile, ModpackManifest, SyncResult } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

// Agente HTTP con keep-alive para reutilización de sockets TCP en el CDN
const httpKeepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 8,
  timeout: 30000
});

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 8,
  timeout: 30000
});

/**
 * Descarga y parsea el archivo manifest.json desde el VPS con soporte de gzip.
 */
export async function fetchRemoteManifest(manifestUrl = APP_CONFIG.VPS.MANIFEST_URL): Promise<ModpackManifest> {
  return new Promise((resolve, reject) => {
    const isHttps = manifestUrl.startsWith('https:');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent;

    const req = client.get(
      manifestUrl,
      {
        agent,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}`
        }
      },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Error HTTP ${res.statusCode} al obtener manifest.json de ${manifestUrl}`));
        }

        const encoding = res.headers['content-encoding'];
        let stream: NodeJS.ReadableStream = res;

        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        }

        let rawData = '';
        stream.setEncoding('utf-8');
        stream.on('data', (chunk) => {
          rawData += chunk;
        });

        stream.on('end', () => {
          try {
            const manifest: ModpackManifest = JSON.parse(rawData);
            resolve(manifest);
          } catch (err: any) {
            reject(new Error(`Fallo al parsear JSON del manifiesto: ${err.message}`));
          }
        });

        stream.on('error', (err) => {
          reject(err);
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout al consultar manifest.json en el VPS'));
    });
  });
}

/**
 * Calcula el hash SHA-256 de un archivo local.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`Archivo no existe: ${filePath}`));
    }
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Escanea recursivamente un directorio y retorna las rutas relativas en formato POSIX ('/').
 */
function getAllLocalFiles(dirPath: string, baseDir = dirPath): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const list = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllLocalFiles(fullPath, baseDir));
    } else {
      const relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push(relative);
    }
  }
  return results;
}

/**
 * Descarga un archivo individual con verificación de integridad SHA-256.
 */
async function downloadSingleFile(
  url: string,
  destinationPath: string,
  expectedSha256: string,
  onBytesDownloaded: (bytes: number) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      return reject(new Error('Descarga cancelada'));
    }

    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${destinationPath}.tmp.${Date.now()}`;
    const fileStream = fs.createWriteStream(tempPath);
    const hash = crypto.createHash('sha256');

    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent;

    const req = client.get(url, { agent }, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        fileStream.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return reject(new Error(`HTTP ${res.statusCode} descargando ${url}`));
      }

      res.on('data', (chunk: Buffer) => {
        if (abortSignal?.aborted) {
          req.destroy();
          fileStream.close();
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          return reject(new Error('Descarga cancelada'));
        }
        hash.update(chunk);
        fileStream.write(chunk);
        onBytesDownloaded(chunk.length);
      });

      res.on('end', () => {
        fileStream.end();
      });

      fileStream.on('finish', async () => {
        const actualHash = hash.digest('hex').toLowerCase();
        if (actualHash !== expectedSha256.toLowerCase()) {
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
          return reject(
            new Error(`SHA-256 no coincide para ${url}. Esperado: ${expectedSha256}, Obtenido: ${actualHash}`)
          );
        }

        try {
          // Si el archivo de destino existe, lo reemplazamos
          if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
          }
          fs.renameSync(tempPath, destinationPath);
          resolve();
        } catch (renameErr) {
          reject(renameErr);
        }
      });

      res.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        reject(err);
      });
    });

    req.on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      reject(err);
    });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        req.destroy();
        fileStream.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        reject(new Error('Descarga cancelada'));
      });
    }
  });
}

/**
 * MOTOR PRINCIPAL DE SINCRONIZACIÓN DIFERENCIAL (DELTA SYNC)
 */
export async function performDeltaSync(
  instanceDir: string,
  manifest: ModpackManifest,
  concurrency = APP_CONFIG.VPS.CONCURRENCY,
  onProgress?: (progress: DownloadProgress) => void,
  onLog?: (message: string, level?: 'INFO' | 'WARN' | 'ERROR') => void,
  abortSignal?: AbortSignal
): Promise<SyncResult> {
  const log = (msg: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') => {
    if (onLog) onLog(msg, level);
  };

  log(`Iniciando Delta Sync contra el VPS (${manifest.totalFiles} archivos en manifiesto)...`);

  // Paso 1: Clasificar archivos y verificar políticas
  const strictDirs = new Set<string>();
  const manifestFileMap = new Map<string, ManifestFile>();

  for (const file of manifest.files) {
    const normalizedPath = file.path.replace(/\\/g, '/');
    manifestFileMap.set(normalizedPath, file);

    if (file.policy === 'strict') {
      const topDir = normalizedPath.split('/')[0];
      if (topDir && topDir !== normalizedPath) {
        strictDirs.add(topDir);
      }
    }
  }

  // Paso 2: Limpieza de archivos locales huérfanos en carpetas 'strict' (ej. mods viejos)
  let deletedCount = 0;
  for (const dirName of strictDirs) {
    const fullDirPath = path.join(instanceDir, dirName);
    const localFiles = getAllLocalFiles(fullDirPath, instanceDir);

    for (const relPath of localFiles) {
      if (!manifestFileMap.has(relPath)) {
        const toDeletePath = path.join(instanceDir, relPath);
        try {
          fs.unlinkSync(toDeletePath);
          deletedCount++;
          log(`[Strict Policy] Archivo obsoleto eliminado: ${relPath}`);
        } catch (delErr) {
          log(`Error eliminando archivo ${relPath}: ${delErr}`, 'WARN');
        }
      }
    }
  }

  // Paso 3: Identificar archivos faltantes o desactualizados
  const toDownload: ManifestFile[] = [];
  let skippedCount = 0;
  let totalBytesToDownload = 0;

  if (onProgress) {
    onProgress({
      step: 'verifying',
      title: 'Verificando Integridad de Archivos',
      detail: 'Comprobando hashes SHA-256 locales con el manifiesto...',
      totalFiles: manifest.files.length,
      completedFiles: 0,
      percentage: 0
    });
  }

  let verifyIndex = 0;
  for (const file of manifest.files) {
    if (abortSignal?.aborted) throw new Error('Sincronización cancelada');

    verifyIndex++;
    if (verifyIndex % 100 === 0 && onProgress) {
      onProgress({
        step: 'verifying',
        title: 'Verificando Integridad de Archivos',
        detail: `Verificando ${verifyIndex} / ${manifest.files.length}...`,
        totalFiles: manifest.files.length,
        completedFiles: verifyIndex,
        percentage: Math.round((verifyIndex / manifest.files.length) * 30)
      });
    }

    const localFilePath = path.join(instanceDir, file.path);

    // Política 'seed': Solo descargar si no existe
    if (file.policy === 'seed') {
      if (fs.existsSync(localFilePath)) {
        skippedCount++;
        continue;
      } else {
        toDownload.push(file);
        totalBytesToDownload += file.size;
        continue;
      }
    }

    // Política 'strict' y 'merge'
    if (!fs.existsSync(localFilePath)) {
      toDownload.push(file);
      totalBytesToDownload += file.size;
    } else {
      // Comparar tamaño primero para velocidad
      const stats = fs.statSync(localFilePath);
      if (stats.size !== file.size) {
        toDownload.push(file);
        totalBytesToDownload += file.size;
      } else {
        // Mismo tamaño, verificar SHA-256
        const hash = await computeFileSha256(localFilePath);
        if (hash === file.sha256.toLowerCase()) {
          skippedCount++;
        } else {
          toDownload.push(file);
          totalBytesToDownload += file.size;
        }
      }
    }
  }

  log(`Verificación completa: ${skippedCount} archivos ya al día, ${toDownload.length} por sincronizar.`);

  if (toDownload.length === 0) {
    if (onProgress) {
      onProgress({
        step: 'syncing_files',
        title: 'Archivos Sincronizados',
        detail: 'Todos los mods y configuraciones están actualizados.',
        totalFiles: 0,
        completedFiles: 0,
        percentage: 100
      });
    }
    return { success: true, downloaded: 0, skipped: skippedCount, deleted: deletedCount };
  }

  // Paso 4: Descarga concurrente con pool de trabajadores (6-8 hilos)
  let completedDownloads = 0;
  let downloadedBytes = 0;
  const startTime = Date.now();
  let lastProgressUpdate = 0;

  const onChunk = (chunkBytes: number) => {
    downloadedBytes += chunkBytes;
    const now = Date.now();
    if (now - lastProgressUpdate > 100 && onProgress) {
      lastProgressUpdate = now;
      const elapsedSeconds = Math.max(0.1, (now - startTime) / 1000);
      const speed = Math.round(downloadedBytes / elapsedSeconds);
      const remainingBytes = Math.max(0, totalBytesToDownload - downloadedBytes);
      const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;
      const pct = Math.min(99, Math.round((downloadedBytes / Math.max(1, totalBytesToDownload)) * 100));

      onProgress({
        step: 'syncing_files',
        title: 'Sincronizando Modpack (Delta Sync)',
        detail: `${completedDownloads} / ${toDownload.length} archivos descargados`,
        totalFiles: toDownload.length,
        completedFiles: completedDownloads,
        percentage: pct,
        speedBytesPerSec: speed,
        etaSeconds: eta,
        totalBytes: totalBytesToDownload,
        downloadedBytes
      });
    }
  };

  // Cola de descargas
  let queueIndex = 0;
  const totalInQueue = toDownload.length;

  async function worker(workerId: number): Promise<void> {
    while (queueIndex < totalInQueue) {
      if (abortSignal?.aborted) throw new Error('Sincronización cancelada');

      const currentIndex = queueIndex++;
      const file = toDownload[currentIndex];
      const destPath = path.join(instanceDir, file.path);

      let attempts = 0;
      let success = false;
      let lastError: any = null;

      while (attempts < 2 && !success) {
        attempts++;
        try {
          await downloadSingleFile(file.url, destPath, file.sha256, onChunk, abortSignal);
          success = true;
          completedDownloads++;
        } catch (err) {
          lastError = err;
          log(`Reintentando descarga (${attempts}/2): ${file.path} - ${err}`, 'WARN');
        }
      }

      if (!success) {
        throw new Error(`Fallo descargando ${file.path}: ${lastError?.message || lastError}`);
      }
    }
  }

  const workerCount = Math.min(concurrency, toDownload.length);
  const workers = Array.from({ length: workerCount }, (_, i) => worker(i));
  await Promise.all(workers);

  log(`Delta Sync finalizado con éxito: ${completedDownloads} archivos descargados.`);

  if (onProgress) {
    onProgress({
      step: 'syncing_files',
      title: 'Sincronización Completada',
      detail: `${completedDownloads} archivos descargados e integrados.`,
      totalFiles: toDownload.length,
      completedFiles: completedDownloads,
      percentage: 100,
      totalBytes: totalBytesToDownload,
      downloadedBytes: totalBytesToDownload
    });
  }

  return {
    success: true,
    downloaded: completedDownloads,
    skipped: skippedCount,
    deleted: deletedCount
  };
}
