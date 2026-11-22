import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { DownloadProgress } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

/**
 * Busca si la versión de NeoForge ya se encuentra instalada en la carpeta /versions/.
 */
export function findInstalledNeoForgeVersion(instanceDir: string, forgeVersion = '21.1.265'): string | null {
  const versionsDir = path.join(instanceDir, 'versions');
  if (!fs.existsSync(versionsDir)) return null;

  try {
    const list = fs.readdirSync(versionsDir, { withFileTypes: true });
    for (const item of list) {
      if (item.isDirectory()) {
        const verName = item.name;
        if (verName.includes(forgeVersion) || verName.includes(`neoforge-${forgeVersion}`)) {
          const jsonFile = path.join(versionsDir, verName, `${verName}.json`);
          if (fs.existsSync(jsonFile)) {
            return verName;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error buscando versión instalada de NeoForge:', err);
  }
  return null;
}

/**
 * Descarga el JAR del instalador oficial de NeoForge desde su Maven oficial.
 */
async function downloadNeoForgeInstaller(
  forgeVersion: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${forgeVersion}/neoforge-${forgeVersion}-installer.jar`;

  return new Promise((resolve, reject) => {
    const req = https.get(installerUrl, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return reject(new Error(`HTTP ${res.statusCode} descargando instalador de NeoForge desde ${installerUrl}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        fileStream.write(chunk);
        if (onProgress) onProgress(downloaded, total);
      });

      res.on('end', () => {
        fileStream.end(() => resolve());
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
  });
}

/**
 * Asegura la instalación de Minecraft Vanilla 1.21.1 y NeoForge 21.1.265.
 * Si ya está instalado, lo detecta en < 5ms.
 * Si no está instalado, descarga el instalador oficial de NeoForge y ejecuta los procesadores silenciosamente.
 */
export async function ensureNeoForge(
  instanceDir: string,
  javaExePath: string,
  mcVersion = APP_CONFIG.MINECRAFT.VERSION,
  forgeVersion = APP_CONFIG.MINECRAFT.LOADER_VERSION,
  onProgress?: (progress: DownloadProgress) => void,
  onLog?: (msg: string) => void
): Promise<string> {
  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  if (!fs.existsSync(instanceDir)) {
    fs.mkdirSync(instanceDir, { recursive: true });
  }

  // 1. Comprobar si ya existe la versión de NeoForge instalada
  const existingVersion = findInstalledNeoForgeVersion(instanceDir, forgeVersion);
  if (existingVersion) {
    log(`NeoForge ${forgeVersion} ya está instalado (Versión: ${existingVersion}).`);
    return existingVersion;
  }

  log(`Iniciando instalación silenciosa de NeoForge ${forgeVersion} para Minecraft ${mcVersion}...`);

  const tempInstallerDir = path.join(instanceDir, 'temp_installer');
  if (!fs.existsSync(tempInstallerDir)) {
    fs.mkdirSync(tempInstallerDir, { recursive: true });
  }
  const installerJarPath = path.join(tempInstallerDir, `neoforge-${forgeVersion}-installer.jar`);

  try {
    // Descargar instalador de NeoForge
    if (onProgress) {
      onProgress({
        step: 'installing_forge',
        title: 'Descargando NeoForge',
        detail: `Descargando instalador de NeoForge ${forgeVersion}...`,
        totalFiles: 1,
        completedFiles: 0,
        percentage: 15
      });
    }

    log(`Descargando instalador de NeoForge ${forgeVersion}...`);
    await downloadNeoForgeInstaller(forgeVersion, installerJarPath, (downloaded, total) => {
      if (onProgress && total > 0) {
        const pct = 15 + Math.round((downloaded / total) * 25);
        onProgress({
          step: 'installing_forge',
          title: 'Descargando NeoForge',
          detail: `${(downloaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`,
          totalFiles: 1,
          completedFiles: 0,
          percentage: pct
        });
      }
    });

    // Ejecutar el instalador headless con Java 21
    log('Ejecutando procesadores de NeoForge (--installClient)... Esto descargará Vanilla 1.21.1 y librerías base.');
    if (onProgress) {
      onProgress({
        step: 'installing_forge',
        title: 'Instalando NeoForge y Minecraft 1.21.1',
        detail: 'Ejecutando procesadores oficiales de NeoForge...',
        totalFiles: 1,
        completedFiles: 0,
        percentage: 50
      });
    }

    // Usar java.exe en lugar de javaw.exe para capturar la salida de consola del instalador
    const javaConsoleExe = javaExePath.replace(/javaw\.exe$/i, 'java.exe');

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        javaConsoleExe,
        ['-jar', installerJarPath, '--installClient', instanceDir],
        { cwd: instanceDir, stdio: ['ignore', 'pipe', 'pipe'] }
      );

      child.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          log(`[NeoForge Installer]: ${line}`);
        }
      });

      child.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          log(`[NeoForge Installer Error]: ${line}`);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`El instalador de NeoForge finalizó con código de error ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    log('Instalador de NeoForge completado con éxito.');

    // Limpiar instalador temporal
    try {
      if (fs.existsSync(installerJarPath)) fs.unlinkSync(installerJarPath);
      if (fs.existsSync(tempInstallerDir)) fs.rmdirSync(tempInstallerDir);
    } catch {}

    const installed = findInstalledNeoForgeVersion(instanceDir, forgeVersion);
    if (!installed) {
      throw new Error(`NeoForge no se detectó en ${path.join(instanceDir, 'versions')} tras la instalación.`);
    }

    log(`NeoForge ${forgeVersion} instalado correctamente: ID "${installed}".`);
    return installed;
  } catch (err: any) {
    try {
      if (fs.existsSync(installerJarPath)) fs.unlinkSync(installerJarPath);
    } catch {}
    throw new Error(`Error instalando NeoForge: ${err.message}`);
  }
}
