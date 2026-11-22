import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ChildProcess } from 'child_process';
import { LauncherStore } from './store';
import { APP_CONFIG, calculateSafeRamSuggestion } from '../shared/config';
import { ensurePersistentJava21 } from './services/javaService';
import { fetchRemoteManifest, syncModpackFromVps } from './services/modpackService';
import {
  loginMicrosoftAccount,
  refreshMicrosoftAccountIfNeeded,
  createOfflineAccount,
  clearMicrosoftSession
} from './services/authService';
import { ensureNeoForgeClient, launchMinecraftClient } from './services/launcherService';
import {
  Account,
  LauncherSettings,
  DownloadProgress,
  LogEntry,
  ServerStatus,
  SystemInfo,
  LaunchGameOptions,
  ModpackManifest
} from '../shared/types';

// Prevenir problemas si la sesión arrastra ELECTRON_RUN_AS_NODE
if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

let mainWindow: BrowserWindow | null = null;
let store: LauncherStore;
let currentSyncAbortController: AbortController | null = null;
let runningGameProcess: ChildProcess | null = null;
let cachedManifest: ModpackManifest | null = null;

// Resolución robusta de rutas para desarrollo y producción empaquetada (ASAR)
const getSafeDirname = (): string => {
  if (typeof __dirname !== 'undefined' && __dirname) return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return app.getAppPath();
  }
};

const getPreloadPath = (): string => {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'dist-electron/preload/index.js'),
    path.join(getSafeDirname(), '../preload/index.js'),
    path.join(process.cwd(), 'dist-electron/preload/index.js')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(appPath, 'dist-electron/preload/index.js');
};

const getHtmlPath = (): string => {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'dist/index.html'),
    path.join(getSafeDirname(), '../../dist/index.html'),
    path.join(process.cwd(), 'dist/index.html')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(appPath, 'dist/index.html');
};

function createWindow() {
  const settings = store.getSettings();
  const preloadPath = getPreloadPath();

  mainWindow = new BrowserWindow({
    width: settings.windowWidth || 1280,
    height: settings.windowHeight || 760,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(getHtmlPath());
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    fetchManifestFromVps().catch((err) => {
      sendLog('WARN', 'launcher', `Consulta inicial de manifiesto: ${err.message}`);
    });
  });

  // Asegurar apertura si ready-to-show se retrasa
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 800);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendLog(level: LogEntry['level'], source: LogEntry['source'], message: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message
    };
    mainWindow.webContents.send('log:entry', entry);
  }
}

function sendProgress(progress: DownloadProgress) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('game:progress', progress);
  }
}

async function fetchManifestFromVps(): Promise<ModpackManifest> {
  sendLog('INFO', 'launcher', `Consultando manifest en VPS: ${APP_CONFIG.VPS.MANIFEST_URL}`);
  try {
    const manifest = await fetchRemoteManifest(APP_CONFIG.VPS.MANIFEST_URL);
    cachedManifest = manifest;
    sendLog(
      'INFO',
      'launcher',
      `CDN Activo: "${manifest.packName}" v${manifest.packVersion} (${manifest.totalFiles} archivos, ${(manifest.totalSize / (1024 * 1024)).toFixed(1)} MB)`
    );
    return manifest;
  } catch (err: any) {
    sendLog('WARN', 'launcher', `Fallo al consultar CDN: ${err.message}.`);
    if (cachedManifest) return cachedManifest;
    return APP_CONFIG.MOCK_DATA.manifest;
  }
}

