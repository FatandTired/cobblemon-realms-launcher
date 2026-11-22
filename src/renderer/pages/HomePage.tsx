import React from 'react';
import {
  Play,
  RotateCcw,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  User,
  HardDrive,
  Globe,
  Radio,
  Cpu
} from 'lucide-react';
import { Account, DownloadProgress, LauncherSettings, ModpackManifest, ServerStatus } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

interface HomePageProps {
  activeAccount: Account | null;
  serverStatus: ServerStatus | null;
  manifest: ModpackManifest | null;
  settings: LauncherSettings;
  progress: DownloadProgress | null;
  onLaunch: () => void;
  onAbort: () => void;
  onSelectAccount: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  activeAccount,
  serverStatus,
  manifest,
  settings,
  progress,
  onLaunch,
  onAbort,
  onSelectAccount
}) => {
  const isLaunching = progress && progress.step !== 'idle' && progress.step !== 'error';

  const packName = manifest?.packName || APP_CONFIG.MINECRAFT.PACK_NAME;
  const mcVer = manifest?.minecraftVersion || APP_CONFIG.MINECRAFT.VERSION;
  const loaderVer = manifest?.loader?.version || APP_CONFIG.MINECRAFT.LOADER_VERSION;
  const totalFiles = manifest?.totalFiles || 2122;
  const totalSizeMb = manifest?.totalSize ? (manifest.totalSize / (1024 * 1024)).toFixed(0) : '1431';

  return (
    <div className="h-full flex flex-col justify-between p-6 overflow-y-auto space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-canvas-border bg-gradient-to-r from-slate-900 via-canvas-card to-slate-900 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cobble-red/20 text-red-400 border border-red-500/30">
                Minecraft {mcVer}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-500/15 text-cobble-cyan border border-cyan-500/30">
                NeoForge {loaderVer}
              </span>
              <span
                className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-canvas-elevated text-cobble-emerald border border-canvas-border flex items-center gap-1.5 cursor-default"
                title="Sincronización diferencial activa con el servidor oficial"
              >
                <span className="w-2 h-2 rounded-full bg-cobble-emerald animate-pulse" />
                <span>Servidor Conectado</span>
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Cobblemon <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">Realms</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Modpack oficial con sincronización diferencial Delta Sync de alta velocidad. {totalFiles} archivos ({totalSizeMb} MB) optimizados para el servidor.
            </p>
          </div>

          {/* Quick Active Account Card */}
          <div
            onClick={onSelectAccount}
            className="bg-canvas/80 backdrop-blur border border-canvas-border hover:border-cobble-cyan/60 rounded-xl p-3 flex items-center space-x-3.5 min-w-[220px] cursor-pointer transition-colors group"
            title="Haz clic para cambiar de cuenta"
          >
            {activeAccount ? (
              <>
                <img
                  src={activeAccount.avatarUrl}
                  alt={activeAccount.username}
                  className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Jugando como</span>
                    <span className="text-[10px] text-cobble-cyan group-hover:underline">Cambiar</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate group-hover:text-cobble-cyan transition-colors">
                    {activeAccount.username}
                  </div>
                  <div className="text-[10px] text-cobble-emerald flex items-center gap-1">
                    {activeAccount.type === 'microsoft' ? (
                      <>
                        <ShieldCheck className="w-3 h-3 inline" />
                        <span>Microsoft</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 inline text-slate-400" />
                        <span className="text-slate-400">No-Premium</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-xs text-slate-400 mb-1.5">No hay perfil activo</p>
                <button
                  onClick={onSelectAccount}
                  className="text-xs bg-cobble-cyan/20 text-cyan-300 hover:bg-cobble-cyan/30 px-3 py-1 rounded-md transition-colors"
                >
                  Elegir Cuenta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Grid: Server Status & Modpack Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Server Status Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 flex flex-col justify-between space-y-4 glow-card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-canvas-elevated flex items-center justify-center text-cobble-cyan">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{APP_CONFIG.SERVER.NAME}</h3>
                <p className="text-xs text-slate-400">
                  Servidor Oficial Multijugador
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-canvas px-2.5 py-1 rounded-full border border-canvas-border">
              <div
                className={`w-2 h-2 rounded-full ${
                  serverStatus?.online ? 'bg-cobble-emerald animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">
                {serverStatus?.online ? 'En Línea' : 'Desconectado'}
              </span>
            </div>
          </div>

          <div className="bg-canvas/60 rounded-lg p-3 border border-canvas-border/50 text-xs">
            <div className="text-slate-300 font-mono whitespace-pre-line leading-relaxed mb-2">
              {serverStatus?.motd || 'Conectando con el servidor...'}
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-canvas-border/50">
              <span>Jugadores Conectados:</span>
              <span className="font-bold text-white font-mono">
                {serverStatus ? `${serverStatus.playersOnline} / ${serverStatus.playersMax}` : '-- / --'}
              </span>
            </div>
          </div>
        </div>

        {/* Sync & CDN Specs Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 flex flex-col justify-between space-y-4 glow-card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-canvas-elevated flex items-center justify-center text-cobble-red">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sincronización de Contenido</h3>
                <p className="text-xs text-slate-400">Descargas Concurrentes (Keep-Alive + Gzip)</p>
              </div>
            </div>
            <span className="text-[11px] font-mono bg-emerald-500/15 text-cobble-emerald px-2 py-0.5 rounded border border-emerald-500/30">
              CDN Conectada
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-canvas/60 p-2.5 rounded-lg border border-canvas-border/50">
              <div className="text-slate-400 text-[10px] uppercase font-bold">RAM Asignada</div>
              <div className="font-semibold text-white mt-0.5 font-mono">
                {(settings.ramMaxMb / 1024).toFixed(1)} GB / 10 GB Rec.
              </div>
            </div>
            <div className="bg-canvas/60 p-2.5 rounded-lg border border-canvas-border/50">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Archivos en Manifiesto</div>
              <div className="font-semibold text-white mt-0.5 font-mono">
                {totalFiles} archivos ({totalSizeMb} MB)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Progress or Big Launch Button */}
      <div className="bg-canvas-card border border-canvas-border rounded-2xl p-4 shadow-xl">
        {isLaunching ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-cobble-cyan animate-spin" />
                <span className="font-bold text-white">{progress.title}</span>
                <span className="text-slate-400 font-mono text-[11px]">— {progress.detail}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-mono text-cobble-cyan font-bold">{progress.percentage}%</span>
                <button
                  onClick={onAbort}
                  className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-canvas rounded-full overflow-hidden border border-canvas-border p-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-cobble-cyan rounded-full transition-all duration-300 shadow-glow-red"
                style={{ width: `${Math.max(4, progress.percentage)}%` }}
              />
            </div>

            {/* File info and speeds */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="truncate max-w-md">
                {progress.currentFile ? `Archivo: ${progress.currentFile}` : progress.detail}
              </div>
              <div className="flex items-center space-x-3">
                {progress.completedFiles !== undefined && progress.totalFiles > 0 && (
                  <span>
                    {progress.completedFiles} / {progress.totalFiles} archivos
                  </span>
                )}
                {progress.downloadedBytes !== undefined && progress.totalBytes !== undefined && progress.totalBytes > 0 && (
                  <span>
                    {(progress.downloadedBytes / (1024 * 1024)).toFixed(1)} / {(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
                {progress.speedBytesPerSec !== undefined && progress.speedBytesPerSec > 0 && (
                  <span className="text-cobble-cyan font-bold">
                    {(progress.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                )}
                {progress.etaSeconds !== undefined && progress.etaSeconds > 0 && (
                  <span>ETA: {progress.etaSeconds}s</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {activeAccount ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cobble-emerald" />
                  <span>
                    Listo para sincronizar y jugar con <b>{activeAccount.username}</b>. Todos los sistemas en línea.
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Selecciona o agrega una cuenta para poder entrar al servidor.</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <button
                disabled={!activeAccount}
                onClick={onLaunch}
                className={`w-full md:w-56 py-3.5 px-6 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 transition-all shadow-xl ${
                  activeAccount
                    ? 'bg-gradient-to-r from-cobble-red via-red-600 to-rose-600 text-white hover:brightness-110 active:scale-[0.98] shadow-glow-red cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>SINCRONIZAR Y JUGAR</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
