import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import { DownloadProgress } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

const execFileAsync = promisify(execFile);

export interface JavaValidationResult {
  javaPath: string;
  javawPath: string;
  versionString: string;
}

/**
 * Busca de forma recursiva (hasta 4 niveles) el ejecutable java.exe y javaw.exe dentro de un directorio.
 */
export function findJavaBinaries(dirPath: string): { javaExe: string; javawExe: string } | null {
  if (!fs.existsSync(dirPath)) return null;

  const isWindows = process.platform === 'win32';
  const javaName = isWindows ? 'java.exe' : 'java';
  const javawName = isWindows ? 'javaw.exe' : 'java';

  // 1. Comprobación directa en dirPath/bin
  const directJava = path.join(dirPath, 'bin', javaName);
  const directJavaw = path.join(dirPath, 'bin', javawName);
  if (fs.existsSync(directJava)) {
    return { javaExe: directJava, javawExe: fs.existsSync(directJavaw) ? directJavaw : directJava };
  }

  // 2. Búsqueda recursiva en subcarpetas (ej. jdk-21.0.13.1+2-jre/bin/...)
  const queue: { currentDir: string; depth: number }[] = [{ currentDir: dirPath, depth: 0 }];

  while (queue.length > 0) {
    const { currentDir, depth } = queue.shift()!;
    if (depth > 3) continue;

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(currentDir, entry.name);
          const candidateJava = path.join(subPath, 'bin', javaName);
          const candidateJavaw = path.join(subPath, 'bin', javawName);

          if (fs.existsSync(candidateJava)) {
            return {
              javaExe: candidateJava,
              javawExe: fs.existsSync(candidateJavaw) ? candidateJavaw : candidateJava
            };
          }
          queue.push({ currentDir: subPath, depth: depth + 1 });
        }
      }
    } catch (err) {
      console.warn(`Error explorando directorio de Java ${currentDir}:`, err);
    }
  }

  return null;
}

/**
 * Valida un ejecutable de Java ejecutando `java.exe -version`.
 * Verifica que el código de salida sea 0 y que la versión sea Java 21.
 */
