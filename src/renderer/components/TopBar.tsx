import React from 'react';
import { Minus, Square, X, Sparkles } from 'lucide-react';
import { APP_CONFIG } from '../../shared/config';

interface TopBarProps {
  serverPing?: number;
  serverOnline?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ serverPing, serverOnline }) => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header className="h-10 bg-canvas-card border-b border-canvas-border flex items-center justify-between px-3 window-drag-region z-50 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-2.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cobble-red via-red-600 to-rose-700 flex items-center justify-center shadow-glow-red">
          <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-900 shadow-sm" />
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="font-extrabold text-xs tracking-wider text-white uppercase">Cobblemon</span>
          <span className="text-xs font-semibold text-cobble-cyan tracking-wider uppercase">Realms</span>
        </div>
        <span className="text-[10px] bg-canvas-border px-1.5 py-0.5 rounded text-slate-400 font-mono">
          v{APP_CONFIG.APP_VERSION}
        </span>
      </div>

      {/* Center Server Status Quick Indicator */}
      <div className="hidden md:flex items-center space-x-2 bg-canvas/80 px-2.5 py-0.5 rounded-full border border-canvas-border text-[11px]">
        <div className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-cobble-emerald animate-pulse' : 'bg-rose-500'}`} />
        <span className="text-slate-300 font-medium">{APP_CONFIG.SERVER.NAME}</span>
        {serverPing !== undefined && (
          <span className="text-slate-500 font-mono">({serverPing}ms)</span>
        )}
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1 window-no-drag">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-canvas-elevated transition-colors"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-canvas-elevated transition-colors"
          title="Maximizar"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
