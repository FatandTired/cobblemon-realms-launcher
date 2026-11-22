import React from 'react';
import { Home, Settings, Terminal, ShieldCheck, User } from 'lucide-react';
import { Account } from '../../shared/types';

export type TabType = 'home' | 'settings' | 'console';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeAccount: Account | null;
  onOpenAccountModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeAccount,
  onOpenAccountModal
}) => {
  const navItems = [
    { id: 'home' as TabType, label: 'Inicio', icon: Home },
    { id: 'settings' as TabType, label: 'Ajustes', icon: Settings },
    { id: 'console' as TabType, label: 'Consola', icon: Terminal },
  ];

  return (
    <aside className="w-60 bg-canvas-card border-r border-canvas-border flex flex-col justify-between select-none">
      {/* Navigation Buttons */}
      <div className="p-3 space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navegación
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-canvas-elevated'
              }`}
            style={isActive ? {
              background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
              boxShadow: '0 0 14px -2px var(--theme-glow)',
            } : {}}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Account Widget at Bottom */}
      <div className="p-3 border-t border-canvas-border bg-canvas/40">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Perfil Activo
          </span>
          <button
            onClick={onOpenAccountModal}
            className="text-[10px] text-cobble-cyan hover:underline font-medium cursor-pointer"
          >
            Cambiar
          </button>
        </div>
        {activeAccount ? (
          <div
            onClick={onOpenAccountModal}
            className="flex items-center space-x-3 p-2 rounded-lg bg-canvas-card border border-canvas-border hover:border-cobble-cyan/60 hover:bg-canvas-elevated transition-all cursor-pointer group"
            title="Haz clic para cambiar de cuenta"
          >
            <div className="relative">
              <img
                src={activeAccount.avatarUrl}
                alt={activeAccount.username}
                className="w-9 h-9 rounded bg-slate-800 border border-slate-700 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/100';
                }}
              />
              <div
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  activeAccount.type === 'microsoft'
                    ? 'bg-cobble-emerald text-slate-950'
                    : 'bg-slate-600 text-slate-100'
                }`}
                title={activeAccount.type === 'microsoft' ? 'Cuenta Premium Microsoft' : 'Cuenta No-Premium'}
              >
                {activeAccount.type === 'microsoft' ? 'P' : 'O'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-cobble-cyan transition-colors">
                {activeAccount.username}
              </div>
              <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                {activeAccount.type === 'microsoft' ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-cobble-emerald inline" />
                    <span>Microsoft</span>
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-slate-400 inline" />
                    <span>No-Premium</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAccountModal}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-700 text-xs text-slate-400 hover:text-white hover:border-cobble-cyan transition-colors text-center cursor-pointer"
          >
            + Seleccionar Cuenta
          </button>
        )}
      </div>
    </aside>
  );
};
