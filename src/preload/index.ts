import { contextBridge, ipcRenderer } from 'electron';
import {
  Account,
  LauncherSettings,
  ServerStatus,
  DownloadProgress,
  LogEntry,
  SystemInfo,
  LaunchGameOptions,
  ModpackManifest
} from '../shared/types';

// Tipado seguro para la API expuesta en el proceso de Renderizado
export interface ElectronAPI {
  // Cuentas
  getAccounts: () => Promise<Account[]>;
  getActiveAccountId: () => Promise<string | null>;
  setActiveAccount: (id: string) => Promise<boolean>;
  saveAccount: (account: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<boolean>;
  loginOffline: (username: string) => Promise<Account>;
  loginMicrosoft: () => Promise<{ success: boolean; account?: Account; error?: string }>;

  // Configuración
  getSettings: () => Promise<LauncherSettings>;
  saveSettings: (settings: Partial<LauncherSettings>) => Promise<LauncherSettings>;
  browseJavaPath: () => Promise<string | null>;
  openInstanceFolder: () => Promise<boolean>;
  getSystemInfo: () => Promise<SystemInfo>;

  // Servidor y Manifiesto
  getServerStatus: () => Promise<ServerStatus>;
  fetchManifest: (forceRemote?: boolean) => Promise<ModpackManifest>;

  // Lanzamiento de Juego
  launchGame: (options: LaunchGameOptions) => Promise<{ success: boolean; error?: string }>;
  abortLaunch: () => Promise<boolean>;

  // Ventana
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Listeners de Eventos
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onLog: (callback: (log: LogEntry) => void) => () => void;
  onGameExit: (callback: (code: number, crashReportPath?: string | null) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  getAccounts: () => ipcRenderer.invoke('accounts:getAll'),
  getActiveAccountId: () => ipcRenderer.invoke('accounts:getActiveId'),
  setActiveAccount: (id: string) => ipcRenderer.invoke('accounts:setActive', id),
  saveAccount: (account: Partial<Account>) => ipcRenderer.invoke('accounts:save', account),
  deleteAccount: (id: string) => ipcRenderer.invoke('accounts:delete', id),
  loginOffline: (username: string) => ipcRenderer.invoke('auth:loginOffline', username),
  loginMicrosoft: () => ipcRenderer.invoke('auth:loginMicrosoft'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<LauncherSettings>) => ipcRenderer.invoke('settings:save', settings),
  browseJavaPath: () => ipcRenderer.invoke('settings:browseJava'),
  openInstanceFolder: () => ipcRenderer.invoke('system:openInstanceFolder'),
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),

  getServerStatus: () => ipcRenderer.invoke('server:getStatus'),
  fetchManifest: (forceRemote?: boolean) => ipcRenderer.invoke('manifest:get', forceRemote),

  launchGame: (options: LaunchGameOptions) => ipcRenderer.invoke('game:launch', options),
  abortLaunch: () => ipcRenderer.invoke('game:abort'),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('game:progress', handler);
    return () => ipcRenderer.removeListener('game:progress', handler);
  },

  onLog: (callback: (log: LogEntry) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, log: LogEntry) => callback(log);
    ipcRenderer.on('log:entry', handler);
    return () => ipcRenderer.removeListener('log:entry', handler);
  },

  onGameExit: (callback: (code: number, crashReportPath?: string | null) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, code: number, crashReportPath?: string | null) =>
      callback(code, crashReportPath);
    ipcRenderer.on('game:exit', handler);
    return () => ipcRenderer.removeListener('game:exit', handler);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
