import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawn, ChildProcess } from 'child_process';
import { launch, Version } from '@xmcl/core';
import {
  Account,
  LauncherSettings,
  LogEntry,
  ModpackManifest,
  DownloadProgress
} from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';
import { decryptSensitiveToken } from './authService';

export interface LaunchOptions {
  instanceDir: string;
  javaPath: string;
  versionId: string;
  account: Account;
  settings: LauncherSettings;
  manifest?: ModpackManifest | null;
  onLog: (entry: LogEntry) => void;
  onExit: (code: number, crashReportPath?: string | null) => void;
}

/**
 * Busca si la versión de NeoForge 21.1.265 ya está instalada en versions/.
 */
export function findInstalledNeoForgeVersion(instanceDir: string, forgeVersion = APP_CONFIG.MINECRAFT.LOADER_VERSION): string | null {
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
        res.resume();
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
        fileStream.end();
      });

      fileStream.on('finish', () => resolve());

      fileStream.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(destPath)) {
          try { fs.unlinkSync(destPath); } catch {}
        }
        reject(err);
      });

      res.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(destPath)) {
          try { fs.unlinkSync(destPath); } catch {}
        }
        reject(err);
      });
    });

    req.on('error', (err) => {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch {}
      }
      reject(err);
    });
  });
}

/**
 * Asegura la instalación de NeoForge 21.1.265 y Minecraft 1.21.1 en la carpeta de instancia.
 */
export async function ensureNeoForgeClient(
  instanceDir: string,
  javaConsoleExe: string,
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

  // 1. Comprobar si ya existe la versión instalada
  const existingVersion = findInstalledNeoForgeVersion(instanceDir, forgeVersion);
  if (existingVersion) {
    log(`NeoForge ${forgeVersion} ya está instalado en el cliente (Versión: ${existingVersion}).`);
    return existingVersion;
  }

  log(`Iniciando instalación de NeoForge ${forgeVersion} para Minecraft ${mcVersion}...`);

  const tempInstallerDir = path.join(instanceDir, 'temp_installer');
  if (!fs.existsSync(tempInstallerDir)) {
    fs.mkdirSync(tempInstallerDir, { recursive: true });
  }
  const installerJarPath = path.join(tempInstallerDir, `neoforge-${forgeVersion}-installer.jar`);

  try {
    if (onProgress) {
      onProgress({
        step: 'installing_forge',
        title: 'Descargando NeoForge',
        detail: `Descargando instalador de NeoForge ${forgeVersion}...`,
        totalFiles: 1,
        completedFiles: 0,
        percentage: 10
      });
    }

    log(`Descargando instalador oficial de NeoForge ${forgeVersion}...`);
    await downloadNeoForgeInstaller(forgeVersion, installerJarPath, (downloaded, total) => {
      if (onProgress && total > 0) {
        const pct = 10 + Math.round((downloaded / total) * 20);
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

    log('Ejecutando procesadores de NeoForge (--installClient)... Esto genera las librerías base de Minecraft 1.21.1.');
    if (onProgress) {
      onProgress({
        step: 'installing_forge',
        title: 'Instalando NeoForge y Minecraft 1.21.1',
        detail: 'Ejecutando procesadores oficiales de NeoForge...',
        totalFiles: 1,
        completedFiles: 0,
        percentage: 45
      });
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        javaConsoleExe,
        ['-jar', installerJarPath, '--installClient', instanceDir],
        { cwd: instanceDir, stdio: ['ignore', 'pipe', 'pipe'] }
      );

      child.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          log(`[NeoForge]: ${line}`);
        }
      });

      child.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          log(`[NeoForge]: ${line}`);
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

    log('Procesadores de NeoForge finalizados con éxito.');

    // Limpiar instalador temporal
    try {
      if (fs.existsSync(installerJarPath)) fs.unlinkSync(installerJarPath);
      if (fs.existsSync(tempInstallerDir)) fs.rmdirSync(tempInstallerDir);
    } catch {}

    const installed = findInstalledNeoForgeVersion(instanceDir, forgeVersion);
    if (!installed) {
      throw new Error(`NeoForge no se detectó en ${path.join(instanceDir, 'versions')} tras la instalación.`);
    }

    log(`NeoForge ${forgeVersion} verificado y registrado: ID "${installed}".`);
    return installed;
  } catch (err: any) {
    try {
      if (fs.existsSync(installerJarPath)) fs.unlinkSync(installerJarPath);
    } catch {}
    throw new Error(`Error instalando NeoForge: ${err.message}`);
  }
}

/**
 * Parsea los argumentos JVM del usuario excluyendo flags de memoria redundantes.
 */