export async function validateJavaVersion(javaExePath: string): Promise<JavaValidationResult> {
  if (!fs.existsSync(javaExePath)) {
    throw new Error(`El ejecutable de Java no existe en disco: ${javaExePath}`);
  }

  try {
    const { stdout, stderr } = await execFileAsync(javaExePath, ['-version'], { timeout: 10000 });
    const output = `${stdout || ''} ${stderr || ''}`;

    // Java imprime información de versión en stderr por estándar de OpenJDK
    const match = output.match(/version\s+"(\d+)/i) || output.match(/openjdk\s+(\d+)/i) || output.match(/(\d{2})\.\d+/);
    const majorVersion = match ? parseInt(match[1], 10) : null;

    if (!majorVersion || majorVersion !== 21) {
      throw new Error(
        `Versión de Java incorrecta detectada (${majorVersion || 'desconocida'}). Se requiere estrictamente Java 21 para Minecraft 1.21.1 / NeoForge 21.1.265. Detalle: ${output.trim()}`
      );
    }

    const javawPath = javaExePath.replace(/java\.exe$/i, 'javaw.exe');
    return {
      javaPath: javaExePath,
      javawPath: fs.existsSync(javawPath) ? javawPath : javaExePath,
      versionString: output.split('\n')[0]?.trim() || 'Java 21'
    };
  } catch (err: any) {
    throw new Error(`Fallo al ejecutar y validar Java en ${javaExePath}: ${err.message}`);
  }
}

/**
 * Descarga el archivo de Adoptium usando streams atómicos (.zip.part -> .zip)
 * con soporte para redirecciones HTTP 301/302/307.
 */
function downloadTemurinZip(
  initialUrl: string,
  finalZipPath: string,
  onProgress?: (progress: DownloadProgress) => void,
  onLog?: (msg: string) => void
): Promise<void> {
  const partPath = `${finalZipPath}.part`;

  return new Promise((resolve, reject) => {
    const handleRequest = (url: string, redirects = 0) => {
      if (redirects > 6) {
        return reject(new Error('Demasiadas redirecciones HTTP descargando Java 21'));
      }

      const client = url.startsWith('https:') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}` } }, (res) => {
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
          const nextUrl = res.headers.location;
          res.resume(); // Importante: drenar para no filtrar sockets
          if (!nextUrl) return reject(new Error('Redirección HTTP de Adoptium sin URL de destino'));
          return handleRequest(nextUrl, redirects + 1);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} descargando Java de Adoptium (${url})`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = Date.now();
        let bytesDelta = 0;

        const fileStream = fs.createWriteStream(partPath);

        res.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          bytesDelta += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          if (now - lastReport > 200) {
            const speed = Math.round((bytesDelta / (now - lastReport)) * 1000);
            lastReport = now;
            bytesDelta = 0;
            const percentage = totalBytes > 0 ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
            const etaSeconds = speed > 0 && totalBytes > downloadedBytes ? Math.round((totalBytes - downloadedBytes) / speed) : 0;

            if (onProgress) {
              onProgress({
                step: 'downloading_java',
                title: 'Descargando Java 21 (Temurin JRE)',
                detail: `${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
                totalFiles: 1,
                completedFiles: 0,
                percentage,
                speedBytesPerSec: speed,
                etaSeconds,
                totalBytes,
                downloadedBytes
              });
            }
          }
        });

        res.on('end', () => {
          fileStream.end();
        });

        fileStream.on('finish', () => {
          try {
            if (fs.existsSync(finalZipPath)) {
              fs.unlinkSync(finalZipPath);
            }
            fs.renameSync(partPath, finalZipPath);
            resolve();
          } catch (renameErr) {
            reject(renameErr);
          }
        });

        fileStream.on('error', (err) => {
          fileStream.close();
          if (fs.existsSync(partPath)) {
            try { fs.unlinkSync(partPath); } catch {}
          }
          reject(err);
        });

        res.on('error', (err) => {
          fileStream.close();
          if (fs.existsSync(partPath)) {
            try { fs.unlinkSync(partPath); } catch {}
          }
          reject(err);
        });
      });

      req.on('error', (err) => {
        if (fs.existsSync(partPath)) {
          try { fs.unlinkSync(partPath); } catch {}
        }
        reject(err);
      });
    };

    handleRequest(initialUrl);
  });
}

/**
 * Servicio maestro para asegurar el runtime persistente y verificado de Java 21.
 * Regla estricta: No borra el ZIP hasta comprobar con existsSync Y ejecución `java.exe -version` exitosa.
 */
export async function ensurePersistentJava21(
  runtimeBaseDir: string,
  onProgress?: (progress: DownloadProgress) => void,
  onLog?: (msg: string) => void
): Promise<JavaValidationResult> {
  const log = (msg: string) => {
    if (onLog) onLog(msg);
  };

  if (!fs.existsSync(runtimeBaseDir)) {
    fs.mkdirSync(runtimeBaseDir, { recursive: true });
  }

  // 1. Comprobar si ya existe una instalación funcional persistente
  log('Comprobando runtime persistente de Java 21 en disco...');
  let existingBinaries = findJavaBinaries(runtimeBaseDir);

  // Si no está en runtimeBaseDir, comprobar si estaba en la ruta previa (.cobblemon-realms-launcher)
  if (!existingBinaries) {
    const appData = process.env.APPDATA || '';
    if (appData) {
      const legacyRuntime = path.join(appData, '.cobblemon-realms-launcher', 'runtime', 'java-21');
      const legacyBinaries = findJavaBinaries(legacyRuntime);
      if (legacyBinaries) {
        try {
          const validatedLegacy = await validateJavaVersion(legacyBinaries.javaExe);
          log(`Runtime válido encontrado en ${legacyBinaries.javaExe}. Migrando a directorio persistente...`);
          fs.cpSync(legacyRuntime, runtimeBaseDir, { recursive: true });
          existingBinaries = findJavaBinaries(runtimeBaseDir);
        } catch {}
      }
    }
  }

  if (existingBinaries) {
    try {
      const validated = await validateJavaVersion(existingBinaries.javaExe);
      log(`Runtime verificado y listo: ${validated.versionString} (${validated.javawPath})`);
      return validated;
    } catch (valErr: any) {
      log(`Instalación previa no válida: ${valErr.message}. Procediendo a reinstalar Java 21...`);
    }
  }

  // 2. Descargar Java 21 Temurin (Adoptium) a archivo atómico
  log('Iniciando descarga oficial de Eclipse Temurin JRE 21 (Adoptium)...');
  const zipPath = path.join(runtimeBaseDir, 'java-21.zip');

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

  await downloadTemurinZip(APP_CONFIG.ADOPTIUM.API_URL, zipPath, onProgress, onLog);

  // 3. Descomprimir usando adm-zip (100% en Node.js, sin dependencias externas)
  log('Extrayendo binarios de Temurin JRE 21 con AdmZip en directorio persistente...');
  if (onProgress) {
    onProgress({
      step: 'downloading_java',
      title: 'Extrayendo Java 21 Temurin',
      detail: 'Descomprimiendo archivos en tiempo real...',
      totalFiles: 1,
      completedFiles: 0,
      percentage: 92
    });
  }

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(runtimeBaseDir, true);
    log('Extracción completada. Buscando binarios java.exe y javaw.exe...');
  } catch (unzipErr: any) {
    log(`ERROR al descomprimir Java 21: ${unzipErr.message}`);
    throw new Error(`Fallo en la descompresión del archivo ZIP de Java 21: ${unzipErr.message}`);
  }

  // 4. Localizar binarios dinámicamente
  const installedBinaries = findJavaBinaries(runtimeBaseDir);
  if (!installedBinaries) {
    throw new Error(
      `No se pudo localizar java.exe o bin/ en ${runtimeBaseDir} tras descomprimir el archivo de Temurin 21.`
    );
  }

  // 5. Verificación estricta mediante ejecución de `java.exe -version`
  log(`Verificando ejecución de ${installedBinaries.javaExe}...`);
  const validatedJava = await validateJavaVersion(installedBinaries.javaExe);
  log(`Validación exitosa: ${validatedJava.versionString}. Código de salida 0 confirmado.`);

  // 6. REGLA ESTRICTA: Borrar el .zip SOLO DESPUÉS de comprobar existsSync y ejecución exitosa
  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      log('Archivo temporal java-21.zip eliminado con éxito.');
    }
  } catch (cleanErr) {
    console.warn('Aviso: No se pudo eliminar java-21.zip temporal:', cleanErr);
  }

  if (onProgress) {
    onProgress({
      step: 'downloading_java',
      title: 'Java 21 Verificado',
      detail: 'Runtime de Java 21 listo y validado.',
      totalFiles: 1,
      completedFiles: 1,
      percentage: 100
    });
  }

  return validatedJava;
}
