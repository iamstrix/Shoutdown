// ─── Canvas Game Engine ──────────────────────────────────────────────────────

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
  private starField: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

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
    this.initStarField();
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

  private initStarField(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.starField = [];
    for (let i = 0; i < 80; i++) {
      this.starField.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
  }

  // ── Game Loop ────────────────────────────────────────────────────────────────

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
    const dt = Math.min(timestamp - this.lastFrameTime, 50); // Cap delta at 50ms
    this.lastFrameTime = timestamp;

    if (!this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.render();
    this.onStateChange({ ...this.state });

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // ── Update Logic ─────────────────────────────────────────────────────────────

  private update(dt: number): void {
    this.state.elapsedTime += dt;

    // Ramp difficulty over time
    this.state.difficulty = 1 + this.state.elapsedTime * this.config.difficultyRampRate;

    // Spawn new words
    this.spawnWords(dt);

    // Update word positions
    this.updateWords(dt);

    // Update particles
    this.updateParticles(dt);

    // Update score pops
    this.updateScorePops(dt);

    // Update stars
    this.updateStars(dt);

    // Fade transcript
    if (this.state.transcriptFadeTime > 0) {
      this.state.transcriptFadeTime -= dt;
      if (this.state.transcriptFadeTime <= 0) {
        this.state.lastTranscript = "";
        this.state.transcriptFadeTime = 0;
      }
    }
  }

  private spawnWords(_dt: number): void {
    const spawnInterval = this.config.baseSpawnInterval / this.state.difficulty;
    const timeSinceSpawn = this.state.elapsedTime - this.state.lastSpawnTime;

    if (timeSinceSpawn >= spawnInterval) {
      this.spawnWord();
      this.state.lastSpawnTime = this.state.elapsedTime;

      // Chance to spawn an extra word at higher difficulty
      if (this.state.difficulty > 1.5 && Math.random() < (this.state.difficulty - 1.5) * 0.3) {
        setTimeout(() => this.spawnWord(), Math.random() * 500 + 200);
      }
    }
  }

  private spawnWord(): void {
    if (this.state.gameOver || this.state.paused) return;

    const pool = this.config.wordPool;
    if (pool.length === 0) return;

    const text = pool[Math.floor(Math.random() * pool.length)];
    const w = this.canvas.width / this.dpr;

    // Measure text width
    this.ctx.font = `bold 20px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    const metrics = this.ctx.measureText(text);
    const wordWidth = metrics.width + 30; // padding

    const x = Math.random() * (w - wordWidth - 40) + 20;
    const speed =
      this.config.baseFallSpeed * (0.8 + Math.random() * 0.4) * this.state.difficulty;

    const word: FallingWord = {
      id: generateId(),
      text,
      x,
      y: -30,
      speed,
      opacity: 1,
      scale: 1,
      hue: Math.random() * 60 + 180, // Cyan-purple range
      cleared: false,
      clearTime: 0,
      width: wordWidth,
    };

    this.state.words.push(word);
  }

  private updateWords(dt: number): void {
    const h = this.canvas.height / this.dpr;
    const toRemove: number[] = [];

    for (let i = 0; i < this.state.words.length; i++) {
      const word = this.state.words[i];

      if (word.cleared) {
        word.clearTime += dt;
        word.opacity = Math.max(0, 1 - word.clearTime / 400);
        word.scale = 1 + word.clearTime / 200;

        if (word.clearTime > 400) {
          toRemove.push(i);
        }
        continue;
      }

      word.y += word.speed * (dt / 16.67);

      // Word reached bottom
      if (word.y > h + 10) {
        toRemove.push(i);
        this.state.lives--;
        this.state.wordsMissed++;
        this.state.combo = 0;

        // Spawn red particles for missed word
        this.spawnMissParticles(word.x + word.width / 2, h);

        if (this.state.lives <= 0) {
          this.state.lives = 0;
          this.state.gameOver = true;
          this.onGameOver(this.state.score, this.state.wordsCleared);
        }
      }
    }

    // Remove words in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.state.words.splice(toRemove[i], 1);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vy += 0.05 * (dt / 16.67); // gravity
      p.life -= dt;

      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private updateScorePops(dt: number): void {
    for (let i = this.state.scorePops.length - 1; i >= 0; i--) {
      const pop = this.state.scorePops[i];
      pop.life -= dt;
      pop.y -= 0.5 * (dt / 16.67);

      if (pop.life <= 0) {
        this.state.scorePops.splice(i, 1);
      }
    }
  }

  private updateStars(dt: number): void {
    const h = this.canvas.height / this.dpr;
    for (const star of this.starField) {
      star.y += star.speed * (dt / 16.67);
      if (star.y > h) {
        star.y = 0;
        star.x = Math.random() * (this.canvas.width / this.dpr);
      }
    }
  }

  // ── Voice Handling ───────────────────────────────────────────────────────────

  handleTranscript(transcript: string, isFinal: boolean): void {
    if (this.state.gameOver || this.state.paused) return;

    this.state.lastTranscript = transcript;
    this.state.transcriptFadeTime = 2500;

    const matchIndex = findBestMatch(
      transcript,
      this.state.words,
      this.config.fuzzyThreshold
    );

    if (matchIndex >= 0) {
      this.clearWord(matchIndex);
    }

    // For final results, also try each segment separately
    if (isFinal) {
      const segments = transcript.split(/[,.\s]+/).filter((s) => s.length >= 3);
      for (const segment of segments) {
        const segMatch = findBestMatch(
          segment,
          this.state.words,
          this.config.fuzzyThreshold
        );
        if (segMatch >= 0) {
          this.clearWord(segMatch);
        }
      }
    }
  }

  private clearWord(index: number): void {
    const word = this.state.words[index];
    if (!word || word.cleared) return;

    word.cleared = true;
    word.clearTime = 0;

    // Score calculation with combo multiplier
    this.state.combo++;
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }

    const comboMultiplier = 1 + Math.floor(this.state.combo / 5) * 0.1;
    const baseScore = Math.max(10, word.text.length * 5);
    const finalScore = Math.round(baseScore * comboMultiplier);
    this.state.score += finalScore;
    this.state.wordsCleared++;

    // Score pop animation
    this.state.scorePops.push({
      x: word.x + word.width / 2,
      y: word.y,
      value: finalScore,
      life: 1000,
      maxLife: 1000,
    });

    // Spawn celebration particles
    this.spawnClearParticles(word.x + word.width / 2, word.y, word.hue);
  }

  private spawnClearParticles(x: number, y: number, hue: number): void {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4 + 2;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        size: Math.random() * 4 + 2,
        hue: hue + Math.random() * 40 - 20,
        saturation: 80 + Math.random() * 20,
        lightness: 55 + Math.random() * 20,
      });
    }
  }

  private spawnMissParticles(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * Math.random();
      const speed = Math.random() * 3 + 1;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400 + Math.random() * 300,
        maxLife: 700,
        size: Math.random() * 3 + 1,
        hue: 0,
        saturation: 85,
        lightness: 50,
      });
    }
  }

  setMicActive(active: boolean): void {
    this.state.micActive = active;
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  private render(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#0a0a1a");
    bgGrad.addColorStop(0.5, "#0d1025");
    bgGrad.addColorStop(1, "#15102a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    this.renderStars(ctx);

    // Danger zone at bottom
    this.renderDangerZone(ctx, w, h);

    // Particles (behind words)
    this.renderParticles(ctx);

    // Words
    this.renderWords(ctx);

    // Score pops
    this.renderScorePops(ctx);

    // HUD
    this.renderHUD(ctx, w, h);

    // Transcript display
    this.renderTranscript(ctx, w, h);

    // Pause overlay
    if (this.state.paused) {
      this.renderPauseOverlay(ctx, w, h);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.starField) {
      ctx.globalAlpha = star.opacity;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderDangerZone(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    const dangerH = 60;
    const grad = ctx.createLinearGradient(0, h - dangerH, 0, h);
    grad.addColorStop(0, "rgba(255, 30, 60, 0)");
    grad.addColorStop(0.6, "rgba(255, 30, 60, 0.06)");
    grad.addColorStop(1, "rgba(255, 30, 60, 0.15)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - dangerH, w, dangerH);

    // Danger line
    ctx.strokeStyle = "rgba(255, 60, 80, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, h - 5);
    ctx.lineTo(w, h - 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderWords(ctx: CanvasRenderingContext2D): void {
    for (const word of this.state.words) {
      ctx.save();

      const centerX = word.x + word.width / 2;
      const centerY = word.y;

      ctx.translate(centerX, centerY);
      ctx.scale(word.scale, word.scale);
      ctx.globalAlpha = word.opacity;

      // Word background pill
      const fontSize = 18;
      ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
      const textMetrics = ctx.measureText(word.text);
      const textWidth = textMetrics.width;
      const pillWidth = textWidth + 28;
      const pillHeight = fontSize + 16;

      // Glow
      ctx.shadowColor = `hsla(${word.hue}, 80%, 60%, 0.5)`;
      ctx.shadowBlur = 15;

      // Pill background
      const pillGrad = ctx.createLinearGradient(
        -pillWidth / 2,
        0,
        pillWidth / 2,
        0
      );
      pillGrad.addColorStop(0, `hsla(${word.hue}, 70%, 20%, 0.85)`);
      pillGrad.addColorStop(1, `hsla(${word.hue + 30}, 70%, 25%, 0.85)`);
      ctx.fillStyle = pillGrad;

      this.roundRect(
        ctx,
        -pillWidth / 2,
        -pillHeight / 2,
        pillWidth,
        pillHeight,
        pillHeight / 2
      );
      ctx.fill();

      // Pill border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `hsla(${word.hue}, 80%, 55%, 0.5)`;
      ctx.lineWidth = 1.5;
      this.roundRect(
        ctx,
        -pillWidth / 2,
        -pillHeight / 2,
        pillWidth,
        pillHeight,
        pillHeight / 2
      );
      ctx.stroke();

      // Text
      ctx.fillStyle = `hsla(${word.hue}, 90%, 85%, 1)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word.text, 0, 1);

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)`;
      ctx.shadowColor = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0.6)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderScorePops(ctx: CanvasRenderingContext2D): void {
    for (const pop of this.state.scorePops) {
      const alpha = Math.max(0, pop.life / pop.maxLife);
      const scale = 1 + (1 - alpha) * 0.3;

      ctx.save();
      ctx.translate(pop.x, pop.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.font = `bold 22px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffdd44";
      ctx.shadowColor = "rgba(255, 220, 60, 0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText(`+${pop.value}`, 0, 0);

      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    ctx.save();

    // Score - top left
    ctx.font = `bold 16px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("SCORE", 16, 16);
    ctx.font = `bold 28px 'Inter', system-ui, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.state.score.toLocaleString(), 16, 36);

    // Combo
    if (this.state.combo >= 2) {
      const comboMult = 1 + Math.floor(this.state.combo / 5) * 0.1;
      ctx.font = `bold 14px 'Inter', system-ui, sans-serif`;
      ctx.fillStyle = "#ffdd44";
      ctx.shadowColor = "rgba(255, 220, 60, 0.4)";
      ctx.shadowBlur = 8;
      ctx.fillText(
        `🔥 ${this.state.combo}x COMBO ${comboMult > 1 ? `(×${comboMult.toFixed(1)})` : ""}`,
        16,
        70
      );
      ctx.shadowBlur = 0;
    }

    // Lives - top right
    ctx.textAlign = "right";
    ctx.font = `bold 16px 'Inter', system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("LIVES", w - 16, 16);

    ctx.font = `bold 24px 'Inter', system-ui, sans-serif`;
    let livesText = "";
    for (let i = 0; i < this.config.maxLives; i++) {
      livesText += i < this.state.lives ? "♥" : "♡";
    }
    ctx.fillStyle =
      this.state.lives <= 1
        ? "#ff4466"
        : this.state.lives <= 2
          ? "#ffaa33"
          : "#ff6688";
    ctx.fillText(livesText, w - 16, 36);

    // Mic status indicator
    ctx.textAlign = "right";
    ctx.font = `14px 'Inter', system-ui, sans-serif`;
    const micColor = this.state.micActive
      ? "rgba(80, 255, 120, 0.8)"
      : "rgba(255, 80, 80, 0.6)";
    ctx.fillStyle = micColor;

    // Pulsing mic dot
    const pulse = this.state.micActive
      ? 0.5 + Math.sin(this.state.elapsedTime / 300) * 0.5
      : 0;
    ctx.beginPath();
    ctx.arc(w - 16, 80, 5 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(
      this.state.micActive ? "MIC ON" : "MIC OFF",
      w - 30,
      84
    );

    ctx.restore();
  }

  private renderTranscript(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    if (!this.state.lastTranscript || this.state.transcriptFadeTime <= 0) return;

    const alpha = Math.min(1, this.state.transcriptFadeTime / 500);
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = `16px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    // Background bar
    const text = `🎙️ "${this.state.lastTranscript}"`;
    const textWidth = ctx.measureText(text).width + 40;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.roundRect(
      ctx,
      w / 2 - textWidth / 2,
      h - 55,
      textWidth,
      36,
      18
    );
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(text, w / 2, h - 32);

    ctx.restore();
  }

  private renderPauseOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, w, h);

    ctx.font = `bold 48px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("⏸ PAUSED", w / 2, h / 2);

    ctx.font = `18px 'Inter', system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("Click Resume to continue", w / 2, h / 2 + 50);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  getState(): GameState {
    return { ...this.state };
  }
}
