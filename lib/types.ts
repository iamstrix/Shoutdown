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

export const PREDEFINED_CATEGORIES = {
  "Animals": [
    "Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Penguin", "Dolphin", "Kangaroo", "Panda", "Koala",
    "Cheetah", "Gorilla", "Hippo", "Rhino", "Wolf", "Fox", "Eagle", "Shark", "Whale", "Octopus",
    "Rabbit", "Hamster", "Squirrel", "Deer", "Moose", "Camel", "Lizard", "Snake", "Frog", "Turtle"
  ],
  "Food": [
    "Pizza", "Burger", "Pasta", "Sushi", "Taco", "Salad", "Steak", "Pancake", "Waffle", "Croissant",
    "Burrito", "Omelette", "Sandwich", "Ramen", "Curry", "Dumplings", "Cheesecake", "Brownie", "Cookie", "Donut",
    "Chicken", "Shrimp", "Lobster", "Bagel", "Muffin", "Yogurt", "Smoothie", "Juice", "Coffee", "Tea"
  ],
  "Places": [
    "Tokyo", "Paris", "London", "New York", "Sydney", "Rome", "Berlin", "Cairo", "Moscow", "Dubai",
    "Seoul", "Beijing", "Bangkok", "Mumbai", "Istanbul", "Madrid", "Amsterdam", "Toronto", "Chicago", "Los Angeles",
    "Singapore", "Hong Kong", "Barcelona", "Prague", "Vienna", "Athens", "Venice", "Florence", "Dublin", "Lisbon"
  ],
  "Sports": [
    "Soccer", "Basketball", "Tennis", "Baseball", "Cricket", "Golf", "Hockey", "Surfing", "Boxing", "Rugby",
    "Volleyball", "Badminton", "Swimming", "Running", "Cycling", "Skiing", "Snowboarding", "Skating", "Gymnastics", "Wrestling",
    "Fencing", "Archery", "Karate", "Judo", "Yoga", "Pilates", "Bowling", "Billiards", "Darts", "Squash"
  ],
  "Entertainment": [
    "Movie", "Music", "Concert", "Theater", "Acting", "Comedy", "Director", "Studio", "Script", "Award",
    "Actor", "Actress", "Producer", "Camera", "Scene", "Plot", "Genre", "Soundtrack", "Stage", "Audience",
    "Performance", "Premiere", "Festival", "Review", "Sequel", "Prequel", "Animation", "Drama", "Horror", "Thriller"
  ]
};
