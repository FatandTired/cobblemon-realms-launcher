import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { DownloadProgress } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

const execAsync = promisify(exec);

/**
 * Busca recursivamente el ejecutable javaw.exe o java.exe dentro de un directorio.
 */
export function findJavaExecutable(dirPath: string): string | null {
  if (!fs.existsSync(dirPath)) return null;

  const isWindows = process.platform === 'win32';
  const targetExec = isWindows ? 'javaw.exe' : 'java';
  const fallbackExec = isWindows ? 'java.exe' : 'java';

  // Primero verificar en dirPath/bin/
  const directBin = path.join(dirPath, 'bin', targetExec);
  if (fs.existsSync(directBin)) return directBin;

  const directFallback = path.join(dirPath, 'bin', fallbackExec);
  if (fs.existsSync(directFallback)) return directFallback;

  // Búsqueda en subdirectorios (por si el zip extrae jdk-21.x-jre/)
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subBin = path.join(dirPath, entry.name, 'bin', targetExec);
        if (fs.existsSync(subBin)) return subBin;
        const subFallback = path.join(dirPath, entry.name, 'bin', fallbackExec);
        if (fs.existsSync(subFallback)) return subFallback;
      }
    }
  } catch (err) {
    console.error('Error buscando ejecutable de Java:', err);
  }

  return null;
}

/**
 * Descarga un archivo siguiendo redirecciones HTTP 301/302/307 (común en Adoptium/GitHub).
 */
async function downloadFileWithRedirects(
  initialUrl: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number, speed: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleRequest = (url: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Demasiadas redirecciones HTTP'));
      }

      const client = url.startsWith('https:') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}` } }, (res) => {
        if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307)) {
          const redirectUrl = res.headers.location;
          res.resume(); // Drenar socket para evitar bloqueos
          if (!redirectUrl) return reject(new Error('Redirección sin URL de destino'));
          return handleRequest(redirectUrl, redirectCount + 1);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} descargando Java de ${url}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastTime = Date.now();
        let bytesSinceLastTime = 0;

        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          bytesSinceLastTime += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          if (now - lastTime > 150) {
            const speed = Math.round((bytesSinceLastTime / (now - lastTime)) * 1000);
            lastTime = now;
            bytesSinceLastTime = 0;
            if (onProgress) {
              onProgress(downloadedBytes, totalBytes, speed);
            }
          }
        });

        res.on('end', () => {
          fileStream.end();
        });

        fileStream.on('finish', () => {
          resolve();
        });

        fileStream.on('error', (err) => {
          fileStream.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          reject(err);
        });

        res.on('error', (err) => {
          fileStream.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          reject(err);
        });
      });

      req.on('error', (err) => {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    };

    handleRequest(initialUrl);
  });
}

/**
 * Extrae un archivo ZIP usando tar.exe nativo de Windows (ultrarrápido y sin dependencias de PowerShell)
 * o utilidades equivalentes.
 */
async function extractZip(zipPath: string, targetDir: string): Promise<void> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (process.platform === 'win32') {
    // 1. Intentar primero con tar.exe nativo de Windows (System32\tar.exe)
    try {
      const tarExe = fs.existsSync('C:\\Windows\\System32\\tar.exe')
        ? 'C:\\Windows\\System32\\tar.exe'
        : 'tar.exe';
      await execAsync(`"${tarExe}" -xf "${zipPath}" -C "${targetDir}"`);
      return;
    } catch (tarErr) {
      console.warn('Fallo tar.exe, intentando con PowerShell:', tarErr);
    }

    // 2. Fallback a PowerShell con ruta absoluta
    const psExe = fs.existsSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')
      ? 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
      : 'powershell.exe';
    const cmd = `"${psExe}" -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`;
    await execAsync(cmd);
  } else {
    // En Linux/macOS usar unzip
    await execAsync(`unzip -o "${zipPath}" -d "${targetDir}"`);
  }
}

/**
 * Asegura la existencia de Java 21 Temurin portátil en el equipo.
 * Si ya existe, lo valida y retorna de inmediato.
 * Si no existe, lo descarga desde la API de Adoptium y lo extrae.
 */
export async function ensureJava21(
  runtimeDir: string,
  onProgress?: (progress: DownloadProgress) => void,
  onLog?: (msg: string) => void
): Promise<string> {
  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  log('Verificando runtime de Java 21 Temurin...');
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }

  // 1. Comprobar si ya existe
  const existingJava = findJavaExecutable(runtimeDir);
  if (existingJava) {
    log(`Runtime de Java 21 encontrado en: ${existingJava}`);
    return existingJava;
  }

  // 2. Descargar Java 21 Temurin (Adoptium API)
  log('Java 21 no encontrado localmente. Descargando Eclipse Temurin JRE 21 portátil...');

  if (onProgress) {
    onProgress({
      step: 'downloading_java',
      title: 'Descargando Java 21 Temurin',
      detail: 'Conectando con api.adoptium.net...',
      totalFiles: 1,
      completedFiles: 0,
      percentage: 0
    });
  }

  const zipTempPath = path.join(runtimeDir, `temurin-21-${Date.now()}.zip`);

  try {
    await downloadFileWithRedirects(
      APP_CONFIG.ADOPTIUM.API_URL,
      zipTempPath,
      (downloaded, total, speed) => {
        if (onProgress) {
          const pct = total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 50;
          const eta = speed > 0 && total > downloaded ? Math.round((total - downloaded) / speed) : 0;
          onProgress({
            step: 'downloading_java',
            title: 'Descargando Java 21 Temurin',
            detail: `${(downloaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`,
            totalFiles: 1,
            completedFiles: 0,
            percentage: pct,
            speedBytesPerSec: speed,
            etaSeconds: eta,
            totalBytes: total,
            downloadedBytes: downloaded
          });
        }
      }
    );

    log('Descarga completada. Extrayendo archivo ZIP...');
    if (onProgress) {
      onProgress({
        step: 'downloading_java',
        title: 'Extrayendo Java 21 Temurin',
        detail: 'Descomprimiendo binarios del runtime...',
        totalFiles: 1,
        completedFiles: 0,
        percentage: 95
      });
    }

    await extractZip(zipTempPath, runtimeDir);

    // Eliminar ZIP temporal
    if (fs.existsSync(zipTempPath)) {
      fs.unlinkSync(zipTempPath);
    }

    const resolvedJava = findJavaExecutable(runtimeDir);
    if (!resolvedJava) {
      throw new Error('No se pudo encontrar javaw.exe tras extraer el archivo de Temurin 21');
    }

    log(`Java 21 Temurin instalado y verificado exitosamente en: ${resolvedJava}`);
    return resolvedJava;
  } catch (err: any) {
    if (fs.existsSync(zipTempPath)) {
      try { fs.unlinkSync(zipTempPath); } catch {}
    }
    throw new Error(`Fallo en la instalación automática de Java 21: ${err.message}`);
  }
}
