export interface PokemonCardTheme {
  primary: string;
  secondary: string;
  glow: string;
  soft: string;
}

export type EnergyType =
  | 'fire'
  | 'water'
  | 'psychic'
  | 'grass'
  | 'darkness'
  | 'lightning'
  | 'fighting'
  | 'dragon'
  | 'colorless';

export type PokemonCardRarity =
  | 'special-illustration-rare'
  | 'hyper-rare'
  | 'illustration-rare';

export interface PokemonAbility {
  name: string;
  description: string;
}

export interface PokemonAttack {
  name: string;
  damage: string;
  energyCost: EnergyType[];
  description: string;
}

export interface PokemonCard {
  id: string;
  number: string;
  name: string;
  artworkUrl: string;
  backgroundImage?: string;
  types: string[];
  primaryType: EnergyType;
  stage: 'BÁSICO' | 'FASE 1' | 'FASE 2';
  isEx: boolean;
  hp: number;
  isTeracristal?: boolean;
  rarity: PokemonCardRarity;
  rarityLabel: string;
  rarityStars: string;
  theme: PokemonCardTheme;
  typeGradient: string;
  ambientGlow: string;
  ability: PokemonAbility;
  attack: PokemonAttack;
  weakness: { type: EnergyType; value: string };
  resistance?: { type: EnergyType; value: string };
  retreatCost: number;
  collectionCode: string;
  collectorSet: string;
}

