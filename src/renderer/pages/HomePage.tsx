import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  Account,
  DownloadProgress,
  LauncherSettings,
  ModpackManifest,
  ServerStatus,
} from '../../shared/types';
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
  isAppReady?: boolean;
}

/** Limpia códigos de formato de Minecraft §X */
function cleanMotd(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, '').trim();
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
  isAppReady = true,
}) => {
  const isLaunching = progress && progress.step !== 'idle' && progress.step !== 'error';
  const mcVer = manifest?.minecraftVersion || APP_CONFIG.MINECRAFT.VERSION;
  const loaderVer = manifest?.loader?.version || APP_CONFIG.MINECRAFT.LOADER_VERSION;
  const totalFiles = manifest?.totalFiles || 2122;
  const totalSizeMb = manifest?.totalSize
    ? (manifest.totalSize / (1024 * 1024)).toFixed(0)
    : '1431';
  const motd = serverStatus?.motd
    ? cleanMotd(serverStatus.motd)
    : 'Conectando con el servidor Cobblemon Realms...';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden select-none bg-[#07090e]">
      {/* ============================================================== */}
      {/* 2. FONDO DINÁMICO CON WALLPAPER ARTWORK DEL POKÉMON            */}
      {/* ============================================================== */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.52, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* WALLPAPER DEL POKÉMON EN ALTA RESOLUCIÓN (MENOR OSCURECIMIENTO) */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={activeCard.backgroundImage}
                alt={activeCard.name}
                draggable={false}
                className="w-full h-full object-cover object-center"
                style={{
                  filter: 'brightness(0.82) contrast(1.1)',
                }}
              />
            </div>

            {/* GRADIENTE AMBIENTAL ELEMENTAL */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 45%, ${activeCard.ambientGlow} 0%, rgba(7, 9, 14, 0.28) 60%, rgba(7, 9, 14, 0.82) 95%)`,
                mixBlendMode: 'multiply',
              }}
            />

            {/* Acentos de iluminación elemental */}
            {activeCard.primaryType === 'fire' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl animate-pulse" />
                <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-red-600/20 blur-3xl" />
              </div>
            )}
            {activeCard.primaryType === 'water' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-cyan-600/20 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />
              </div>
            )}
            {activeCard.primaryType === 'psychic' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-purple-600/25 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-pink-600/20 blur-3xl" />
              </div>
            )}
            {activeCard.primaryType === 'grass' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-600/20 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 left-1/3 w-80 h-80 rounded-full bg-lime-600/20 blur-3xl" />
              </div>
            )}

            {/* Viñeta radial más suave para mayor claridad del artwork */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 25%, rgba(7, 9, 14, 0.38) 65%, rgba(7, 9, 14, 0.82) 95%)',
              }}
            />

            {/* Gradiente sutil inferior detrás de la barra de jugar */}
            <div
              className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(7, 9, 14, 0.8) 0%, rgba(7, 9, 14, 0.3) 60%, transparent 100%)',
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ============================================================== */}
      {/* 1. TOP VERSION PILL (COMPACTO)                                 */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={isAppReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-center gap-2 pt-3 pb-1 flex-shrink-0"
      >
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#0b0d14]/60 backdrop-blur text-slate-400 border border-white/10">
          MC {mcVer}
        </span>
        <span className="text-slate-600 text-[10px]">·</span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#0b0d14]/60 backdrop-blur text-slate-400 border border-white/10">
          NeoForge {loaderVer}
        </span>
        {manifest && (
          <>
            <span className="text-slate-600 text-[10px]">·</span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-default border backdrop-blur"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#4ade80',
                borderColor: 'rgba(34, 197, 94, 0.35)',
              }}
              title="Sincronización diferencial activa con el servidor oficial"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              CDN Oficial
            </span>
          </>
        )}
      </motion.div>

      {/* ============================================================== */}
      {/* 1. ÁREA CENTRAL: PANELES FLANQUEANDO LA CARTA PROTAGONISTA     */}
      {/* ============================================================== */}
      <div className="relative z-10 flex-1 flex items-center justify-center gap-6 px-6 py-1 min-h-0 overflow-hidden">
        {/* PANEL IZQUIERDO: ESTADO DEL SERVIDOR */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={isAppReady ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="w-60 flex-shrink-0"
        >
          <div className="bg-[#0b0d14]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ background: 'var(--theme-soft)' }}
                >
                  <Server
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {APP_CONFIG.SERVER.NAME}
                  </div>
                  <div className="text-[10px] text-slate-400">Multijugador</div>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0"
                style={
                  serverStatus?.online
                    ? {
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                      }
                    : {
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      }
                }
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    serverStatus?.online
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                {serverStatus?.online ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* MOTD */}
            <div className="rounded-xl p-2.5 text-[11px] text-slate-300 font-mono leading-relaxed bg-black/40 border border-white/5">
              {motd}
            </div>

            {/* Jugadores */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
              <span className="text-slate-400 font-medium">Jugadores:</span>
              <span className="font-bold text-white font-mono">
                {serverStatus
                  ? `${serverStatus.playersOnline} / ${serverStatus.playersMax}`
                  : '-- / --'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CENTRO: CARTA POKÉMON PROTAGONISTA */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={isAppReady ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.94 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="flex flex-col items-center gap-2.5 flex-shrink-0"
        >
          <PokemonHoloCard
            card={activeCard}
            isGameRunning={isGameRunning}
          />

          {/* Botón discreto para cambiar de carta */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeCard();
            }}
            className="flex items-center gap-2 text-[11px] font-bold rounded-full px-3.5 py-1.5 border transition-all cursor-pointer backdrop-blur-md shadow-lg hover:brightness-110 active:scale-95"
            style={{
              background: 'var(--theme-soft)',
              color: 'var(--theme-primary)',
              borderColor: 'var(--theme-primary)40',
              boxShadow: '0 0 16px -4px var(--theme-glow)',
            }}
            title="Cambiar a otro Pokémon"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {activeCard.name}
              {activeCard.isEx ? ' ex' : ''}
            </span>
          </button>
        </motion.div>

        {/* PANEL DERECHO: CONTENIDO DEL PACK & RAM */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={isAppReady ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="w-60 flex-shrink-0"
        >
          <div className="bg-[#0b0d14]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ background: 'var(--theme-soft)' }}
                >
                  <Layers
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">
                    Modpack Oficial
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Delta Sync Activo
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Gzip
              </span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <StatRow
                label="Archivos"
                value={`${totalFiles.toLocaleString()}`}
                themed
              />
              <StatRow label="Tamaño Total" value={`${totalSizeMb} MB`} />
              <StatRow
                label="RAM Asignada"
                value={`${(settings.ramMaxMb / 1024).toFixed(1)} GB`}
                themed
              />
              <StatRow label="Recomendada" value="10 GB" />
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5 flex items-center justify-between">
              <span>Sincronización:</span>
              <span className="font-semibold text-slate-200">
                Ultra-rápida (VPS)
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============================================================== */}
      {/* 1. BARRA INFERIOR TRANSLÚCIDA ESTILO CRISTAL (GLASSMORPHISM)   */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={isAppReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        className="relative z-10 flex-shrink-0 w-full bg-[#090b12]/40 backdrop-blur-xl border-t border-white/10 px-8 py-3.5"
      >
        {isLaunching ? (
          <div className="space-y-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: 'var(--theme-primary)' }}
                />
                <span className="font-bold text-white">{progress.title}</span>
                <span className="text-slate-400 text-[11px] font-mono truncate max-w-md">
                  — {progress.detail}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {progress.percentage}%
                </span>
                <button
                  onClick={onAbort}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))',
                  boxShadow: '0 0 14px var(--theme-glow)',
                }}
                animate={{ width: `${Math.max(3, progress.percentage)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Detalles de velocidad y archivos */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <div className="truncate max-w-xs">
                {progress.currentFile
                  ? `↳ ${progress.currentFile}`
                  : progress.detail}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {progress.completedFiles !== undefined &&
                  progress.totalFiles > 0 && (
                    <span>
                      {progress.completedFiles} / {progress.totalFiles} archivos
                    </span>
                  )}
                {progress.speedBytesPerSec !== undefined &&
                  progress.speedBytesPerSec > 0 && (
                    <span
                      style={{
                        color: 'var(--theme-primary)',
                        fontWeight: 700,
                      }}
                    >
                      {(progress.speedBytesPerSec / (1024 * 1024)).toFixed(1)}{' '}
                      MB/s
                    </span>
                  )}
                {progress.etaSeconds !== undefined && progress.etaSeconds > 0 && (
                  <span>ETA: {progress.etaSeconds}s</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6 max-w-5xl mx-auto">
            {/* Estado de la cuenta */}
            <div className="text-xs text-slate-300 flex-1">
              {activeAccount ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    Listo para jugar como{' '}
                    <b className="text-white font-bold">
                      {activeAccount.username}
                    </b>{' '}
                    <span className="text-[11px] text-slate-400">
                      ({activeAccount.type === 'microsoft'
                        ? 'Cuenta Premium'
                        : 'No-Premium'}
                      )
                    </span>
                  </span>
                </div>
              ) : (
                <div
                  onClick={onSelectAccount}
                  className="flex items-center gap-2 text-amber-400 cursor-pointer hover:underline"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Haz clic aquí para seleccionar o crear una cuenta antes de
                    jugar.
                  </span>
                </div>
              )}
            </div>

            {/* Botón JUGAR */}
            <motion.button
              disabled={!activeAccount}
              onClick={onLaunch}
              whileHover={activeAccount ? { scale: 1.03 } : {}}
              whileTap={activeAccount ? { scale: 0.97 } : {}}
              className="flex items-center justify-center gap-2.5 w-56 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest disabled:cursor-not-allowed cursor-pointer shadow-2xl transition-all"
              style={
                activeAccount
                  ? {
                      background:
                        'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                      boxShadow:
                        '0 0 35px -2px var(--theme-glow), 0 4px 16px rgba(0,0,0,0.6)',
                      color: '#ffffff',
                    }
                  : {
                      background: '#1e293b',
                      color: '#475569',
                      border: '1px solid #334155',
                    }
              }
            >
              <Play className="w-5 h-5 fill-current" />
              <span>JUGAR</span>
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// Componente auxiliar para filas de estadísticas
const StatRow: React.FC<{
  label: string;
  value: string;
  themed?: boolean;
}> = ({ label, value, themed }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-slate-400">{label}</span>
    <span
      className="text-[11px] font-bold font-mono"
      style={themed ? { color: 'var(--theme-primary)' } : { color: '#f1f5f9' }}
    >
      {value}
    </span>
  </div>
);