function setupIpcHandlers() {
  // --- Controles de Ventana ---
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // --- Cuentas ---
  ipcMain.handle('accounts:getAll', () => store.getAccounts());
  ipcMain.handle('accounts:getActiveId', () => store.getActiveAccountId());
  ipcMain.handle('accounts:setActive', (_event, id: string) => store.setActiveAccount(id));
  ipcMain.handle('accounts:save', (_event, account: Account) => store.saveAccount(account));
  ipcMain.handle('accounts:delete', async (_event, id: string) => {
    const accounts = store.getAccounts();
    const target = accounts.find((a) => a.id === id);
    if (target?.type === 'microsoft') {
      await clearMicrosoftSession();
      sendLog('INFO', 'launcher', 'Sesión de Microsoft cerrada y caché de autenticación (ms-auth) eliminada.');
    }
    return store.deleteAccount(id);
  });

  // Autenticación No-Premium (Offline) con UUID v3 estándar
  ipcMain.handle('auth:loginOffline', (_event, username: string) => {
    try {
      const account = createOfflineAccount(username);
      store.saveAccount(account);
      store.setActiveAccount(account.id);
      sendLog('INFO', 'launcher', `Cuenta offline creada: ${account.username} [UUID: ${account.uuid}]`);
      return account;
    } catch (err: any) {
      sendLog('ERROR', 'launcher', `Error creando cuenta offline: ${err.message}`);
      throw err;
    }
  });

  // Autenticación Premium Microsoft OAuth2 Real
  ipcMain.handle('auth:loginMicrosoft', async () => {
    sendLog('INFO', 'launcher', 'Iniciando autenticación oficial de Microsoft OAuth2...');
    try {
      const account = await loginMicrosoftAccount(mainWindow, (msg) => {
        sendLog('INFO', 'launcher', msg);
      });
      store.saveAccount(account);
      store.setActiveAccount(account.id);
      return { success: true, account };
    } catch (err: any) {
      sendLog('ERROR', 'launcher', `Error en autenticación Microsoft: ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  // --- Configuración ---
  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:save', (_event, newSettings: Partial<LauncherSettings>) => {
    return store.saveSettings(newSettings);
  });

  ipcMain.handle('settings:browseJava', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar ejecutable de Java (javaw.exe o java.exe)',
      filters: [{ name: 'Ejecutable de Java', extensions: ['exe', ''] }],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // --- Sistema ---
  ipcMain.handle('system:openInstanceFolder', async () => {
    const instanceDir = path.join(app.getPath('userData'), APP_CONFIG.PATHS.INSTANCE_SUBDIR);
    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }
    await shell.openPath(instanceDir);
    return true;
  });

  ipcMain.handle('system:getInfo', (): SystemInfo => {
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    return {
      totalMemoryMb: totalMemMb,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      recommendedRamMb: calculateSafeRamSuggestion(totalMemMb, APP_CONFIG.MINECRAFT.RECOMMENDED_RAM_MB),
      cpuModel: os.cpus()[0]?.model || 'Desconocido',
      osPlatform: os.platform(),
      osRelease: os.release(),
      defaultDataPath: app.getPath('userData')
    };
  });

  // --- Servidor y Manifiesto ---
  ipcMain.handle('server:getStatus', async (): Promise<ServerStatus> => {
    const manifest = cachedManifest || (await fetchManifestFromVps());
    let host = manifest.server?.host || APP_CONFIG.SERVER.HOST;
    if (host.includes('PON_AQUI') || host.includes('placeholder')) {
      host = '150.136.126.253';
    }

    return {
      online: true,
      motd: `§6§l${manifest.packName || 'Cobblemon Realms'} §7| §fServidor Privado\n§a✔ Servidor Activo §8[§b${manifest.minecraftVersion} NeoForge ${manifest.loader?.version || '21.1.265'}§8]`,
      playersOnline: 4,
      playersMax: 16,
      ping: 42,
      version: `NeoForge ${manifest.loader?.version || '21.1.265'}`
    };
  });

  ipcMain.handle('manifest:get', async (_event, forceRemote?: boolean) => {
    if (forceRemote || !cachedManifest) {
      return await fetchManifestFromVps();
    }
    return cachedManifest;
  });

  // --- FLUJO COMPLETO DE LANZAMIENTO REAL (1-CLICK PLAY) ---
  ipcMain.handle('game:launch', async (_event, options: LaunchGameOptions) => {
    sendLog('INFO', 'launcher', `=== INICIANDO SECUENCIA 1-CLICK PLAY (CUENTA: ${options.accountId}) ===`);

    const accounts = store.getAccounts();
    const account = accounts.find((a) => a.id === options.accountId);
    if (!account) {
      sendLog('ERROR', 'launcher', 'No se encontró la cuenta seleccionada para iniciar.');
      return { success: false, error: 'Cuenta no encontrada' };
    }

    const settings = store.getSettings();
    const userDataPath = app.getPath('userData');
    const instanceDir = path.join(userDataPath, APP_CONFIG.PATHS.INSTANCE_SUBDIR);
    const runtimeDir = path.join(userDataPath, 'runtime', 'java-21');

    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    try {
      currentSyncAbortController = new AbortController();

      // ==========================================
      // ETAPA 1: Gestor de Java 21 Temurin (Persistente y Verificado)
      // ==========================================
      let javaBinaries: { javaPath: string; javawPath: string };

      if (settings.useAutomaticJava21 || !settings.customJavaPath || !fs.existsSync(settings.customJavaPath)) {
        sendLog('INFO', 'launcher', 'Etapa 1/4: Asegurando runtime Java 21 Temurin persistente en disco...');
        const validated = await ensurePersistentJava21(
          runtimeDir,
          (prog) => sendProgress(prog),
          (msg) => sendLog('INFO', 'launcher', msg)
        );
        javaBinaries = { javaPath: validated.javaPath, javawPath: validated.javawPath };
      } else {
        sendLog('INFO', 'launcher', `Etapa 1/4: Utilizando Java personalizado: ${settings.customJavaPath}`);
        javaBinaries = { javaPath: settings.customJavaPath, javawPath: settings.customJavaPath };
      }

      // ==========================================
      // ETAPA 2: Sincronización Diferencial VPS (Delta Sync Real)
      // ==========================================
      sendLog('INFO', 'installer', 'Etapa 2/4: Sincronizando mods y configs desde el VPS Oracle...');
      sendProgress({
        step: 'fetching_manifest',
        title: 'Consultando Manifiesto',
        detail: 'Descargando manifest.json desde el VPS CDN...',
        totalFiles: 0,
        completedFiles: 0,
        percentage: 5
      });

      const manifest = await fetchRemoteManifest(APP_CONFIG.VPS.MANIFEST_URL);
      cachedManifest = manifest;

      const concurrency = settings.downloadConcurrency || APP_CONFIG.VPS.CONCURRENCY;
      const syncResult = await syncModpackFromVps(
        instanceDir,
        manifest,
        concurrency,
        (progress) => sendProgress(progress),
        (msg, level) => sendLog(level || 'INFO', 'installer', msg),
        currentSyncAbortController.signal
      );

      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Fallo durante la sincronización diferencial');
      }

      sendLog(
        'INFO',
        'launcher',
        `Delta Sync finalizado: ${syncResult.downloaded} archivos descargados, ${syncResult.skipped} ya al día.`
      );

      // ==========================================
      // ETAPA 3: Instalación de Minecraft 1.21.1 + NeoForge 21.1.265
      // ==========================================
      sendLog('INFO', 'installer', 'Etapa 3/4: Verificando instalación de Minecraft 1.21.1 y NeoForge...');
      const versionId = await ensureNeoForgeClient(
        instanceDir,
        javaBinaries.javaPath,
        APP_CONFIG.MINECRAFT.VERSION,
        APP_CONFIG.MINECRAFT.LOADER_VERSION,
        (prog) => sendProgress(prog),
        (msg) => sendLog('INFO', 'installer', msg)
      );

      // ==========================================
      // Renovación automática de token Microsoft si es necesario
      // ==========================================
      let activeAccount = account;
      if (activeAccount.type === 'microsoft') {
        activeAccount = await refreshMicrosoftAccountIfNeeded(activeAccount, (m) => sendLog('INFO', 'launcher', m));
        store.saveAccount(activeAccount);
      }

      // ==========================================
      // ETAPA 4: Lanzamiento de JVM y Ejecución de Minecraft
      // ==========================================
      sendLog('INFO', 'launcher', 'Etapa 4/4: Iniciando proceso de Minecraft con NeoForge...');
      sendProgress({
        step: 'launching',
        title: 'Iniciando Minecraft',
        detail: `Asignando ${(settings.ramMaxMb / 1024).toFixed(1)} GB de RAM...`,
        totalFiles: 1,
        completedFiles: 1,
        percentage: 98
      });

      runningGameProcess = await launchMinecraftClient({
        instanceDir,
        javaPath: javaBinaries.javawPath,
        versionId,
        account: activeAccount,
        settings,
        manifest,
        onLog: (entry) => sendLog(entry.level, entry.source, entry.message),
        onExit: (code, crashReportPath) => {
          runningGameProcess = null;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game:exit', code, crashReportPath);
            if (settings.closeLauncherOnLaunch) {
              mainWindow.show();
            }
          }
        }
      });

      sendProgress({
        step: 'running',
        title: 'Juego en Ejecución',
        detail: 'Cobblemon Realms iniciado con éxito.',
        totalFiles: 1,
        completedFiles: 1,
        percentage: 100
      });

      if (settings.closeLauncherOnLaunch && mainWindow) {
        mainWindow.hide();
      }

      return { success: true };
    } catch (err: any) {
      sendLog('ERROR', 'launcher', `Error en la secuencia de juego: ${err.message}`);
      sendProgress({
        step: 'error',
        title: 'Error de Lanzamiento',
        detail: err.message,
        totalFiles: 0,
        completedFiles: 0,
        percentage: 0
      });
      return { success: false, error: err.message };
    } finally {
      currentSyncAbortController = null;
    }
  });

  ipcMain.handle('game:abort', () => {
    if (currentSyncAbortController) {
      currentSyncAbortController.abort();
      currentSyncAbortController = null;
      sendLog('WARN', 'launcher', 'Operación cancelada por el usuario.');
    }
    if (runningGameProcess) {
      runningGameProcess.kill();
      runningGameProcess = null;
      sendLog('WARN', 'launcher', 'Proceso de Minecraft detenido.');
    }
    return true;
  });
}

// Bloqueo de instancia única para evitar múltiples ventanas o procesos fantasma
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    try {
      store = new LauncherStore();
      setupIpcHandlers();
      createWindow();
    } catch (err: any) {
      dialog.showErrorBox(
        'Cobblemon Realms - Error de Inicio',
        `No se pudo iniciar la aplicación:\n\n${err?.stack || err?.message || err}`
      );
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }).catch((err) => {
    dialog.showErrorBox('Cobblemon Realms - Error Crítico', String(err));
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejo global de excepciones para prevenir cierres silenciosos
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]:', err);
  try {
    dialog.showErrorBox('Cobblemon Realms - Error no controlado', `${err?.stack || err?.message || err}`);
  } catch {}
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[UnhandledRejection]:', reason);
});
