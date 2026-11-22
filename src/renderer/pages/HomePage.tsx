import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Account, DownloadProgress, LauncherSettings, ModpackManifest, ServerStatus } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';
import { PokemonHoloCard } from '../components/PokemonHoloCard';
import { PokemonCard } from '../../data/pokemonCards';

interface HomePageProps {
  activeAccount: Account | null;
  serverStatus: ServerStatus | null;
  manifest: ModpackManifest | null;
  settings: LauncherSettings;
  progress: DownloadProgress | null;
  onLaunch: () => void;
  onAbort: () => void;
  onSelectAccount: () => void;
  isGameRunning?: boolean;
  activeCard: PokemonCard;
  onChangeCard: () => void;
}

/** Limpia códigos §X de Minecraft */
function stripMinecraftCodes(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, '');
}

export const HomePage: React.FC<HomePageProps> = ({
  activeAccount,
  serverStatus,
  manifest,
  settings,
  progress,
  onLaunch,
  onAbort,
  onSelectAccount,
  isGameRunning = false,
  activeCard,
  onChangeCard,
}) => {
  const isLaunching = progress && progress.step !== 'idle' && progress.step !== 'error';
  const mcVer = manifest?.minecraftVersion || APP_CONFIG.MINECRAFT.VERSION;
  const loaderVer = manifest?.loader?.version || APP_CONFIG.MINECRAFT.LOADER_VERSION;
  const totalFiles = manifest?.totalFiles || 2122;
  const totalSizeMb = manifest?.totalSize ? (manifest.totalSize / (1024 * 1024)).toFixed(0) : '1431';
  const motd = serverStatus?.motd ? stripMinecraftCodes(serverStatus.motd) : 'Conectando...';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── VERSION PILL ROW ── */}
      <div className="flex items-center justify-center gap-2 pt-3 pb-1 flex-shrink-0">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-canvas-elevated text-slate-400 border border-canvas-border">
          MC {mcVer}
        </span>
        <span className="text-slate-600 text-[10px]">·</span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-canvas-elevated text-slate-400 border border-canvas-border">
          NeoForge {loaderVer}
        </span>
        {manifest && (
          <>
            <span className="text-slate-600 text-[10px]">·</span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-default border"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }}
              title="Sincronización diferencial activa con el servidor oficial"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              CDN Conectada
            </span>
          </>
        )}
      </div>

      {/* ── MAIN 3-COLUMN ── */}
      <div className="flex-1 flex items-center justify-center gap-5 px-5 py-3 overflow-hidden min-h-0">

        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-3 w-52 flex-shrink-0"
        >
          {/* Server Status */}
          <div
            className="rounded-xl border p-3.5 flex flex-col gap-3"
            style={{
              background: 'rgba(15,20,35,0.8)',
              borderColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px -4px var(--theme-glow)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--theme-soft)' }}>
                  <Server className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <span className="text-xs font-bold text-white truncate">{APP_CONFIG.SERVER.NAME}</span>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold flex-shrink-0"
                style={
                  serverStatus?.online
                    ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }
                    : { background: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }
                }
              >
                <div className={`w-1.5 h-1.5 rounded-full ${serverStatus?.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {serverStatus?.online ? 'Online' : 'Offline'}
              </div>
            </div>

            <div
              className="rounded-lg p-2.5 text-[11px] text-slate-300 font-mono leading-relaxed"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {motd}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Jugadores:</span>
              <span className="font-bold text-white font-mono">
                {serverStatus ? `${serverStatus.playersOnline} / ${serverStatus.playersMax}` : '-- / --'}
              </span>
            </div>
          </div>

          {/* Account widget */}
          <div
            onClick={onSelectAccount}
            className="rounded-xl border p-3 flex items-center gap-3 cursor-pointer group transition-all hover:border-opacity-50"
            style={{
              background: 'rgba(15,20,35,0.8)',
              borderColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
            title="Cambiar cuenta"
          >
            {activeAccount ? (
              <>
                <div className="relative flex-shrink-0">
                  <img
                    src={activeAccount.avatarUrl}
                    alt={activeAccount.username}
                    className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100'; }}
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold ${
                      activeAccount.type === 'microsoft' ? 'bg-green-400 text-slate-950' : 'bg-slate-600 text-slate-100'
                    }`}
                  >
                    {activeAccount.type === 'microsoft' ? 'P' : 'O'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold text-white truncate transition-colors"
                    style={{ transitionProperty: 'color' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = 'var(--theme-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = ''; }}
                  >
                    {activeAccount.username}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                    {activeAccount.type === 'microsoft' ? (
                      <><ShieldCheck className="w-3 h-3 text-green-400" /><span>Microsoft</span></>
                    ) : (
                      <><User className="w-3 h-3" /><span>No-Premium</span></>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">→</span>
              </>
            ) : (
              <div className="w-full text-center">
                <p className="text-xs text-slate-400 mb-1">Sin cuenta activa</p>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-primary)' }}>+ Elegir cuenta</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* CENTER: Pokémon Holo Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
          className="flex flex-col items-center gap-3 flex-shrink-0"
        >
          <h1 className="text-2xl font-black tracking-tight text-white leading-none text-center">
            Cobblemon{' '}
            <span style={{ color: 'var(--theme-primary)', textShadow: '0 0 20px var(--theme-glow)' }}>
              Realms
            </span>
          </h1>

          <PokemonHoloCard card={activeCard} isGameRunning={isGameRunning} />

          <button
            onClick={(e) => { e.stopPropagation(); onChangeCard(); }}
            className="flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-all cursor-pointer"
            style={{
              background: 'var(--theme-soft)',
              color: 'var(--theme-primary)',
              borderColor: 'color-mix(in srgb, var(--theme-primary) 40%, transparent)',
            }}
          >
            <RefreshCw className="w-3 h-3" />
            {activeCard.name}
          </button>
        </motion.div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-3 w-52 flex-shrink-0"
        >
          {/* Pack stats */}
          <div
            className="rounded-xl border p-3.5 flex flex-col gap-3"
            style={{
              background: 'rgba(15,20,35,0.8)',
              borderColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px -4px var(--theme-glow)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--theme-soft)' }}>
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Contenido del Pack</div>
                <div className="text-[10px] text-slate-400">Delta Sync activo</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <StatRow label="Archivos" value={`${totalFiles.toLocaleString()}`} themed />
              <StatRow label="Tamaño Total" value={`${totalSizeMb} MB`} />
              <StatRow label="RAM Asignada" value={`${(settings.ramMaxMb / 1024).toFixed(1)} GB`} themed />
              <StatRow label="Recomendada" value="10 GB" />
            </div>
          </div>

          {/* Pack version */}
          <div
            className="rounded-xl border p-3.5"
            style={{
              background: 'rgba(15,20,35,0.8)',
              borderColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Versión del Pack</div>
            <div className="text-sm font-black font-mono" style={{ color: 'var(--theme-primary)' }}>
              {manifest?.packVersion || '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {manifest?.packName || APP_CONFIG.MINECRAFT.PACK_NAME}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── LAUNCH BAR ── */}
      <div className="flex-shrink-0 px-5 pb-4">
        <div
          className="rounded-2xl border p-3.5"
          style={{
            background: 'rgba(10,13,25,0.85)',
            borderColor: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {isLaunching ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--theme-primary)' }} />
                  <span className="font-bold text-white">{progress.title}</span>
                  <span className="text-slate-400 text-[11px] font-mono">— {progress.detail}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold" style={{ color: 'var(--theme-primary)' }}>
                    {progress.percentage}%
                  </span>
                  <button
                    onClick={onAbort}
                    className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              <div className="w-full h-2.5 bg-canvas rounded-full overflow-hidden border border-canvas-border">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 0 10px var(--theme-glow)',
                  }}
                  animate={{ width: `${Math.max(4, progress.percentage)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <div className="truncate max-w-xs">
                  {progress.currentFile ? `↳ ${progress.currentFile}` : progress.detail}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {progress.completedFiles !== undefined && progress.totalFiles > 0 && (
                    <span>{progress.completedFiles} / {progress.totalFiles}</span>
                  )}
                  {progress.speedBytesPerSec !== undefined && progress.speedBytesPerSec > 0 && (
                    <span style={{ color: 'var(--theme-primary)', fontWeight: 700 }}>
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
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex-1">
                {activeAccount ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>
                      Listo para jugar como <b className="text-white">{activeAccount.username}</b>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Selecciona una cuenta para continuar.</span>
                  </div>
                )}
              </div>

              <motion.button
                disabled={!activeAccount}
                onClick={onLaunch}
                whileHover={activeAccount ? { scale: 1.03 } : {}}
                whileTap={activeAccount ? { scale: 0.97 } : {}}
                className="flex items-center justify-center gap-2.5 w-52 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest disabled:cursor-not-allowed cursor-pointer"
                style={
                  activeAccount
                    ? {
                        background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                        boxShadow: '0 0 40px -4px var(--theme-glow), 0 4px 16px rgba(0,0,0,0.6)',
                        color: '#fff',
                      }
                    : {
                        background: '#1e293b',
                        color: '#475569',
                        border: '1px solid #334155',
                      }
                }
              >
                <Play className="w-5 h-5 fill-current" />
                JUGAR
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper row
const StatRow: React.FC<{ label: string; value: string; themed?: boolean }> = ({ label, value, themed }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-slate-400">{label}</span>
    <span
      className="text-[11px] font-bold font-mono"
      style={themed ? { color: 'var(--theme-primary)' } : { color: '#e2e8f0' }}
    >
      {value}
    </span>
  </div>
);
