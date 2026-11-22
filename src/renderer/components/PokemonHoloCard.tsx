import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { PokemonCard } from '../../data/pokemonCards';
import { EnergyIcon } from './EnergyIcon';

interface PokemonHoloCardProps {
  card: PokemonCard;
  isGameRunning?: boolean;
}

const SparkleStar: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <div className="w-full h-full relative flex items-center justify-center filter drop-shadow-[0_0_6px_rgba(255,255,255,0.95)]">
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
      <path
        d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z"
        fill={color}
      />
      <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
    </svg>
  </div>
);

export const PokemonHoloCard: React.FC<PokemonHoloCardProps> = ({
  card,
  isGameRunning = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Determina si este Pokémon es icónico para aplicarle bordes holográficos TCG
  const hasHoloBorder = Boolean(card.isIconic ?? card.isEx);

  // Motion values para tilt 3D (grados)
  const rawX = useMotionValue(0); // rotateY (-16 a 16)
  const rawY = useMotionValue(0); // rotateX (-16 a 16)

  // Springs suaves de 60+ FPS sin re-renders por frame
  const rotateX = useSpring(rawY, { stiffness: 280, damping: 24 });
  const rotateY = useSpring(rawX, { stiffness: 280, damping: 24 });

  // CSS variables para los shaders holográficos y reflejo especular
  const pointerX = useTransform(rawX, [-16, 16], ['15%', '85%']);
  const pointerY = useTransform(rawY, [-16, 16], ['85%', '15%']);
  const glareOpacity = useTransform(rawX, (val) =>
    isHovered && !isGameRunning ? Math.min(0.75, 0.35 + Math.abs(val) / 20) : 0.2
  );

  // Sombra 3D dinámica proyectada por el Pokémon
  const shadowX = useTransform(rawX, [-16, 16], [12, -12]);
  const shadowY = useTransform(rawY, [-16, 16], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGameRunning) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rawX.set(Math.max(-16, Math.min(16, dx * 16)));
    rawY.set(Math.max(-16, Math.min(16, -dy * 16)));
  };

  const handleMouseEnter = () => {
    if (!isGameRunning) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rawX.set(0);
    rawY.set(0);
  };

  // Marco metálico según rareza
  const isGoldBorder = card.rarity === 'hyper-rare';
  const metallicBorder = isGoldBorder
    ? 'linear-gradient(135deg, #fef08a 0%, #ca8a04 22%, #fef9c3 45%, #854d0e 70%, #eab308 88%, #fef08a 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #94a3b8 20%, #f1f5f9 45%, #475569 70%, #cbd5e1 88%, #ffffff 100%)';

  return (
    <div
      ref={containerRef}
      className="relative select-none flex-shrink-0"
      style={{
        perspective: '1300px',
        height: 'clamp(430px, 63vh, 495px)',
        width: 'calc(clamp(430px, 63vh, 495px) * 0.71428)',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY,
          borderRadius: 20,
        }}
      >
        {/* ============================================================== */}
        {/* CARA FRONTAL FULL ART / EX                                     */}
        {/* ============================================================== */}
        <div
          className="absolute inset-0 rounded-[20px] overflow-hidden"
          style={{
            background: '#0a0d16',
            boxShadow: hasHoloBorder
              ? `0 0 75px -6px ${card.theme.glow}, 0 28px 50px -15px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.2)`
              : `0 0 65px -10px ${card.theme.glow}, 0 28px 50px -15px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.15)`,
          }}
        >
          {/* MARCO METÁLICO BISELADO BASE */}
          <div
            className="absolute inset-0 rounded-[20px] pointer-events-none z-30"
            style={{
              padding: '7px',
              background: metallicBorder,
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'destination-out',
              maskComposite: 'exclude',
              boxShadow: isGoldBorder
                ? 'inset 0 0 14px rgba(234,179,8,0.5)'
                : 'inset 0 0 12px rgba(255,255,255,0.4)',
            }}
          />

          {/* 1. PRISMA HOLOGRÁFICO EN EL MARCO (POKÉMON ICÓNICOS) */}
          {hasHoloBorder && (
            <div
              className="absolute inset-0 rounded-[20px] pointer-events-none z-30 animate-border-holo"
              style={{
                padding: '7px',
                background: isGoldBorder
                  ? 'linear-gradient(115deg, #fef08a 0%, #f59e0b 20%, #ec4899 40%, #8b5cf6 60%, #06b6d4 80%, #fef08a 100%)'
                  : 'linear-gradient(115deg, #ff0080 0%, #ff8c00 16%, #facc15 32%, #40e0d0 48%, #7c3aed 64%, #00f5a0 80%, #ff0080 100%)',
                backgroundSize: '280% 280%',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
                mixBlendMode: 'color-dodge',
                opacity: isHovered ? 0.85 : 0.65,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* 2. BARRIDO DE LUZ METÁLICO CONTINUO POR EL MARCO */}
          {hasHoloBorder && (
            <div
              className="absolute inset-0 rounded-[20px] pointer-events-none z-30 animate-holo-continuous"
              style={{
                padding: '7px',
                background:
                  'linear-gradient(125deg, transparent 25%, rgba(255,255,255,0.4) 42%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.4) 58%, transparent 75%)',
                backgroundSize: '240% 240%',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
                mixBlendMode: 'screen',
                opacity: isHovered ? 0.9 : 0.55,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* 3. REFLEJO REACTIVO AL TILT 3D DEL CURSOR EN EL BORDE */}
          {hasHoloBorder && (
            <motion.div
              className="absolute inset-0 rounded-[20px] pointer-events-none z-30"
              style={{
                padding: '7px',
                background: `radial-gradient(circle at ${pointerX.get()} ${pointerY.get()}, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.45) 25%, transparent 65%)`,
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
                mixBlendMode: 'overlay',
                opacity: isHovered ? 0.9 : 0.5,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* INNER BEVEL LINE */}
          <div
            className="absolute inset-[6px] rounded-[15px] border pointer-events-none z-30"
            style={{
              borderColor: isGoldBorder
                ? 'rgba(254,240,138,0.7)'
                : hasHoloBorder
                ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.3)',
              boxShadow: hasHoloBorder
                ? isGoldBorder
                  ? '0 0 10px rgba(234,179,8,0.5), inset 0 0 8px rgba(234,179,8,0.4)'
                  : `0 0 8px ${card.theme.glow}, inset 0 0 6px rgba(255,255,255,0.4)`
                : undefined,
            }}
          />

          {/* 4. CHISPAS Y ESTRELLAS HOLOGRÁFICAS EN EL BORDE (POKÉMON ICÓNICOS) */}
          {hasHoloBorder && (
            <div className="absolute inset-0 rounded-[20px] pointer-events-none z-35 overflow-hidden">
              {/* Esquina superior izquierda */}
              <div className="absolute top-[3px] left-[5px] w-3 h-3 animate-holo-twinkle-1">
                <SparkleStar color={isGoldBorder ? '#fde047' : '#ffffff'} />
              </div>
              {/* Esquina superior derecha */}
              <div className="absolute top-[4px] right-[6px] w-3.5 h-3.5 animate-holo-twinkle-2">
                <SparkleStar color={card.theme.primary} />
              </div>
              {/* Borde lateral izquierdo */}
              <div className="absolute top-[48%] left-[1.5px] w-2.5 h-2.5 animate-holo-twinkle-3">
                <SparkleStar color={isGoldBorder ? '#fef08a' : '#38bdf8'} />
              </div>
              {/* Borde lateral derecho */}
              <div className="absolute top-[36%] right-[1.5px] w-3 h-3 animate-holo-twinkle-4">
                <SparkleStar color={card.theme.secondary} />
              </div>
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-[4px] left-[5px] w-3 h-3 animate-holo-twinkle-5">
                <SparkleStar color={isGoldBorder ? '#fef08a' : '#f472b6'} />
              </div>
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-[3px] right-[5px] w-3.5 h-3.5 animate-holo-twinkle-1">
                <SparkleStar color={isGoldBorder ? '#fde047' : '#ffffff'} />
              </div>
            </div>
          )}

          {/* FONDO FULL ART ELEMENTAL ILUSTRADO */}
          <div
            className="absolute inset-0 z-0"
            style={{ background: card.typeGradient }}
          >
            {/* Action lines diagonales sutiles */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(60deg, transparent 0, transparent 18px, rgba(255,255,255,0.12) 18px, rgba(255,255,255,0.12) 20px)',
              }}
            />

            {/* Aura elemental central detrás del Pokémon */}
            <div
              className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[90%] h-[50%] rounded-full blur-2xl opacity-60 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${card.theme.primary} 0%, ${card.theme.secondary} 40%, transparent 75%)`,
              }}
            />
          </div>

          {/* ============================================================== */}
          {/* POKÉMON EN CAPA 3D — CENTRADO Y LIGERAMENTE AGRANDADO         */}
          {/* ============================================================== */}
          <motion.div
            className="absolute top-[42px] bottom-[180px] left-2 right-2 z-10 pointer-events-none flex items-center justify-center overflow-visible"
            style={{
              transform: 'translateZ(26px)',
              filter: `drop-shadow(${shadowX.get()}px ${shadowY.get()}px 16px rgba(0,0,0,0.85)) drop-shadow(0 0 14px ${card.theme.glow})`,
            }}
          >
            <img
              src={card.artworkUrl}
              alt={card.name}
              draggable={false}
              className="max-w-full max-h-full w-auto h-auto object-contain scale-[1.08] transition-transform duration-200 drop-shadow-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          </motion.div>

          {/* ============================================================== */}
          {/* SHADERS HOLOGRÁFICOS (SIEMPRE ACTIVOS, NO SE PAUSAN EN HOVER)  */}
          {/* ============================================================== */}

          {/* CAPA 1: TEXTURA GRABADA (ETCHED FOIL) */}
          <div
            className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.35 : 0.2,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px)',
              mixBlendMode: 'overlay',
            }}
          />

          {/* CAPA 2: HOLOGRAMA DIRECCIONAL CONTINUO SEGÚN RAREZA */}
          {card.rarity === 'special-illustration-rare' && (
            <div
              className="absolute inset-0 z-21 pointer-events-none animate-holo-continuous"
              style={{
                opacity: isHovered ? 0.45 : 0.3,
                backgroundImage:
                  'linear-gradient(115deg, #ff0080 0%, #ff8c00 18%, #40e0d0 36%, #7c3aed 54%, #00f5a0 72%, #ff0080 100%)',
                backgroundSize: '260% 260%',
                mixBlendMode: 'color-dodge',
              }}
            />
          )}

          {card.rarity === 'hyper-rare' && (
            <div
              className="absolute inset-0 z-21 pointer-events-none animate-holo-continuous"
              style={{
                opacity: isHovered ? 0.52 : 0.32,
                backgroundImage:
                  'radial-gradient(circle, #fef08a 0%, #eab308 25%, #a855f7 50%, #ffffff 75%, transparent 100%)',
                backgroundSize: '240% 240%',
                mixBlendMode: 'color-dodge',
              }}
            />
          )}

          {card.rarity === 'illustration-rare' && (
            <div
              className="absolute inset-0 z-21 pointer-events-none animate-holo-continuous"
              style={{
                opacity: isHovered ? 0.4 : 0.24,
                backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.3) 0%, ${card.theme.glow} 35%, ${card.theme.soft} 65%, rgba(255,255,255,0.3) 100%)`,
                backgroundSize: '220% 220%',
                mixBlendMode: 'soft-light',
              }}
            />
          )}

          {/* CAPA 3: BRILLO ESPECULAR (GLARE SPOTLIGHT DINÁMICO) */}
          <motion.div
            className="absolute inset-0 z-22 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glareOpacity,
              background: `radial-gradient(circle at ${pointerX.get()} ${pointerY.get()}, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 30%, transparent 65%)`,
              mixBlendMode: 'screen',
            }}
          />

          {/* ============================================================== */}
          {/* CONTENIDO ANATÓMICO TCG EN ESPAÑOL                            */}
          {/* ============================================================== */}
          <div
            className="relative z-30 h-full flex flex-col justify-between p-3.5 pt-3"
            style={{
              transform: 'translateZ(45px)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* CABECERA: ETAPA, NOMBRE, LOGO EX, PS Y ENERGÍA */}
            <div className="flex items-center justify-between gap-1.5 h-[36px]">
              <div className="flex items-center gap-2 min-w-0">
                {/* Insignia de etapa */}
                <span
                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm flex-shrink-0"
                  style={{
                    background: isGoldBorder
                      ? 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)'
                      : 'linear-gradient(135deg, #e2e8f0 0%, #64748b 100%)',
                    color: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                >
                  {card.stage}
                </span>

                {/* Nombre + Logotipo ex */}
                <div className="flex items-baseline gap-1 truncate">
                  <span className="text-[15px] font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                    {card.name}
                  </span>
                  {card.isEx && (
                    <span className="italic font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-[15px] tracking-tighter">
                      ex
                    </span>
                  )}
                </div>
              </div>

              {/* PS + Energía + Teracristal */}
              <div className="flex flex-col items-end flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-300 drop-shadow">
                    PS
                  </span>
                  <span className="text-[17px] font-black text-white font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
                    {card.hp}
                  </span>
                  <EnergyIcon type={card.primaryType} size={18} />
                </div>

                {/* Etiqueta Teracristal para Charizard */}
                {card.isTeracristal && (
                  <div
                    className="mt-0.5 px-1.5 py-[1px] rounded text-[7px] font-black uppercase tracking-widest text-slate-900 shadow-sm"
                    style={{
                      background:
                        'linear-gradient(90deg, #fbcfe8 0%, #bae6fd 50%, #fed7aa 100%)',
                      border: '1px solid rgba(255,255,255,0.8)',
                    }}
                  >
                    Teracristal
                  </div>
                )}
              </div>
            </div>

            {/* ZONA INFERIOR: HABILIDAD Y ATAQUE (ENCIMA DEL POKÉMON) */}
            <div
              className="mt-auto mb-1 space-y-2 relative z-30"
              style={{
                transform: 'translateZ(10px)',
              }}
            >
              <div
                className="rounded-xl p-2.5 border backdrop-blur-md shadow-2xl space-y-2"
                style={{
                  background: 'rgba(5, 7, 13, 0.78)',
                  borderColor: 'rgba(255, 255, 255, 0.16)',
                }}
              >
                {/* HABILIDAD */}
                {card.ability && (
                  <div className="border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-[1px] rounded-[3px] bg-red-600 text-[8px] font-black text-white tracking-wider uppercase shadow-sm">
                        HABILIDAD
                      </span>
                      <span
                        className="text-[11px] font-black tracking-tight"
                        style={{ color: card.theme.primary }}
                      >
                        {card.ability.name}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-200 leading-snug line-clamp-2">
                      {card.ability.description}
                    </p>
                  </div>
                )}

                {/* ATAQUE PRINCIPAL */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {card.attack.energyCost.map((en, i) => (
                          <EnergyIcon key={i} type={en} size={13} />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-white truncate">
                        {card.attack.name}
                      </span>
                    </div>
                    <span className="text-[13px] font-black text-white font-mono flex-shrink-0 drop-shadow">
                      {card.attack.damage}
                    </span>
                  </div>
                  {card.attack.description && (
                    <p className="text-[8.5px] text-slate-300 leading-snug">
                      {card.attack.description}
                    </p>
                  )}
                </div>
              </div>

              {/* BARRA METÁLICA DE DEBILIDAD, RESISTENCIA Y RETIRADA */}
              <div
                className="flex items-center justify-between text-[8px] font-semibold text-slate-300 px-2 py-1 rounded-md border"
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[7.5px] uppercase text-slate-400">
                    deb
                  </span>
                  <EnergyIcon type={card.weakness.type} size={11} />
                  <span>{card.weakness.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7.5px] uppercase text-slate-400">
                    res
                  </span>
                  {card.resistance ? (
                    <>
                      <EnergyIcon type={card.resistance.type} size={11} />
                      <span>{card.resistance.value}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7.5px] uppercase text-slate-400">
                    ret
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: card.retreatCost }).map((_, i) => (
                      <EnergyIcon key={i} type="colorless" size={11} />
                    ))}
                  </div>
                </div>
              </div>

              {/* RECUADRO REGLA PARA LOS POKÉMON EX (EN CARTAS EX) */}
              {card.isEx && (
                <div
                  className="rounded px-2 py-0.5 text-center border"
                  style={{
                    background: isGoldBorder
                      ? 'rgba(202, 138, 4, 0.18)'
                      : 'rgba(255, 255, 255, 0.08)',
                    borderColor: isGoldBorder
                      ? 'rgba(234, 179, 8, 0.35)'
                      : 'rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <p className="text-[7px] text-slate-300 font-medium leading-none">
                    <b className="text-white font-bold">
                      Regla para los Pokémon ex:
                    </b>{' '}
                    Cuando queda Fuera de Combate, tu rival toma 2 cartas de
                    Premio.
                  </p>
                </div>
              )}

              {/* PIE DE CARTA: CÓDIGO DE COLECCIÓN, ESTRELLAS Y CRÉDITOS */}
              <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono px-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-[0.5px] rounded bg-white/10 text-white font-bold text-[7px]">
                    G
                  </span>
                  <span>{card.collectorSet}</span>
                  <span>{card.collectionCode}</span>
                  <span className="text-amber-300 tracking-tighter text-[9px]">
                    {card.rarityStars}
                  </span>
                </div>
                <span className="tracking-widest uppercase opacity-75 text-[7px]">
                  COBBLEMON REALMS • 1.21.1
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
