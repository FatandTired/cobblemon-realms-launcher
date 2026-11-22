export interface PokemonCardTheme {
  primary: string;
  secondary: string;
  glow: string;
  soft: string;
}

export interface PokemonCard {
  id: string;
  number: string;
  name: string;
  artworkUrl: string;
  types: string[];
  rarity: string;
  theme: PokemonCardTheme;
  typeGradient: string;
}

export const POKEMON_CARDS: PokemonCard[] = [
  {
    id: 'charizard',
    number: '#006',
    name: 'Charizard',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    types: ['FUEGO', 'VOLADOR'],
    rarity: 'SPECIAL ILLUSTRATION RARE',
    theme: {
      primary: '#ff4d2e',
      secondary: '#ff9e1b',
      glow: 'rgba(255, 77, 46, 0.42)',
      soft: 'rgba(255, 77, 46, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #1a0800 0%, #2d1200 50%, #1a0400 100%)',
  },
  {
    id: 'greninja',
    number: '#658',
    name: 'Greninja',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/658.png',
    types: ['AGUA', 'SINIESTRO'],
    rarity: 'SPECIAL ILLUSTRATION RARE',
    theme: {
      primary: '#0ea5e9',
      secondary: '#6366f1',
      glow: 'rgba(14, 165, 233, 0.42)',
      soft: 'rgba(14, 165, 233, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #00080f 0%, #001a2d 50%, #060010 100%)',
  },
  {
    id: 'mewtwo',
    number: '#150',
    name: 'Mewtwo',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
    types: ['PSÍQUICO'],
    rarity: 'HYPER RARE',
    theme: {
      primary: '#a855f7',
      secondary: '#ec4899',
      glow: 'rgba(168, 85, 247, 0.44)',
      soft: 'rgba(168, 85, 247, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #0d0010 0%, #1a0030 50%, #0d0018 100%)',
  },
  {
    id: 'bulbasaur',
    number: '#001',
    name: 'Bulbasaur',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    types: ['PLANTA', 'VENENO'],
    rarity: 'ILLUSTRATION RARE',
    theme: {
      primary: '#22c55e',
      secondary: '#84cc16',
      glow: 'rgba(34, 197, 94, 0.42)',
      soft: 'rgba(34, 197, 94, 0.14)',
    },
    typeGradient: 'linear-gradient(145deg, #000f06 0%, #001a0d 50%, #040f00 100%)',
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