export const POKEMON_CARDS: PokemonCard[] = [
  {
    id: 'charizard',
    number: '#006',
    name: 'Charizard',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    backgroundImage: '/backgrounds/charizard.png',
    types: ['FUEGO', 'VOLADOR'],
    primaryType: 'fire',
    stage: 'FASE 2',
    isEx: true,
    hp: 330,
    isTeracristal: true,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#ff4d2e',
      secondary: '#ff9e1b',
      glow: 'rgba(255, 77, 46, 0.42)',
      soft: 'rgba(255, 77, 46, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #2b0800 0%, #4a1503 40%, #1f0400 100%)',
    ambientGlow: 'rgba(255, 77, 46, 0.25)',
    ability: {
      name: 'Reino Infernal',
      description:
        'Cuando juegas este Pokémon para evolucionar a 1 de tus Pokémon, puedes buscar en tu baraja hasta 3 cartas de Energía Fuego Básica.',
    },
    attack: {
      name: 'Oscuridad Ardiente',
      damage: '180+',
      energyCost: ['fire', 'fire'],
      description:
        'Hace 30 puntos de daño más por cada carta de Premio que haya tomado tu rival.',
    },
    weakness: { type: 'water', value: '×2' },
    retreatCost: 2,
    collectionCode: '006/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'greninja',
    number: '#658',
    name: 'Greninja',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/658.png',
    backgroundImage: '/backgrounds/greninja.png',
    types: ['AGUA', 'SINIESTRO'],
    primaryType: 'water',
    stage: 'FASE 2',
    isEx: true,
    hp: 310,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#0ea5e9',
      secondary: '#6366f1',
      glow: 'rgba(14, 165, 233, 0.42)',
      soft: 'rgba(14, 165, 233, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #021a30 0%, #032b4d 40%, #010d18 100%)',
    ambientGlow: 'rgba(14, 165, 233, 0.25)',
    ability: {
      name: 'Sombra Shuriken',
      description:
        'Debes descartar 1 carta de Energía de tu mano para usar esta habilidad. Pon 2 contadores de daño en 1 Pokémon de tu rival.',
    },
    attack: {
      name: 'Shuriken de Agua',
      damage: '170',
      energyCost: ['water', 'water', 'colorless'],
      description:
        'Este ataque hace 120 puntos de daño a 1 de los Pokémon en Banca de tu rival.',
    },
    weakness: { type: 'lightning', value: '×2' },
    retreatCost: 1,
    collectionCode: '658/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'mewtwo',
    number: '#150',
    name: 'Mewtwo',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
    backgroundImage: '/backgrounds/mewtwo.png',
    types: ['PSÍQUICO'],
    primaryType: 'psychic',
    stage: 'BÁSICO',
    isEx: true,
    hp: 280,
    rarity: 'hyper-rare',
    rarityLabel: 'HYPER RARE',
    rarityStars: '★★★',
    theme: {
      primary: '#a855f7',
      secondary: '#ec4899',
      glow: 'rgba(168, 85, 247, 0.44)',
      soft: 'rgba(168, 85, 247, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #240038 0%, #3e0959 40%, #12001c 100%)',
    ambientGlow: 'rgba(168, 85, 247, 0.25)',
    ability: {
      name: 'Presión Psíquica',
      description:
        'Mientras este Pokémon esté en el Puesto Activo, el coste de Retirada del Pokémon Activo de tu rival es de 1 Energía Incolora más.',
    },
    attack: {
      name: 'Onda Mental',
      damage: '210',
      energyCost: ['psychic', 'psychic', 'colorless'],
      description: 'Descarta 2 Energías unidas a este Pokémon.',
    },
    weakness: { type: 'darkness', value: '×2' },
    resistance: { type: 'fighting', value: '-30' },
    retreatCost: 2,
    collectionCode: '150/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'bulbasaur',
    number: '#001',
    name: 'Bulbasaur',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    backgroundImage: '/backgrounds/bulbasaur.png',
    types: ['PLANTA', 'VENENO'],
    primaryType: 'grass',
    stage: 'BÁSICO',
    isEx: false,
    hp: 70,
    rarity: 'illustration-rare',
    rarityLabel: 'ILLUSTRATION RARE',
    rarityStars: '★',
    theme: {
      primary: '#22c55e',
      secondary: '#84cc16',
      glow: 'rgba(34, 197, 94, 0.42)',
      soft: 'rgba(34, 197, 94, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #022610 0%, #073d1b 40%, #011408 100%)',
    ambientGlow: 'rgba(34, 197, 94, 0.25)',
    ability: {
      name: 'Espesura',
      description:
        'Si los PS restantes de este Pokémon son 30 o menos, los ataques de este Pokémon hacen 30 puntos de daño más.',
    },
    attack: {
      name: 'Látigo Cepa',
      damage: '60',
      energyCost: ['grass', 'colorless'],
      description: 'Un azote veloz con lianas espinosas.',
    },
    weakness: { type: 'fire', value: '×2' },
    retreatCost: 1,
    collectionCode: '001/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'espeon',
    number: '#196',
    name: 'Espeon',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/196.png',
    backgroundImage: '/backgrounds/espeon.png',
    types: ['PSÍQUICO'],
    primaryType: 'psychic',
    stage: 'FASE 1',
    isEx: true,
    hp: 270,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#d946ef',
      secondary: '#818cf8',
      glow: 'rgba(217, 70, 239, 0.44)',
      soft: 'rgba(217, 70, 239, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #200438 0%, #3b0764 40%, #0f011c 100%)',
    ambientGlow: 'rgba(217, 70, 239, 0.28)',
    ability: {
      name: 'Cuerpo Solar',
      description:
        'Previene todos los efectos de ataques de los Pokémon de tu rival hechos a tus Pokémon que tengan Energía unida.',
    },
    attack: {
      name: 'Impacto Psíquico',
      damage: '160',
      energyCost: ['psychic', 'colorless', 'colorless'],
      description:
        'El daño de este ataque no se ve afectado por ningún efecto en el Pokémon Activo de tu rival.',
    },
    weakness: { type: 'darkness', value: '×2' },
    resistance: { type: 'fighting', value: '-30' },
    retreatCost: 1,
    collectionCode: '196/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'salamence',
    number: '#373',
    name: 'Salamence',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/373.png',
    backgroundImage: '/backgrounds/salamence.png',
    types: ['DRAGÓN', 'VOLADOR'],
    primaryType: 'dragon',
    stage: 'FASE 2',
    isEx: true,
    hp: 320,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#0284c7',
      secondary: '#ef4444',
      glow: 'rgba(2, 132, 199, 0.44)',
      soft: 'rgba(2, 132, 199, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #051a33 0%, #0f274a 40%, #020814 100%)',
    ambientGlow: 'rgba(2, 132, 199, 0.28)',
    ability: {
      name: 'Alas Tempestuosas',
      description:
        'Una vez durante tu turno, puedes cambiar a tu Pokémon Activo por 1 de tus Pokémon en Banca.',
    },
    attack: {
      name: 'Impacto Draconiano',
      damage: '220',
      energyCost: ['fire', 'water', 'colorless'],
      description:
        'Este ataque hace 30 puntos de daño a cada uno de los Pokémon en Banca de tu rival.',
    },
    weakness: { type: 'lightning', value: '×2' },
    resistance: { type: 'fighting', value: '-30' },
    retreatCost: 2,
    collectionCode: '373/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'arceus',
    number: '#493',
    name: 'Arceus',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png',
    backgroundImage: '/backgrounds/arceus.png',
    types: ['INCOLORO'],
    primaryType: 'colorless',
    stage: 'BÁSICO',
    isEx: true,
    hp: 300,
    rarity: 'hyper-rare',
    rarityLabel: 'HYPER RARE',
    rarityStars: '★★★',
    theme: {
      primary: '#f8fafc',
      secondary: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.45)',
      soft: 'rgba(251, 191, 36, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #181920 0%, #302d20 40%, #0a0b0f 100%)',
    ambientGlow: 'rgba(251, 191, 36, 0.28)',
    ability: {
      name: 'Nacimiento Cósmico',
      description:
        'Una vez durante tu turno, puedes buscar en tu baraja hasta 2 cartas cualesquiera y ponerlas en tu mano. Luego, baraja las cartas de tu baraja.',
    },
    attack: {
      name: 'Sentencia Celestial',
      damage: '230',
      energyCost: ['colorless', 'colorless', 'colorless'],
      description:
        'Elige hasta 3 cartas de Energía Básica de tu baraja y únelas a tus Pokémon en la Banca de la forma que quieras.',
    },
    weakness: { type: 'fighting', value: '×2' },
    retreatCost: 2,
    collectionCode: '493/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'gengar',
    number: '#094',
    name: 'Gengar',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
    backgroundImage: '/backgrounds/gengar.png',
    types: ['FANTASMA', 'VENENO'],
    primaryType: 'psychic',
    stage: 'FASE 2',
    isEx: true,
    hp: 310,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#a855f7',
      secondary: '#d946ef',
      glow: 'rgba(168, 85, 247, 0.44)',
      soft: 'rgba(168, 85, 247, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #170428 0%, #2f074d 40%, #0a0114 100%)',
    ambientGlow: 'rgba(168, 85, 247, 0.28)',
    ability: {
      name: 'Puerta Umbría',
      description:
        'Una vez durante tu turno, si este Pokémon está en tu pila de descartes, puedes ponerlo en tu Banca y colocar 3 contadores de daño sobre él.',
    },
    attack: {
      name: 'Terror Espectral',
      damage: '190',
      energyCost: ['psychic', 'psychic', 'colorless'],
      description: 'El Pokémon Activo de tu rival pasa a estar Confundido y Envenenado.',
    },
    weakness: { type: 'darkness', value: '×2' },
    resistance: { type: 'fighting', value: '-30' },
    retreatCost: 2,
    collectionCode: '094/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'mimikyu',
    number: '#778',
    name: 'Mimikyu',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png',
    backgroundImage: '/backgrounds/mimikyu.png',
    types: ['FANTASMA', 'HADA'],
    primaryType: 'psychic',
    stage: 'BÁSICO',
    isEx: true,
    hp: 160,
    rarity: 'illustration-rare',
    rarityLabel: 'ILLUSTRATION RARE',
    rarityStars: '★',
    theme: {
      primary: '#eab308',
      secondary: '#8b5cf6',
      glow: 'rgba(234, 179, 8, 0.44)',
      soft: 'rgba(234, 179, 8, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #241d04 0%, #3a2d07 40%, #120d01 100%)',
    ambientGlow: 'rgba(234, 179, 8, 0.28)',
    ability: {
      name: 'Disfraz Guardián',
      description:
        'Previene todo el daño infligido a este Pokémon por ataques de los Pokémon ex y Pokémon V de tu rival.',
    },
    attack: {
      name: 'Garra Umbría',
      damage: '80',
      energyCost: ['psychic', 'colorless'],
      description: 'Este ataque no se ve afectado por Efectos activos en el Pokémon de tu rival.',
    },
    weakness: { type: 'darkness', value: '×2' },
    retreatCost: 1,
    collectionCode: '778/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'quilava',
    number: '#156',
    name: 'Quilava',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/156.png',
    backgroundImage: '/backgrounds/quilava.png',
    types: ['FUEGO'],
    primaryType: 'fire',
    stage: 'FASE 1',
    isEx: false,
    hp: 90,
    rarity: 'illustration-rare',
    rarityLabel: 'ILLUSTRATION RARE',
    rarityStars: '★',
    theme: {
      primary: '#f97316',
      secondary: '#eab308',
      glow: 'rgba(249, 115, 22, 0.42)',
      soft: 'rgba(249, 115, 22, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #2c0e02 0%, #471905 40%, #150600 100%)',
    ambientGlow: 'rgba(249, 115, 22, 0.26)',
    ability: {
      name: 'Espíritu Volcánico',
      description:
        'Si a este Pokémon le quedan 30 PS o menos, los ataques de este Pokémon infligen 50 puntos de daño adicionales.',
    },
    attack: {
      name: 'Rueda Llameante',
      damage: '80',
      energyCost: ['fire', 'fire', 'colorless'],
      description: 'Descarta 1 carta de Energía Fuego unida a este Pokémon.',
    },
    weakness: { type: 'water', value: '×2' },
    retreatCost: 1,
    collectionCode: '156/151',
    collectorSet: 'CBR ES',
  },
  {
    id: 'zygarde',
    number: '#718',
    name: 'Zygarde',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/718.png',
    backgroundImage: '/backgrounds/zygarde.png',
    types: ['DRAGÓN', 'TIERRA'],
    primaryType: 'dragon',
    stage: 'BÁSICO',
    isEx: true,
    hp: 330,
    rarity: 'special-illustration-rare',
    rarityLabel: 'SPECIAL ILLUSTRATION RARE',
    rarityStars: '★★',
    theme: {
      primary: '#10b981',
      secondary: '#047857',
      glow: 'rgba(16, 185, 129, 0.45)',
      soft: 'rgba(16, 185, 129, 0.15)',
    },
    typeGradient: 'linear-gradient(145deg, #022016 0%, #063c29 40%, #01120c 100%)',
    ambientGlow: 'rgba(16, 185, 129, 0.28)',
    ability: {
      name: 'Reunión Celular',
      description:
        'Una vez durante tu turno, puedes buscar en tu baraja hasta 2 cartas de Energía Básica y unirlas a este Pokémon.',
    },
    attack: {
      name: 'Fuerza del Orden Supremo',
      damage: '240',
      energyCost: ['grass', 'fighting', 'colorless'],
      description:
        'Durante el próximo turno de tu rival, el Pokémon Activo del rival no puede retirarse.',
    },
    weakness: { type: 'grass', value: '×2' },
    retreatCost: 3,
    collectionCode: '718/151',
    collectorSet: 'CBR ES',
  },
];

export function getRandomCard(excludeId?: string): PokemonCard {
  const pool = excludeId ? POKEMON_CARDS.filter((c) => c.id !== excludeId) : POKEMON_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function applyCardTheme(theme: PokemonCardTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-glow', theme.glow);
  root.style.setProperty('--theme-soft', theme.soft);
}
