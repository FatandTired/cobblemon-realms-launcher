import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { Sidebar, TabType } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { ConsolePage } from './pages/ConsolePage';
import { AccountModal } from './components/AccountModal';
import { Account, DownloadProgress, LauncherSettings, LogEntry, ModpackManifest, ServerStatus } from '../shared/types';
import { APP_CONFIG } from '../shared/config';
import { PokemonCard, getRandomCard, applyCardTheme } from '../data/pokemonCards';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [accounts, setAccounts] = useState<Account[]>(APP_CONFIG.MOCK_DATA.defaultAccounts);
  const [activeAccountId, setActiveAccountId] = useState<string | null>('offline-trainer-1');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(APP_CONFIG.MOCK_DATA.serverStatus);
  const [manifest, setManifest] = useState<ModpackManifest | null>(null);
  const [settings, setSettings] = useState<LauncherSettings>(APP_CONFIG.DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(APP_CONFIG.MOCK_DATA.initialLogs);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // ── Loader global de inicio (2 segundos) ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ── Pokémon card theme ──
  const [activeCard, setActiveCard] = useState<PokemonCard>(() => getRandomCard());
  useEffect(() => { applyCardTheme(activeCard.theme); }, [activeCard]);

  const handleChangeCard = () => {
    const next = getRandomCard(activeCard.id);
    setActiveCard(next);
  };

  useEffect(() => {
    if (!window.electronAPI) {
      console.warn('Electron IPC API no detectada. Operando en modo vista previa web.');
      return;
    }

    // Cargar cuentas del store y limpiar cuentas de ejemplo si ya existen cuentas reales
    window.electronAPI.getAccounts().then((accs) => {
      if (accs && accs.length > 0) {
        const hasRealAccounts = accs.some((a) => a.id !== 'offline-trainer-1');
        let cleanAccounts = accs;
        if (hasRealAccounts) {
          cleanAccounts = accs.filter((a) => a.id !== 'offline-trainer-1');
          if (accs.some((a) => a.id === 'offline-trainer-1')) {
            window.electronAPI?.deleteAccount('offline-trainer-1').catch(() => {});
          }
        }
        setAccounts(cleanAccounts);
      }
    }).catch(console.error);

    // Cargar cuenta activa
    window.electronAPI.getActiveAccountId().then((id) => {
      if (id) setActiveAccountId(id);
    }).catch(console.error);

    // Cargar configuración
    window.electronAPI.getSettings().then((s) => {
      if (s) setSettings(s);
    }).catch(console.error);

    // Cargar estado de servidor
    window.electronAPI.getServerStatus().then((st) => {
      if (st) setServerStatus(st);
    }).catch(console.error);

    // Cargar manifiesto real
    window.electronAPI.fetchManifest().then((man) => {
      if (man) {
        setManifest(man);
        addLog(
          'INFO',
          'launcher',
          `Servidor de contenido conectado: ${man.packName} v${man.packVersion} [${man.totalFiles} archivos]`
        );
      }
    }).catch(console.error);

    // Escuchar progreso de descarga e instalación
    const unbindProgress = window.electronAPI.onDownloadProgress((prog) => {
      setProgress(prog);
      if (prog.step === 'running') {
        setTimeout(() => setProgress(null), 4000);
      }
    });

    // Escuchar logs en tiempo real
    const unbindLogs = window.electronAPI.onLog((entry) => {
      setLogs((prev) => [...prev, entry]);
    });

    // Escuchar salida del juego
    const unbindExit = window.electronAPI.onGameExit((code, crashReportPath) => {
      setProgress(null);
      if (code !== 0) {
        addLog('ERROR', 'launcher', `Minecraft finalizó con error (Código: ${code}).${crashReportPath ? ` Crash report en: ${crashReportPath}` : ''}`);
      } else {
        addLog('INFO', 'launcher', `Proceso de Minecraft finalizado con código de salida ${code}.`);
      }
    });

    return () => {
      unbindProgress();
      unbindLogs();
      unbindExit();
    };
  }, []);

  const addLog = (level: LogEntry['level'], source: LogEntry['source'], message: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message
    };
    setLogs((prev) => [...prev, entry]);
  };

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || null;

  // Manejo de Cuentas (Regla: Máximo 1 Premium y 1 No-Premium; borra ejemplo Red Trainer al agregar una nueva)
  const handleSelectAccount = async (id: string) => {
    setActiveAccountId(id);
    if (window.electronAPI) {
      await window.electronAPI.setActiveAccount(id);
    }
    const acc = accounts.find((a) => a.id === id);
    if (acc) {
      addLog('INFO', 'launcher', `Perfil activo cambiado a: ${acc.username} (${acc.type}).`);
    }
  };

  const handleAddOfflineAccount = async (username: string) => {
    // 1. Si existe la cuenta de ejemplo 'Red Trainer', borrarla de inmediato
    const redTrainer = accounts.find((a) => a.id === 'offline-trainer-1');
    if (redTrainer) {
      if (window.electronAPI) await window.electronAPI.deleteAccount('offline-trainer-1');
    }

    // 2. Si ya hay una cuenta offline previa, reemplazarla (solo 1 no-premium permitida)
    const existingOffline = accounts.find((a) => a.type === 'offline' && a.id !== 'offline-trainer-1');
    if (existingOffline) {
      if (window.electronAPI) await window.electronAPI.deleteAccount(existingOffline.id);
    }

    if (window.electronAPI) {
      const created = await window.electronAPI.loginOffline(username);
      setAccounts((prev) => [
        ...prev.filter((a) => a.id !== 'offline-trainer-1' && (a.type !== 'offline' || a.id === created.id)),
        created
      ]);
      setActiveAccountId(created.id);
      addLog('INFO', 'launcher', `Cuenta No-Premium configurada: ${username}`);
    } else {
      const newAcc: Account = {
        id: `offline-${Date.now()}`,
        username,
        type: 'offline',
        uuid: `00000000-0000-3000-8000-${Date.now().toString().slice(-12)}`,
        avatarUrl: `https://mc-heads.net/avatar/${username}/100`,
        addedAt: Date.now()
      };
      setAccounts((prev) => [
        ...prev.filter((a) => a.id !== 'offline-trainer-1' && a.type !== 'offline'),
        newAcc
      ]);
      setActiveAccountId(newAcc.id);
      addLog('INFO', 'launcher', `Cuenta No-Premium configurada: ${username}`);
    }
  };

  const handleLoginMicrosoft = async () => {
    addLog('INFO', 'launcher', 'Iniciando autenticación oficial de Microsoft...');
    if (window.electronAPI) {
      // 1. Si existe la cuenta de ejemplo 'Red Trainer', borrarla
      const redTrainer = accounts.find((a) => a.id === 'offline-trainer-1');
      if (redTrainer) {
        await window.electronAPI.deleteAccount('offline-trainer-1');
      }

      // 2. Si ya hay una cuenta premium previa, reemplazarla (solo 1 premium permitida)
      const existingPremium = accounts.find((a) => a.type === 'microsoft');
      if (existingPremium) {
        await window.electronAPI.deleteAccount(existingPremium.id);
      }

      const res = await window.electronAPI.loginMicrosoft();
      if (res.success && res.account) {
        setAccounts((prev) => [
          ...prev.filter((a) => a.id !== 'offline-trainer-1' && (a.type !== 'microsoft' || a.id === res.account!.id)),
          res.account!
        ]);
        setActiveAccountId(res.account.id);
        addLog('INFO', 'launcher', `Autenticación Microsoft exitosa: ${res.account.username}`);
      } else {
        addLog('ERROR', 'launcher', `Error en inicio Microsoft: ${res.error || 'Cancelado'}`);
        throw new Error(res.error || 'Fallo en la autenticación.');
      }
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteAccount(id);
    }
    const remaining = accounts.filter((a) => a.id !== id);
    setAccounts(remaining);
    if (activeAccountId === id) {
      setActiveAccountId(remaining.length > 0 ? remaining[0].id : null);
    }
    addLog('WARN', 'launcher', `Perfil eliminado del launcher.`);
  };

  // Manejo de Ajustes
  const handleSaveSettings = async (newSettings: Partial<LauncherSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings(merged);
    }
    addLog('INFO', 'launcher', 'Ajustes guardados correctamente.');
  };

  const handleBrowseJavaPath = async () => {
    if (window.electronAPI) {
      return await window.electronAPI.browseJavaPath();
    }
    return null;
  };

  const handleOpenInstanceFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openInstanceFolder();
    }
  };

  // Lanzamiento del Juego y Delta Sync
  const handleLaunch = async () => {
    if (!activeAccountId) {
      setIsAccountModalOpen(true);
      return;
    }

    if (window.electronAPI) {
      addLog('INFO', 'launcher', `Iniciando sincronización para ${activeAccount?.username}...`);
      const res = await window.electronAPI.launchGame({ accountId: activeAccountId });
      if (!res.success) {
        addLog('ERROR', 'launcher', `Error en el proceso: ${res.error}`);
      }
    } else {
      // Simulación para navegador web
      addLog('INFO', 'launcher', '=== MODO VISTA PREVIA WEB ===');
      const steps: Array<{ step: DownloadProgress['step']; title: string; detail: string; percentage: number; delay: number }> = [
        { step: 'fetching_manifest', title: 'Consultando Manifiesto', detail: 'Descargando manifest.json...', percentage: 10, delay: 600 },
        { step: 'verifying', title: 'Verificando Integridad', detail: 'Verificando SHA-256 de archivos...', percentage: 40, delay: 1000 },
        { step: 'syncing_files', title: 'Sincronizando Mods', detail: 'Descargando archivos actualizados...', percentage: 80, delay: 1200 },
        { step: 'launching', title: 'Lanzando Minecraft', detail: 'Iniciando JVM y NeoForge...', percentage: 98, delay: 800 },
        { step: 'running', title: 'Juego en Ejecución', detail: 'Minecraft iniciado exitosamente.', percentage: 100, delay: 1500 }
      ];

      for (const s of steps) {
        setProgress({
          step: s.step,
          title: s.title,
          detail: s.detail,
          percentage: s.percentage,
          totalFiles: 2122,
          completedFiles: Math.round((s.percentage / 100) * 2122)
        });
        addLog('INFO', 'launcher', `[Simulación]: ${s.title} - ${s.detail}`);
        await new Promise((r) => setTimeout(r, s.delay));
      }
    }
  };

  const handleAbort = async () => {
    if (window.electronAPI) {
      await window.electronAPI.abortLaunch();
      setProgress(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-slate-100 overflow-hidden font-sans">
      {/* Top Titlebar */}
      <TopBar
        serverPing={serverStatus?.ping}
        serverOnline={serverStatus?.online}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeAccount={activeAccount}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 overflow-hidden bg-canvas relative">
          {!isInitialLoading && (
            <React.Fragment key={activeTab}>
              {activeTab === 'home' && (
                <HomePage
                  activeAccount={activeAccount}
                  serverStatus={serverStatus}
                  manifest={manifest}
                  settings={settings}
                  progress={progress}
                  onLaunch={handleLaunch}
                  onAbort={handleAbort}
                  onSelectAccount={() => setIsAccountModalOpen(true)}
                  isGameRunning={progress?.step === 'running'}
                  activeCard={activeCard}
                  onChangeCard={handleChangeCard}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  onOpenInstanceFolder={handleOpenInstanceFolder}
                  onBrowseJavaPath={handleBrowseJavaPath}
                />
              )}

              {activeTab === 'console' && (
                <ConsolePage
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                />
              )}
            </React.Fragment>
          )}
        </main>
      </div>

      {/* Modal de Cuentas */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={(id) => {
          handleSelectAccount(id);
          setIsAccountModalOpen(false);
        }}
        onAddOfflineAccount={async (name) => {
          await handleAddOfflineAccount(name);
          setIsAccountModalOpen(false);
        }}
        onLoginMicrosoft={async () => {
          await handleLoginMicrosoft();
          setIsAccountModalOpen(false);
        }}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Loader Global de Inicio (Pantalla completa, 2 segundos, spinner normal) */}
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            key="global-app-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07090e] select-none"
          >
            <Loader2
              className="w-9 h-9 animate-spin"
              style={{ color: 'var(--theme-primary)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
