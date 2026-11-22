import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { PokemonCard } from '../../data/pokemonCards';

interface PokemonHoloCardProps {
  card: PokemonCard;
  isGameRunning?: boolean;
  onFlip?: () => void;
}

// Proporciones TCG: 2.5 : 3.5 → width=240, height=336
const CARD_W = 240;
const CARD_H = 336;

export const PokemonHoloCard: React.FC<PokemonHoloCardProps> = ({
  card,
  isGameRunning = false,
  onFlip,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Motion values para tilt 3D
  const rawX = useMotionValue(0); // rotateY
  const rawY = useMotionValue(0); // rotateX

  // Springs suaves — sin re-renders por frame
  const rotateX = useSpring(rawY, { stiffness: 260, damping: 22 });
  const rotateY = useSpring(rawX, { stiffness: 260, damping: 22 });

  // Holo glare position
  const glareX = useTransform(rawX, [-20, 20], ['0%', '100%']);
  const glareY = useTransform(rawY, [-20, 20], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGameRunning || isFlipped) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rawX.set(dx * 18);
    rawY.set(-dy * 18);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const handleClick = () => {
    setIsFlipped((f) => !f);
    onFlip?.();
  };

  const flipRotateY = isFlipped ? 180 : 0;

  return (
    <div
      ref={containerRef}
      style={{ perspective: '1200px', width: CARD_W, height: CARD_H, cursor: 'pointer' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title="Haz clic para girar la carta"
    >
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          rotateX: isFlipped ? 0 : rotateX,
          rotateY: isFlipped ? flipRotateY : rotateY,
          borderRadius: 16,
        }}
        animate={{ rotateY: flipRotateY }}
        transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      >
        {/* ——— FRENTE ——— */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            overflow: 'visible',
            background: card.typeGradient,
            boxShadow: `0 0 60px -10px ${card.theme.glow}, 0 24px 48px -12px rgba(0,0,0,0.9), inset 0 0 0 1.5px rgba(255,255,255,0.08)`,
          }}
        >
          {/* Marco exterior con borde holográfico */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16,
              border: `2px solid transparent`,
              background: `linear-gradient(135deg, ${card.theme.primary}80, transparent 40%, ${card.theme.secondary}60) border-box`,
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'destination-out',
              maskComposite: 'exclude',
              pointerEvents: 'none',
            }}
          />

          {/* Header: nombre + número */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '14px 14px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.03em',
                  textShadow: `0 0 20px ${card.theme.glow}`,
                  lineHeight: 1,
                }}
              >
                {card.name.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {card.types.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      background: `${card.theme.primary}30`,
                      color: card.theme.primary,
                      border: `1px solid ${card.theme.primary}60`,
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: `${card.theme.secondary}`,
                fontFamily: 'monospace',
                opacity: 0.8,
              }}
            >
              {card.number}
            </div>
          </div>

          {/* Artwork PNG — sobresale en 3D */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 72,
              left: '50%',
              translateX: '-50%',
              width: 180,
              height: 180,
              zIndex: 20,
              pointerEvents: 'none',
              translateZ: 55,
              filter: `drop-shadow(0 8px 24px ${card.theme.glow}) drop-shadow(0 0 12px ${card.theme.secondary}80)`,
            }}
          >
            <img
              src={card.artworkUrl}
              alt={card.name}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          </motion.div>

          {/* Holo foil — capa iridiscente */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16,
              zIndex: 15,
              pointerEvents: 'none',
              opacity: isGameRunning ? 0 : 0.35,
              background: `radial-gradient(ellipse at ${glareX} ${glareY}, rgba(255,255,255,0.18) 0%, rgba(255,120,80,0.08) 25%, rgba(80,80,255,0.08) 50%, transparent 70%)`,
              mixBlendMode: 'screen',
              transition: 'opacity 0.4s ease',
            }}
          />

          {/* Specular glare */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16,
              zIndex: 16,
              pointerEvents: 'none',
              opacity: isGameRunning ? 0 : 0.6,
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.12) 0%, transparent 50%)`,
              transition: 'opacity 0.4s ease',
            }}
          />

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '10px 14px',
              zIndex: 10,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }}
          >
            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: `${card.theme.primary}cc`,
                textAlign: 'center',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              {card.rarity}
            </div>
            <div
              style={{
                fontSize: 7,
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'center',
                letterSpacing: '0.08em',
              }}
            >
              COBBLEMON REALMS • MC 1.21.1
            </div>
          </div>
        </div>

        {/* ——— REVERSO ——— */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #0d0d1a 0%, #111827 100%)',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.9)',
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '2px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Pokébola decorativa */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              border: `3px solid ${card.theme.primary}60`,
              boxShadow: `0 0 40px ${card.theme.glow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle, ${card.theme.soft} 0%, transparent 70%)`,
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>⚽</div>
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.08em',
              textAlign: 'center',
            }}
          >
            COBBLEMON REALMS
          </div>
          <div
            style={{
              fontSize: 9,
              color: `${card.theme.primary}99`,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Haz clic para voltear
          </div>
        </div>
      </motion.div>
    </div>
  );
};
