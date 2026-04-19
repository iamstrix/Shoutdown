// ─── Game Types ──────────────────────────────────────────────────────────────

export interface FallingWord {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  scale: number;
  hue: number;
  cleared: boolean;
  clearTime: number;
  width: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface ScorePop {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  words: FallingWord[];
  particles: Particle[];
  scorePops: ScorePop[];
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  wordsCleared: number;
  wordsMissed: number;
  gameOver: boolean;
  paused: boolean;
  elapsedTime: number;
  lastSpawnTime: number;
  difficulty: number;
  lastTranscript: string;
  transcriptFadeTime: number;
  micActive: boolean;
}

export interface GameConfig {
  wordPool: string[];
  maxLives: number;
  baseFallSpeed: number;
  baseSpawnInterval: number;
  difficultyRampRate: number;
  fuzzyThreshold: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  wordPool: [],
  maxLives: 5,
  baseFallSpeed: 0.6,
  baseSpawnInterval: 2500,
  difficultyRampRate: 0.00004,
  fuzzyThreshold: 0.25,
};

export const EXAMPLE_WORDS = [
  "Genshin Impact",
  "Raiden Shogun",
  "Elemental Burst",
  "Electro",
  "Archon",
  "Primogems",
  "Resin",
  "Abyss",
  "Spiral Abyss",
  "Traveler",
];
