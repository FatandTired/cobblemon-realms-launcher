import React from 'react';
import { EnergyType } from '../../data/pokemonCards';

interface EnergyIconProps {
  type: EnergyType;
  size?: number;
  className?: string;
}

export const EnergyIcon: React.FC<EnergyIconProps> = ({
  type,
  size = 14,
  className = '',
}) => {
  const getStyle = () => {
    switch (type) {
      case 'fire':
        return {
          bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          border: '#fca5a5',
          symbol: (
            <path
              d="M7 2c0 2.5-2 3.5-2 6 0 2.2 1.8 4 4 4s4-1.8 4-4c0-2-1.5-3.5-2-5-.5 1.5-1.5 2.5-2 2.5S7.5 4 7 2z"
              fill="#ffffff"
            />
          ),
        };
      case 'water':
        return {
          bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
          border: '#7dd3fc',
          symbol: (
            <path
              d="M7 2s-3.5 4.5-3.5 6.5C3.5 10.4 5.1 12 7 12s3.5-1.6 3.5-3.5C10.5 6.5 7 2 7 2z"
              fill="#ffffff"
            />
          ),
        };
      case 'psychic':
        return {
          bg: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
          border: '#d8b4fe',
          symbol: (
            <g fill="#ffffff">
              <circle cx="7" cy="7" r="2.5" />
              <path d="M7 3.5c-2.5 0-4.5 1.8-5 3.5 0.5 1.7 2.5 3.5 5 3.5s4.5-1.8 5-3.5c-0.5-1.7-2.5-3.5-5-3.5zm0 5.5c-1.1 0-2-0.9-2-2s0.9-2 2-2 2 0.9 2 2-0.9 2-2 2z" />
            </g>
          ),
        };
      case 'grass':
        return {
          bg: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
          border: '#86efac',
          symbol: (
            <path
              d="M10.5 3.5C7.5 3.5 4 5 4 8c0 2.5 2 3.5 4 3.5 3 0 4.5-3.5 4.5-6.5 0-.8-.7-1.5-2-1.5z"
              fill="#ffffff"
            />
          ),
        };
      case 'lightning':
        return {
          bg: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
          border: '#fde047',
          symbol: (
            <path
              d="M7.5 2L4 7.5h3L6 12l4.5-6h-3L8.5 2z"
              fill="#ffffff"
            />
          ),
        };
      case 'darkness':
        return {
          bg: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
          border: '#94a3b8',
          symbol: (
            <path
              d="M8.5 3.5C6.5 4 5 5.8 5 8c0 2.8 2.2 5 5 5 .7 0 1.4-.1 2-.4-1.2.6-2.6.5-3.7-.5-1.2-1.1-1.6-2.9-1-4.4.4-1.1 1.2-2.1 2.2-2.7-.3-.3-.7-.4-1-.5z"
              fill="#ffffff"
            />
          ),
        };
      case 'fighting':
        return {
          bg: 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
          border: '#fdba74',
          symbol: (
            <path
              d="M5 4h4v6H5z M4 6h6v3H4z"
              fill="#ffffff"
            />
          ),
        };
      case 'colorless':
      default:
        return {
          bg: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
          border: '#cbd5e1',
          symbol: (
            <circle cx="7" cy="7" r="3" fill="#ffffff" />
          ),
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        background: style.bg,
        border: `1px solid ${style.border}80`,
      }}
      title={`Energía ${type.toUpperCase()}`}
    >
      <svg
        viewBox="0 0 14 14"
        style={{ width: size * 0.75, height: size * 0.75 }}
      >
        {style.symbol}
      </svg>
    </div>
  );
};
