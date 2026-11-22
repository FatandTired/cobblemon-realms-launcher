import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Terminal,
  FolderOpen,
  Save,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Network,
  Zap,
  Check
} from 'lucide-react';
import { LauncherSettings, SystemInfo } from '../../shared/types';
import { APP_CONFIG, calculateSafeRamSuggestion } from '../../shared/config';

interface SettingsPageProps {
  settings: LauncherSettings;
  onSaveSettings: (settings: Partial<LauncherSettings>) => Promise<void>;
  onOpenInstanceFolder: () => Promise<void>;
  onBrowseJavaPath?: () => Promise<string | null>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onOpenInstanceFolder
}) => {
  const [form, setForm] = useState<LauncherSettings>({ ...settings });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  useEffect(() => {
    if (window.electronAPI?.getSystemInfo) {
      window.electronAPI.getSystemInfo().then(setSystemInfo).catch(() => {});
    }
  }, []);

  const totalRamGb = systemInfo ? Math.round(systemInfo.totalMemoryMb / 1024) : 16;
  const maxAllowedRamMb = totalRamGb * 1024;
  const safeSuggestionMb = systemInfo?.recommendedRamMb || calculateSafeRamSuggestion(totalRamGb * 1024, 10240);

  const handleRamChange = (valMb: number) => {
    setForm((prev) => ({
      ...prev,
      ramMaxMb: valMb,
      ramMinMb: Math.min(prev.ramMinMb, valMb)
    }));
  };

  const handleApplyRecommendedRam = () => {
    handleRamChange(safeSuggestionMb);
  };

  const handleApplyPresetAikar = () => {
    setForm((prev) => ({
      ...prev,
      jvmArgs: APP_CONFIG.DEFAULT_SETTINGS.jvmArgs
    }));
  };

  const handleResetDefaults = () => {
    setForm({
      ...APP_CONFIG.DEFAULT_SETTINGS,
      ramMaxMb: safeSuggestionMb,
      useAutomaticJava21: true,
      mockMode: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        ...form,
        useAutomaticJava21: true,
        mockMode: false
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cobble-cyan" />
            Configuración del Launcher
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ajustes de memoria RAM, descargas concurrentes de Delta Sync y optimizaciones JVM.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs text-cobble-emerald bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configuración guardada</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Memory Allocation Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cobble-cyan" />
              <h3 className="text-sm font-bold text-white">Memoria RAM Asignada (-Xmx)</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">
                Total Sistema: <b className="text-white">{totalRamGb} GB</b>
              </span>
              <button
                type="button"
                onClick={handleApplyRecommendedRam}
                className="text-[11px] bg-cobble-cyan/15 text-cobble-cyan hover:bg-cobble-cyan/25 px-2.5 py-0.5 rounded border border-cobble-cyan/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Aplica la RAM óptima calculada para tu hardware"
              >
                <Zap className="w-3 h-3 inline" />
                <span>Aplicar Sugerencia Segura ({(safeSuggestionMb / 1024).toFixed(1)} GB)</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">RAM Máxima:</span>
              <span className="text-sm font-bold text-cobble-cyan font-mono">
                {(form.ramMaxMb / 1024).toFixed(1)} GB ({form.ramMaxMb} MB)
              </span>
            </div>

            <input
              type="range"
              min={2048}
              max={Math.max(12288, maxAllowedRamMb - 2048)}
              step={512}
              value={form.ramMaxMb}
              onChange={(e) => handleRamChange(Number(e.target.value))}
              className="w-full h-2 bg-canvas rounded-lg appearance-none cursor-pointer accent-cobble-cyan"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2 GB (Mínimo)</span>
              <span className="text-cobble-emerald font-semibold">
                10 GB (Recomendado por Cobblemon Realms)
              </span>
              <span>{Math.round(maxAllowedRamMb / 1024 - 2)} GB (Límite Sistema)</span>
            </div>
          </div>
        </div>

        {/* Delta Sync & Concurrency Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-cobble-cyan" />
              <h3 className="text-sm font-bold text-white">Sincronización Diferencial (Delta Sync)</h3>
            </div>
            <span className="text-xs font-mono text-cobble-emerald">
              Hilos: {form.downloadConcurrency || 8} concurrentes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Descargas Concurrentes (Sockets Keep-Alive)
              </label>
              <select
                value={form.downloadConcurrency || 8}
                onChange={(e) => setForm((prev) => ({ ...prev, downloadConcurrency: Number(e.target.value) }))}
                className="w-full bg-canvas border border-canvas-border focus:border-cobble-cyan rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value={4}>4 hilos (Conexiones modestas)</option>
                <option value={6}>6 hilos (Equilibrado)</option>
                <option value={8}>8 hilos (Recomendado - Keep-Alive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Servidor de Contenido
              </label>
              <div className="w-full bg-canvas/50 border border-canvas-border rounded-lg px-3 py-2 text-xs text-cobble-emerald flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cobble-emerald animate-pulse" />
                <span className="font-medium">Servidor Oficial Conectado</span>
              </div>
            </div>
          </div>
        </div>

        {/* JVM Flags Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cobble-cyan" />
              <h3 className="text-sm font-bold text-white">Argumentos JVM Optimizados</h3>
            </div>
            <button
              type="button"
              onClick={handleApplyPresetAikar}
              className="text-xs text-cobble-cyan hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar Flags Aikar (G1GC)</span>
            </button>
          </div>

          <textarea
            rows={3}
            value={form.jvmArgs}
            onChange={(e) => setForm((prev) => ({ ...prev, jvmArgs: e.target.value }))}
            className="w-full bg-canvas border border-canvas-border focus:border-cobble-cyan rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none resize-none leading-relaxed"
            placeholder="-XX:+UseG1GC..."
          />
        </div>

        {/* Local Instance Directory Card */}
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">Carpeta de Instancia del Juego</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
              %APPDATA%/{APP_CONFIG.PATHS.FOLDER_NAME}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInstanceFolder}
            className="px-3 py-2 rounded-lg bg-canvas hover:bg-canvas-elevated text-slate-300 hover:text-white border border-canvas-border transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
            title="Abrir en Explorador de Windows"
          >
            <FolderOpen className="w-4 h-4 text-cobble-cyan" />
            <span>Abrir en Explorador</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-lg bg-canvas text-xs font-semibold text-slate-400 hover:text-white border border-canvas-border hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Predeterminados</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cobble-cyan to-blue-600 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-glow-cyan flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Ajustes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
