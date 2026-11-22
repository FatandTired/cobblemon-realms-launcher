import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Sparkles,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import { Account } from '../../shared/types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onAddOfflineAccount: (username: string) => Promise<void>;
  onLoginMicrosoft: () => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddOfflineAccount,
  onLoginMicrosoft,
  onDeleteAccount
}) => {
  const [offlineName, setOfflineName] = useState('');
  const [isEditingOffline, setIsEditingOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cerrar modal al presionar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtrar cuentas: máximo 1 premium y 1 no-premium
  const premiumAccount = accounts.find((a) => a.type === 'microsoft');
  const offlineAccount = accounts.find((a) => a.type === 'offline');

  const isValidOfflineName = /^[a-zA-Z0-9_]{3,16}$/.test(offlineName.trim());

  const handleSaveOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOfflineName) {
      setErrorMsg('El nombre debe tener entre 3 y 16 caracteres alfanuméricos (letras, números y _).');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onAddOfflineAccount(offlineName.trim());
      setOfflineName('');
      setIsEditingOffline(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onLoginMicrosoft();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión con Microsoft.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onDeleteAccount(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar la cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas-card border border-canvas-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-canvas-border bg-canvas/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cobble-red/15 border border-cobble-red/30 flex items-center justify-center text-cobble-red">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestión de Perfiles</h2>
              <p className="text-xs text-slate-400">
                Selecciona tu perfil activo. Solo se permite 1 cuenta Premium y 1 No-Premium.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-canvas-elevated transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Slot 1: Cuenta Premium (Microsoft) */}
          <div className="bg-canvas/60 border border-canvas-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-cobble-emerald" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cuenta Premium Oficial (Microsoft)
                </span>
              </div>
              {premiumAccount && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cobble-emerald/15 text-cobble-emerald border border-cobble-emerald/30">
                  Verificada
                </span>
              )}
            </div>

            {premiumAccount ? (
              <div className="flex items-center justify-between bg-canvas-card p-3 rounded-lg border border-canvas-border">
                <div
                  onClick={() => onSelectAccount(premiumAccount.id)}
                  className="flex items-center space-x-3 cursor-pointer group flex-1 min-w-0"
                >
                  <img
                    src={premiumAccount.avatarUrl}
                    alt={premiumAccount.username}
                    className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white group-hover:text-cobble-cyan transition-colors truncate">
                        {premiumAccount.username}
                      </span>
                      {activeAccountId === premiumAccount.id && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cobble-cyan/20 text-cobble-cyan border border-cobble-cyan/30">
                          Activa
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      UUID: {premiumAccount.uuid.substring(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeAccountId !== premiumAccount.id && (
                    <button
                      onClick={() => onSelectAccount(premiumAccount.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-cobble-cyan/15 text-cobble-cyan hover:bg-cobble-cyan/25 text-xs font-semibold transition-colors"
                    >
                      Seleccionar
                    </button>
                  )}
                  <button
                    onClick={handleMicrosoftLogin}
                    disabled={isLoading}
                    title="Cambiar a otra cuenta de Microsoft"
                    className="p-1.5 rounded-lg bg-canvas text-slate-400 hover:text-white hover:bg-canvas-elevated border border-canvas-border transition-colors text-xs"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(premiumAccount.id)}
                    disabled={isLoading}
                    title="Cerrar sesión y eliminar"
                    className="p-1.5 rounded-lg bg-canvas text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-canvas-border transition-colors text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conecta tu cuenta de Minecraft oficial para sincronizar tu skin y capa originales sin restricciones.
                </p>
                <button
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 bg-gradient-to-r from-cobble-red to-rose-600 text-white hover:brightness-110 shadow-glow-red transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando con Microsoft...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Iniciar Sesión con Microsoft</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Slot 2: Cuenta No-Premium (Offline) */}
          <div className="bg-canvas/60 border border-canvas-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-cobble-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cuenta No-Premium (Offline)
                </span>
              </div>
              {offlineAccount && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  Local
                </span>
              )}
            </div>

            {offlineAccount && !isEditingOffline ? (
              <div className="flex items-center justify-between bg-canvas-card p-3 rounded-lg border border-canvas-border">
                <div
                  onClick={() => onSelectAccount(offlineAccount.id)}
                  className="flex items-center space-x-3 cursor-pointer group flex-1 min-w-0"
                >
                  <img
                    src={offlineAccount.avatarUrl}
                    alt={offlineAccount.username}
                    className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white group-hover:text-cobble-cyan transition-colors truncate">
                        {offlineAccount.username}
                      </span>
                      {activeAccountId === offlineAccount.id && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cobble-cyan/20 text-cobble-cyan border border-cobble-cyan/30">
                          Activa
                        </span>
                      )}
                      {offlineAccount.id === 'offline-trainer-1' && (
                        <span className="text-[10px] text-amber-400 italic">
                          (Ejemplo)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      UUID v3: {offlineAccount.uuid.substring(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeAccountId !== offlineAccount.id && (
                    <button
                      onClick={() => onSelectAccount(offlineAccount.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-cobble-cyan/15 text-cobble-cyan hover:bg-cobble-cyan/25 text-xs font-semibold transition-colors"
                    >
                      Seleccionar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOfflineName(offlineAccount.username);
                      setIsEditingOffline(true);
                    }}
                    title="Cambiar nombre de usuario"
                    className="p-1.5 rounded-lg bg-canvas text-slate-400 hover:text-white hover:bg-canvas-elevated border border-canvas-border transition-colors text-xs"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(offlineAccount.id)}
                    disabled={isLoading}
                    title="Eliminar cuenta No-Premium"
                    className="p-1.5 rounded-lg bg-canvas text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-canvas-border transition-colors text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveOffline} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {offlineAccount ? 'Cambiar Nombre de Usuario' : 'Nuevo Nombre de Usuario'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={offlineName}
                      onChange={(e) => setOfflineName(e.target.value)}
                      placeholder="Ej. Red_Trainer"
                      maxLength={16}
                      className="w-full bg-canvas border border-canvas-border focus:border-cobble-cyan rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                    {offlineName && (
                      <div className="absolute right-3 top-2.5">
                        {isValidOfflineName ? (
                          <CheckCircle className="w-3.5 h-3.5 text-cobble-emerald" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    3 a 16 caracteres alfanuméricos y guión bajo.
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={!isValidOfflineName || isLoading}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                      isValidOfflineName && !isLoading
                        ? 'bg-gradient-to-r from-cobble-cyan to-blue-600 text-white hover:brightness-110 shadow-glow-cyan cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{offlineAccount ? 'Actualizar No-Premium' : 'Crear Cuenta No-Premium'}</span>
                  </button>
                  {isEditingOffline && (
                    <button
                      type="button"
                      onClick={() => setIsEditingOffline(false)}
                      className="px-3 py-2 rounded-lg bg-canvas text-xs text-slate-400 hover:text-white border border-canvas-border transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-canvas-border bg-canvas/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-canvas-elevated hover:bg-slate-700 text-xs font-semibold text-white border border-canvas-border transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
