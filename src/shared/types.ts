export type AccountType = 'offline' | 'microsoft';

export interface Account {
  id: string;
  username: string;
  type: AccountType;
  uuid: string;
  avatarUrl: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  addedAt: number;
}

export interface LauncherSettings {
  ramMinMb: number;
  ramMaxMb: number;
  jvmArgs: string;
  customJavaPath: string;
  useAutomaticJava21: boolean;
  windowWidth: number;
  windowHeight: number;
  closeLauncherOnLaunch: boolean;
  mockMode: boolean;
  instanceDirectory?: string;
  downloadConcurrency: number;
}

export interface ServerStatus {
  online: boolean;
  motd: string;
  playersOnline: number;
  playersMax: number;
  ping: number;
  version: string;
  icon?: string;
}

export type LaunchStep =
  | 'idle'
  | 'checking_java'
  | 'downloading_java'
  | 'fetching_manifest'
  | 'verifying'
  | 'syncing_files'
  | 'installing_forge'
  | 'launching'
  | 'running'
  | 'error';

export interface DownloadProgress {
  step: LaunchStep;
  title: string;
  detail: string;
  currentFile?: string;
  totalFiles: number;
  completedFiles: number;
  percentage: number;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  totalBytes?: number;
  downloadedBytes?: number;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'MINECRAFT';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: 'launcher' | 'game' | 'installer';
  message: string;
}

export type SyncPolicy = 'strict' | 'merge' | 'seed';

export interface ManifestFile {
  path: string;
  url: string;
  sha256: string;
  size: number;
  policy: SyncPolicy;
}

export interface ModpackManifest {
  packName: string;
  packVersion: string;
  generatedAt?: string;
  minecraftVersion: string;
  recommendedRamMb: number;
  javaVersion: number;
  loader: {
    type: 'neoforge';
    version: string;
  };
  server: {
    name: string;
    host: string;
    port: number;
  };
  totalFiles: number;
  totalSize: number;
  files: ManifestFile[];
}

export interface SystemInfo {
  totalMemoryMb: number;
  freeMemoryMb: number;
  recommendedRamMb: number;
  cpuModel: string;
  osPlatform: string;
  osRelease: string;
  defaultDataPath: string;
}

export interface LaunchGameOptions {
  accountId: string;
  manifestUrl?: string;
}

export interface SyncResult {
  success: boolean;
  downloaded: number;
  skipped: number;
  deleted: number;
  error?: string;
}
