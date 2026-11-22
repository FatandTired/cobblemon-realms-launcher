import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  CheckCircle,
  ExternalLink,
  Sparkles,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { Account, AccountType } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

interface AccountsPageProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onAddOfflineAccount: (username: string) => Promise<void>;
  onLoginMicrosoft: () => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddOfflineAccount,
  onLoginMicrosoft,
  onDeleteAccount
}) => {
  const [offlineName, setOfflineName] = useState('');
  const [activeTab, setActiveTab] = useState<AccountType>('offline');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validación de nombre offline (3-16 caracteres, alfanumérico y guión bajo)
  const isValidUsername = /^[a-zA-Z0-9_]{3,16}$/.test(offlineName.trim());

  const handleAddOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername) {
      setErrorMsg('El nombre debe tener entre 3 y 16 caracteres alfanuméricos (letras, números y _).');
      return;
    }
    setErrorMsg(null);
    setIsAdding(true);
    try {
      await onAddOfflineAccount(offlineName.trim());
      setOfflineName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar la cuenta.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setErrorMsg(null);
    setIsAdding(true);
    try {
      await onLoginMicrosoft();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión con Microsoft.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cobble-cyan" />
          Gestión de Cuentas y Perfiles
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configura tus perfiles para ingresar al servidor. Soporte para cuentas Premium oficiales de Microsoft y No-Premium (Offline).
        </p>
      </div>

      {/* Main Layout: Add Account Card & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add Account Form */}
        <div className="lg:col-span-5 bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-4">
          <div className="flex border-b border-canvas-border pb-3">
            <button
              onClick={() => setActiveTab('offline')}
              className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'offline'
                  ? 'border-cobble-cyan text-cobble-cyan'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              No-Premium (Offline)
            </button>
            <button
              onClick={() => setActiveTab('microsoft')}
              className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'microsoft'
                  ? 'border-cobble-red text-cobble-red'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Premium (Microsoft)
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'offline' ? (
            <form onSubmit={handleAddOffline} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    placeholder="Ej. Red_Trainer"
                    maxLength={16}
                    className="w-full bg-canvas border border-canvas-border focus:border-cobble-cyan rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                  {offlineName && (
                    <div className="absolute right-3 top-2.5">
                      {isValidUsername ? (
                        <CheckCircle className="w-4 h-4 text-cobble-emerald" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Entre 3 y 16 caracteres alfanuméricos y guión bajo.
                </p>
              </div>

              {/* Avatar Preview */}
              <div className="bg-canvas p-3 rounded-lg border border-canvas-border flex items-center space-x-3">
                <img
                  src={
                    isValidUsername
                      ? `https://mc-heads.net/avatar/${offlineName}/100`
                      : 'https://mc-heads.net/avatar/Steve/100'
                  }
                  alt="Avatar Preview"
                  className="w-12 h-12 rounded bg-slate-800 border border-slate-700 object-cover"
                />
                <div className="text-xs">
                  <div className="text-slate-400">Previsualización de Skin</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {isValidUsername ? offlineName : 'Steve'}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isValidUsername || isAdding}
                className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                  isValidUsername && !isAdding
                    ? 'bg-gradient-to-r from-cobble-cyan to-blue-600 text-white hover:brightness-110 shadow-glow-cyan'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isAdding ? 'Agregando...' : 'Agregar Cuenta No-Premium'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-canvas p-3 rounded-lg border border-canvas-border text-xs text-slate-300 space-y-2">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <KeyRound className="w-4 h-4 text-cobble-red" />
                  <span>Autenticación Oficial de Microsoft</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Inicia sesión de forma segura a través de los servidores de Microsoft / Xbox Live para usar tu cuenta Premium con tu skin y capa oficial.
                </p>
                <div className="text-[10px] text-slate-500 bg-canvas-card p-2 rounded border border-canvas-border font-mono">
                  AZURE_CLIENT_ID: {APP_CONFIG.AUTH.AZURE_CLIENT_ID.substring(0, 8)}... (Configurable)
                </div>
              </div>

              <button
                onClick={handleMicrosoftLogin}
                disabled={isAdding}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 bg-gradient-to-r from-cobble-red to-rose-600 text-white hover:brightness-110 shadow-glow-red transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdding ? 'Conectando...' : 'Iniciar Sesión con Microsoft'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Saved Accounts List */}
        <div className="lg:col-span-7 bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-3">
              Cuentas Registradas ({accounts.length})
            </h3>

            {accounts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-canvas-border rounded-lg">
                No hay cuentas guardadas. Agrega una cuenta para comenzar.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const isActive = acc.id === activeAccountId;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-canvas-elevated border-cobble-cyan shadow-glow-cyan'
                          : 'bg-canvas/60 border-canvas-border hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={acc.avatarUrl}
                          alt={acc.username}
                          className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white truncate">
                              {acc.username}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cobble-cyan/20 text-cobble-cyan border border-cobble-cyan/30">
                                Activa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            {acc.type === 'microsoft' ? (
                              <span className="text-cobble-emerald flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 inline" /> Premium
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <User className="w-3 h-3 inline" /> No-Premium
                              </span>
                            )}
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-500 truncate">
                              {acc.uuid ? acc.uuid.substring(0, 18) + '...' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!isActive && (
                          <button
                            onClick={() => onSelectAccount(acc.id)}
                            className="px-3 py-1.5 rounded-lg bg-canvas text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 border border-canvas-border transition-colors"
                          >
                            Seleccionar
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteAccount(acc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar Cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
