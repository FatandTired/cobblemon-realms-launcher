import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  ArrowDownCircle,
  PlayCircle
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../shared/types';

interface ConsolePageProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ConsolePage: React.FC<ConsolePageProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      return log.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'INFO':
        return 'text-cobble-cyan';
      case 'WARN':
        return 'text-amber-400';
      case 'ERROR':
        return 'text-rose-400 font-bold';
      case 'DEBUG':
        return 'text-purple-400';
      case 'MINECRAFT':
        return 'text-cobble-emerald';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden space-y-4">
      {/* Console Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-canvas-card border border-canvas-border rounded-xl p-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cobble-cyan" />
          <h2 className="text-sm font-bold text-white">Consola de Salida en Vivo</h2>
          <span className="text-[10px] font-mono bg-canvas px-2 py-0.5 rounded text-slate-400 border border-canvas-border">
            {filteredLogs.length} líneas
          </span>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-canvas border border-canvas-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cobble-cyan w-40 md:w-48 font-mono"
            />
          </div>

          {/* Level Filter Dropdown */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-canvas border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-cobble-cyan"
          >
            <option value="ALL">Todos los Niveles</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="MINECRAFT">MINECRAFT</option>
            <option value="DEBUG">DEBUG</option>
          </select>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
              autoScroll
                ? 'bg-cobble-cyan/20 border-cobble-cyan/40 text-cobble-cyan'
                : 'bg-canvas border-canvas-border text-slate-400'
            }`}
            title="Auto-scroll"
          >
            <ArrowDownCircle className="w-4 h-4" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-canvas hover:bg-slate-700 border border-canvas-border text-slate-300 transition-colors"
            title="Copiar Logs al Portapapeles"
          >
            {copied ? <Check className="w-4 h-4 text-cobble-emerald" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg bg-canvas hover:bg-rose-500/20 border border-canvas-border text-slate-400 hover:text-rose-400 transition-colors"
            title="Limpiar Consola"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 bg-black/90 rounded-xl border border-canvas-border p-4 font-mono text-xs overflow-y-auto space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            No hay registros de consola para mostrar.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 leading-relaxed hover:bg-white/[0.02] px-1 rounded">
              <span className="text-slate-500 select-none shrink-0 font-mono text-[11px]">
                [{log.timestamp}]
              </span>
              <span
                className={`text-[10px] uppercase font-bold shrink-0 px-1 py-0.2 rounded ${getLevelColor(
                  log.level
                )}`}
              >
                [{log.level}]
              </span>
              <span className="text-slate-400 select-none shrink-0 text-[10px]">
                ({log.source}):
              </span>
              <span className="text-slate-200 break-all whitespace-pre-wrap">{log.message}</span>
            </div>
          ))
        )}
        <div ref={consoleBottomRef} />
      </div>
    </div>
  );
};
