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
          res.resume();
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
 * Calcula el hash SHA-256 de un archivo local mediante stream.
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

  try {
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
  } catch (err) {
    console.warn(`Error listando archivos en ${dirPath}:`, err);
  }
  return results;
}

/**
 * Descarga atómica de un archivo individual con verificación SHA-256 y reintentos automáticos.
 */
async function downloadSingleFileAtomic(
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

    const tempPath = `${destinationPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
    const fileStream = fs.createWriteStream(tempPath);
    const hash = crypto.createHash('sha256');

    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent;

    const req = client.get(url, { agent, headers: { 'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}` } }, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        fileStream.close();
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        return reject(new Error(`HTTP ${res.statusCode} descargando ${url}`));
      }

      res.on('data', (chunk: Buffer) => {
        if (abortSignal?.aborted) {
          req.destroy();
          fileStream.close();
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
          return reject(new Error('Descarga cancelada'));
        }
        hash.update(chunk);
        fileStream.write(chunk);
        onBytesDownloaded(chunk.length);
      });

      res.on('end', () => {
        fileStream.end();
      });

      fileStream.on('finish', () => {
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
          if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
          }
          fs.renameSync(tempPath, destinationPath);
          resolve();
        } catch (renameErr) {
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
          reject(renameErr);
        }
      });

      fileStream.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        reject(err);
      });

      res.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        reject(err);
      });
    });

    req.on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      reject(err);
    });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        req.destroy();
        fileStream.close();
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        reject(new Error('Descarga cancelada'));
      });
    }
  });
}

/**
 * MOTOR MAESTRO DE SINCRONIZACIÓN DIFERENCIAL (DELTA SYNC)
 * Ejecuta validación exhaustiva, políticas strict/merge/seed y descargas concurrentes.
 */
export async function syncModpackFromVps(
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

  log(`Iniciando Delta Sync para "${manifest.packName}" v${manifest.packVersion} (${manifest.totalFiles} archivos)...`);

  if (!fs.existsSync(instanceDir)) {
    fs.mkdirSync(instanceDir, { recursive: true });
  }

  // 1. Mapeo de archivos del manifiesto y carpetas de política 'strict'
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

  // Carpetas que deben mantenerse estrictas por defecto para evitar incompatibilidad de mods
  strictDirs.add('mods');
  strictDirs.add('kubejs');
  strictDirs.add('datapacks');

  // 2. Limpieza de archivos obsoletos o huérfanos en carpetas 'strict'
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

  // 3. Verificación diferencial de integridad local
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
    if (verifyIndex % 50 === 0 && onProgress) {
      onProgress({
        step: 'verifying',
        title: 'Verificando Integridad de Archivos',
        detail: `Verificando ${verifyIndex} / ${manifest.files.length}...`,
        currentFile: file.path,
        totalFiles: manifest.files.length,
        completedFiles: verifyIndex,
        percentage: Math.round((verifyIndex / manifest.files.length) * 30)
      });
    }

    const localFilePath = path.join(instanceDir, ...file.path.split('/'));

    // Política Seed: Si el archivo ya existe localmente, no tocarlo jamás
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

    // Comprobar existencia y hash SHA-256
    if (!fs.existsSync(localFilePath)) {
      toDownload.push(file);
      totalBytesToDownload += file.size;
    } else {
      const stats = fs.statSync(localFilePath);
      if (stats.size !== file.size) {
        toDownload.push(file);
        totalBytesToDownload += file.size;
      } else {
        const localHash = await computeFileSha256(localFilePath);
        if (localHash === file.sha256.toLowerCase()) {
          skippedCount++;
        } else {
          toDownload.push(file);
          totalBytesToDownload += file.size;
        }
      }
    }
  }

  log(`Verificación finalizada: ${skippedCount} archivos al día, ${toDownload.length} por sincronizar.`);

  // Si todos los archivos están intactos, finalizar
  if (toDownload.length === 0) {
    if (onProgress) {
      onProgress({
        step: 'syncing_files',
        title: 'Modpack Actualizado',
        detail: `Todos los ${manifest.totalFiles} archivos están en perfecto estado.`,
        totalFiles: manifest.totalFiles,
        completedFiles: manifest.totalFiles,
        percentage: 100
      });
    }
    return {
      success: true,
      downloaded: 0,
      skipped: skippedCount,
      deleted: deletedCount
    };
  }

  // 4. Descarga concurrente con hasta 3 reintentos automáticos
  let downloadedCount = 0;
  let totalDownloadedBytes = 0;
  const startTime = Date.now();
  let lastReportTime = 0;

  const onByteProgress = (chunkSize: number, currentFilePath: string) => {
    totalDownloadedBytes += chunkSize;
    const now = Date.now();

    if (now - lastReportTime > 150 && onProgress) {
      lastReportTime = now;
      const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
      const speed = Math.round(totalDownloadedBytes / elapsedSec);
      const remainingBytes = Math.max(0, totalBytesToDownload - totalDownloadedBytes);
      const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;
      const pct = Math.min(99, 30 + Math.round((totalDownloadedBytes / Math.max(1, totalBytesToDownload)) * 70));

      onProgress({
        step: 'syncing_files',
        title: 'Descargando Mods y Configs (VPS Oracle)',
        detail: `${(totalDownloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytesToDownload / (1024 * 1024)).toFixed(1)} MB (${downloadedCount}/${toDownload.length})`,
        currentFile: currentFilePath,
        totalFiles: toDownload.length,
        completedFiles: downloadedCount,
        percentage: pct,
        speedBytesPerSec: speed,
        etaSeconds: eta,
        totalBytes: totalBytesToDownload,
        downloadedBytes: totalDownloadedBytes
      });
    }
  };

  let globalWorkIndex = 0;
  const totalTasks = toDownload.length;

  async function worker(workerId: number): Promise<void> {
    while (globalWorkIndex < totalTasks) {
      if (abortSignal?.aborted) throw new Error('Sincronización cancelada');

      const currentIndex = globalWorkIndex++;
      const fileToSync = toDownload[currentIndex];
      const destPath = path.join(instanceDir, ...fileToSync.path.split('/'));

      let attempts = 0;
      let success = false;
      let lastErr: any = null;

      while (attempts < 3 && !success) {
        attempts++;
        try {
          await downloadSingleFileAtomic(
            fileToSync.url,
            destPath,
            fileToSync.sha256,
            (bytes) => onByteProgress(bytes, fileToSync.path),
            abortSignal
          );
          success = true;
          downloadedCount++;
        } catch (err: any) {
          lastErr = err;
          log(`[Reintento ${attempts}/3] ${fileToSync.path}: ${err.message}`, 'WARN');
        }
      }

      if (!success) {
        throw new Error(`Fallo crítico al descargar ${fileToSync.path} tras 3 intentos: ${lastErr?.message || lastErr}`);
      }
    }
  }

  const effectiveConcurrency = Math.min(concurrency, toDownload.length);
  const workers = Array.from({ length: effectiveConcurrency }, (_, i) => worker(i));

  await Promise.all(workers);

  log(`Delta Sync completado: ${downloadedCount} archivos descargados e integrados exitosamente.`);

  if (onProgress) {
    onProgress({
      step: 'syncing_files',
      title: 'Sincronización Completada',
      detail: `${downloadedCount} archivos descargados correctamente.`,
      totalFiles: toDownload.length,
      completedFiles: downloadedCount,
      percentage: 100,
      totalBytes: totalBytesToDownload,
      downloadedBytes: totalBytesToDownload
    });
  }

  return {
    success: true,
    downloaded: downloadedCount,
    skipped: skippedCount,
    deleted: deletedCount
  };
}
