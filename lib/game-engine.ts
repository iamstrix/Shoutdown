// ─── Canvas Game Engine (Minimalist) ─────────────────────────────────────────

import {
  type FallingWord,
  type Particle,
  type ScorePop,
  type GameState,
  type GameConfig,
  DEFAULT_CONFIG,
} from "./types";
import { findBestMatch } from "./fuzzy-match";

let nextWordId = 0;
function generateId(): string {
  return `word_${nextWordId++}`;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private config: GameConfig;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private dpr = 1;
  private onStateChange: (state: GameState) => void;
  private onGameOver: (score: number, wordsCleared: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<GameConfig>,
    onStateChange: (state: GameState) => void,
    onGameOver: (score: number, wordsCleared: number) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStateChange = onStateChange;
    this.onGameOver = onGameOver;

    this.state = this.createInitialState();
    this.setupCanvas();
  }

  private createInitialState(): GameState {
    return {
      words: [],
      particles: [],
      scorePops: [],
      score: 0,
      lives: this.config.maxLives,
      combo: 0,
      maxCombo: 0,
      wordsCleared: 0,
      wordsMissed: 0,
      gameOver: false,
      paused: false,
      elapsedTime: 0,
      lastSpawnTime: 0,
      difficulty: 1,
      lastTranscript: "",
      transcriptFadeTime: 0,
      micActive: false,
    };
  }

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resizeCanvas();
  }

  resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause(): void {
    this.state.paused = !this.state.paused;
    if (!this.state.paused) {
      this.lastFrameTime = performance.now();
    }
    this.onStateChange({ ...this.state });
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min(timestamp - this.lastFrameTime, 50);
    this.lastFrameTime = timestamp;

    if (!this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.render();
    this.onStateChange({ ...this.state });
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.state.elapsedTime += dt;
    this.state.difficulty = 1 + this.state.elapsedTime * this.config.difficultyRampRate;
    this.spawnWords(dt);
    this.updateWords(dt);
    this.updateParticles(dt);
    this.updateScorePops(dt);

    if (this.state.transcriptFadeTime > 0) {
      this.state.transcriptFadeTime -= dt;
      if (this.state.transcriptFadeTime <= 0) {
        this.state.lastTranscript = "";
      }
    }
  }

  private spawnWords(_dt: number): void {
    const spawnInterval = this.config.baseSpawnInterval / this.state.difficulty;
    const timeSinceSpawn = this.state.elapsedTime - this.state.lastSpawnTime;

    if (timeSinceSpawn >= spawnInterval) {
      this.spawnWord();
      this.state.lastSpawnTime = this.state.elapsedTime;
    }
  }

  private spawnWord(): void {
    if (this.state.gameOver || this.state.paused) return;

    const pool = this.config.wordPool;
    if (pool.length === 0) return;

    const text = pool[Math.floor(Math.random() * pool.length)];
    const w = this.canvas.width / this.dpr;

    this.ctx.font = "20px system-ui";
    const wordWidth = this.ctx.measureText(text).width;

    const x = Math.random() * (w - wordWidth - 40) + 20;
    const speed = this.config.baseFallSpeed * this.state.difficulty;

    this.state.words.push({
      id: generateId(),
      text,
      x,
      y: -20,
      speed,
      opacity: 1,
      scale: 1,
      hue: 0,
      cleared: false,
      clearTime: 0,
      width: wordWidth,
    });
  }

  private updateWords(dt: number): void {
    const h = this.canvas.height / this.dpr;
    const toRemove: number[] = [];

    for (let i = 0; i < this.state.words.length; i++) {
      const word = this.state.words[i];

      if (word.cleared) {
        word.clearTime += dt;
        if (word.clearTime > 300) toRemove.push(i);
        continue;
      }

      word.y += word.speed * (dt / 16.67);

      if (word.y > h) {
        toRemove.push(i);
        this.state.lives--;
        this.state.combo = 0;

        if (this.state.lives <= 0) {
          this.state.gameOver = true;
          this.onGameOver(this.state.score, this.state.wordsCleared);
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.state.words.splice(toRemove[i], 1);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.state.particles.splice(i, 1);
    }
  }

  private updateScorePops(dt: number): void {
    for (let i = this.state.scorePops.length - 1; i >= 0; i--) {
      const pop = this.state.scorePops[i];
      pop.life -= dt;
      pop.y -= 1;
      if (pop.life <= 0) this.state.scorePops.splice(i, 1);
    }
  }

  handleTranscript(transcript: string, isFinal: boolean): void {
    if (this.state.gameOver || this.state.paused) return;
    this.state.lastTranscript = transcript;
    this.state.transcriptFadeTime = 2000;

    const matchIndex = findBestMatch(transcript, this.state.words, this.config.fuzzyThreshold);
    if (matchIndex >= 0) this.clearWord(matchIndex);
  }

  private clearWord(index: number): void {
    const word = this.state.words[index];
    if (!word || word.cleared) return;

    word.cleared = true;
    this.state.score += 10;
    this.state.wordsCleared++;
    this.state.combo++;
  }

  setMicActive(active: boolean): void {
    this.state.micActive = active;
  }

  private render(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const ctx = this.ctx;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Danger line
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, h - 2);
    ctx.lineTo(w, h - 2);
    ctx.stroke();

    // Words
    ctx.fillStyle = "#fff";
    ctx.font = "20px system-ui";
    ctx.textAlign = "left";
    for (const word of this.state.words) {
      if (word.cleared) continue;
      ctx.fillText(word.text, word.x, word.y);
    }

    // Transcript
    if (this.state.lastTranscript) {
      ctx.fillStyle = "#888";
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`Hearing: ${this.state.lastTranscript}`, w / 2, h - 30);
    }
  }

  getState(): GameState {
    return { ...this.state };
  }
}

