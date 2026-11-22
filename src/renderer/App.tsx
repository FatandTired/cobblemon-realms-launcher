import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, TabType } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConsolePage } from './pages/ConsolePage';
import { Account, DownloadProgress, LauncherSettings, LogEntry, ModpackManifest, ServerStatus } from '../shared/types';
import { APP_CONFIG } from '../shared/config';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [accounts, setAccounts] = useState<Account[]>(APP_CONFIG.MOCK_DATA.defaultAccounts);
  const [activeAccountId, setActiveAccountId] = useState<string | null>('offline-trainer-1');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(APP_CONFIG.MOCK_DATA.serverStatus);
  const [manifest, setManifest] = useState<ModpackManifest | null>(null);
  const [settings, setSettings] = useState<LauncherSettings>(APP_CONFIG.DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(APP_CONFIG.MOCK_DATA.initialLogs);

  useEffect(() => {
    if (!window.electronAPI) {
      console.warn('Electron IPC API no detectada. Operando en modo vista previa web.');
      return;
    }

    // Cargar cuentas
    window.electronAPI.getAccounts().then((accs) => {
      if (accs && accs.length > 0) {
        setAccounts(accs);
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

    // Cargar manifiesto real desde el VPS
    window.electronAPI.fetchManifest().then((man) => {
      if (man) {
        setManifest(man);
        addLog(
          'INFO',
          'launcher',
          `CDN Conectado: ${man.packName} v${man.packVersion} [${man.totalFiles} archivos, ${(man.totalSize / (1024 * 1024)).toFixed(0)} MB]`
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

  // Manejo de Cuentas
  const handleSelectAccount = async (id: string) => {
    setActiveAccountId(id);
    if (window.electronAPI) {
      await window.electronAPI.setActiveAccount(id);
    }
    const acc = accounts.find((a) => a.id === id);
    if (acc) {
      addLog('INFO', 'launcher', `Perfil activo: ${acc.username} (${acc.type}).`);
    }
  };

  const handleAddOfflineAccount = async (username: string) => {
    if (window.electronAPI) {
      const created = await window.electronAPI.loginOffline(username);
      setAccounts((prev) => [...prev.filter((a) => a.id !== created.id), created]);
      setActiveAccountId(created.id);
      addLog('INFO', 'launcher', `Cuenta No-Premium agregada: ${username} [UUID v3 generado]`);
    } else {
      const newAcc: Account = {
        id: `offline-${Date.now()}`,
        username,
        type: 'offline',
        uuid: `00000000-0000-3000-8000-${Date.now().toString().slice(-12)}`,
        avatarUrl: `https://mc-heads.net/avatar/${username}/100`,
        addedAt: Date.now()
      };
      setAccounts((prev) => [...prev, newAcc]);
      setActiveAccountId(newAcc.id);
      addLog('INFO', 'launcher', `Cuenta No-Premium agregada (Local): ${username}`);
    }
  };

  const handleLoginMicrosoft = async () => {
    addLog('INFO', 'launcher', 'Iniciando autenticación Microsoft OAuth2...');
    if (window.electronAPI) {
      const res = await window.electronAPI.loginMicrosoft();
      if (res.success && res.account) {
        setAccounts((prev) => [...prev.filter((a) => a.id !== res.account!.id), res.account!]);
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
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (activeAccountId === id) {
      const remaining = accounts.filter((a) => a.id !== id);
      setActiveAccountId(remaining.length > 0 ? remaining[0].id : null);
    }
    addLog('WARN', 'launcher', `Cuenta eliminada: ID ${id}`);
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
    if (!activeAccountId) return;

    if (window.electronAPI) {
      addLog('INFO', 'launcher', `Iniciando sincronización real con el VPS para ${activeAccount?.username}...`);
      const res = await window.electronAPI.launchGame({ accountId: activeAccountId });
      if (!res.success) {
        addLog('ERROR', 'launcher', `Error en el proceso: ${res.error}`);
      }
    } else {
      // Simulación exclusiva para navegador web (cuando window.electronAPI no existe)
      addLog('INFO', 'launcher', '=== MODO VISTA PREVIA WEB (Sin Electron Backend) ===');
      const steps: Array<{ step: DownloadProgress['step']; title: string; detail: string; percentage: number; delay: number }> = [
        { step: 'fetching_manifest', title: 'Consultando Manifiesto', detail: 'Descargando manifest.json desde el VPS CDN...', percentage: 10, delay: 800 },
        { step: 'verifying', title: 'Verificando Integridad', detail: 'Comprobando 2,122 archivos con hashes SHA-256...', percentage: 35, delay: 1200 },
        { step: 'syncing_files', title: 'Sincronizando Modpack', detail: 'Descargando mods/Cobblemon-neoforge-1.6.1+1.21.1.jar (45.8 MB)...', percentage: 70, delay: 1800 },
        { step: 'installing_forge', title: 'Instalando NeoForge', detail: 'Ejecutando procesadores de NeoForge 21.1.265...', percentage: 90, delay: 1200 },
        { step: 'running', title: 'Instancia Sincronizada', detail: 'Cobblemon Realms listo para jugar.', percentage: 100, delay: 1000 },
      ];

      for (const s of steps) {
        setProgress({
          step: s.step,
          title: s.title,
          detail: s.detail,
          percentage: s.percentage,
          completedFiles: Math.round((s.percentage / 100) * 2122),
          totalFiles: 2122,
          speedBytesPerSec: 15400000,
          etaSeconds: Math.max(1, Math.round((100 - s.percentage) / 25))
        });
        addLog('INFO', 'launcher', `${s.title}: ${s.detail}`);
        await new Promise((r) => setTimeout(r, s.delay));
      }

      setTimeout(() => {
        setProgress(null);
      }, 3500);
    }
  };

  const handleAbort = async () => {
    if (window.electronAPI) {
      await window.electronAPI.abortLaunch();
    }
    setProgress(null);
    addLog('WARN', 'launcher', 'Operación cancelada por el usuario.');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-slate-100 overflow-hidden">
      <TopBar
        serverOnline={serverStatus?.online}
        serverPing={serverStatus?.ping}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeAccount={activeAccount}
        />

        <main className="flex-1 bg-gradient-to-b from-canvas via-canvas to-slate-950 overflow-hidden">
          {activeTab === 'home' && (
            <HomePage
              activeAccount={activeAccount}
              serverStatus={serverStatus}
              manifest={manifest}
              settings={settings}
              progress={progress}
              onLaunch={handleLaunch}
              onAbort={handleAbort}
              onSelectAccount={() => setActiveTab('accounts')}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsPage
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={handleSelectAccount}
              onAddOfflineAccount={handleAddOfflineAccount}
              onLoginMicrosoft={handleLoginMicrosoft}
              onDeleteAccount={handleDeleteAccount}
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
        </main>
      </div>
    </div>
  );
};

export default App;