function parseJvmArgs(rawArgs: string): string[] {
  if (!rawArgs) return [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(rawArgs)) !== null) {
    if (match[1]) matches.push(match[1]);
    else if (match[2]) matches.push(match[2]);
    else matches.push(match[0]);
  }
  return matches.filter((arg) => !arg.startsWith('-Xms') && !arg.startsWith('-Xmx'));
}

/**
 * Busca el archivo de crash report más reciente en instanceDir/crash-reports/.
 */
export function findLatestCrashReport(instanceDir: string): string | null {
  const crashDir = path.join(instanceDir, 'crash-reports');
  if (!fs.existsSync(crashDir)) return null;

  try {
    const files = fs.readdirSync(crashDir)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => {
        const full = path.join(crashDir, f);
        return { path: full, time: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.time - a.time);

    return files[0]?.path || null;
  } catch {
    return null;
  }
}

/**
 * Lanza el cliente real de Minecraft utilizando @xmcl/core con streaming de logs.
 */
export async function launchMinecraftClient(options: LaunchOptions): Promise<ChildProcess> {
  const {
    instanceDir,
    javaPath,
    versionId,
    account,
    settings,
    manifest,
    onLog,
    onExit
  } = options;

  const emitLog = (level: LogEntry['level'], source: LogEntry['source'], message: string) => {
    onLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message
    });
  };

  emitLog('INFO', 'launcher', `Cargando definición de versión "${versionId}" en ${instanceDir}...`);

  const resolvedVersion = await Version.parse(instanceDir, versionId);
  emitLog(
    'INFO',
    'launcher',
    `Versión resuelta: ${resolvedVersion.id} (Minecraft ${resolvedVersion.minecraftVersion}, MainClass: ${resolvedVersion.mainClass})`
  );

  const extraJVMArgs = parseJvmArgs(settings.jvmArgs);

  // Servidor al cual auto-conectar
  let serverHost = manifest?.server?.host || APP_CONFIG.SERVER.HOST;
  if (serverHost.includes('PON_AQUI') || serverHost.includes('placeholder')) {
    serverHost = '150.136.126.253';
  }
  const serverPort = manifest?.server?.port || APP_CONFIG.SERVER.PORT;

  // Credenciales según tipo de cuenta
  const rawToken = account.type === 'microsoft' && account.accessToken
    ? decryptSensitiveToken(account.accessToken)
    : account.uuid;

  const launchOptions = {
    gamePath: instanceDir,
    resourcePath: instanceDir,
    javaPath,
    version: resolvedVersion,
    minMemory: settings.ramMinMb,
    maxMemory: settings.ramMaxMb,
    extraJVMArgs,
    gameProfile: {
      name: account.username,
      id: account.uuid.replace(/-/g, '')
    },
    accessToken: rawToken,
    userType: account.type === 'microsoft' ? ('mojang' as const) : ('legacy' as const),
    resolution: {
      width: settings.windowWidth || 1280,
      height: settings.windowHeight || 760
    },
    server: {
      ip: serverHost,
      port: serverPort
    }
  };

  emitLog(
    'INFO',
    'launcher',
    `Lanzando JVM [${javaPath}] asignando ${settings.ramMaxMb} MB de RAM (-Xmx${settings.ramMaxMb}M)...`
  );

  const processChild = await launch(launchOptions);
  emitLog('INFO', 'launcher', `Proceso de Minecraft iniciado exitosamente (PID: ${processChild.pid}).`);

  // Capturar stdout
  let stdoutBuffer = '';
  processChild.stdout?.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let level: LogEntry['level'] = 'MINECRAFT';
      if (line.includes('WARN')) level = 'WARN';
      else if (line.includes('ERROR') || line.includes('FATAL') || line.includes('Exception')) level = 'ERROR';
      else if (line.includes('DEBUG')) level = 'DEBUG';

      emitLog(level, 'game', line);
    }
  });

  // Capturar stderr
  let stderrBuffer = '';
  processChild.stderr?.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line) {
        emitLog('WARN', 'game', line);
      }
    }
  });

  // Capturar cierre de proceso
  processChild.on('close', (code) => {
    const exitCode = code ?? 0;
    if (exitCode === 0) {
      emitLog('INFO', 'launcher', 'Minecraft se ha cerrado correctamente (Código de salida: 0).');
      onExit(0, null);
    } else {
      emitLog('ERROR', 'launcher', `Minecraft finalizó con código de error: ${exitCode}.`);
      const crashReport = findLatestCrashReport(instanceDir);
      if (crashReport) {
        emitLog('ERROR', 'launcher', `Crash Report localizado en: ${crashReport}`);
      }
      onExit(exitCode, crashReport);
    }
  });

  processChild.on('error', (err) => {
    emitLog('ERROR', 'launcher', `Error en el proceso de Minecraft: ${err.message}`);
  });

  return processChild;
}
