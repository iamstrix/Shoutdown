"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { EXAMPLE_WORDS } from "@/lib/types";

// Dynamic import to avoid SSR issues with canvas/speech APIs
const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-[#0a0a1a]">
      <div className="text-white/50 text-lg animate-pulse">Loading game...</div>
    </div>
  ),
});

type GameScreen = "setup" | "playing";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("setup");
  const [wordInput, setWordInput] = useState("");
  const [wordPool, setWordPool] = useState<string[]>([]);

  const parsedWords = wordInput
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const canStart = parsedWords.length >= 2;

  const handleStartGame = () => {
    if (!canStart) return;
    setWordPool(parsedWords);
    setScreen("playing");
  };

  const handleFillExample = () => {
    setWordInput(EXAMPLE_WORDS.join(", "));
  };

  const handleBack = useCallback(() => {
    setScreen("setup");
    setWordPool([]);
  }, []);

  const handleGameOver = useCallback((_score: number, _wordsCleared: number) => {
    // Game over is handled within GameCanvas overlay
  }, []);

  // ── Game Screen ────────────────────────────────────────────────
  if (screen === "playing") {
    return (
      <GameCanvas
        wordPool={wordPool}
        onGameOver={handleGameOver}
        onBack={handleBack}
      />
    );
  }

  // ── Setup Screen ───────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-dvh flex flex-col items-center justify-center bg-[#0a0a1a] bg-grid overflow-auto">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full animate-gradient opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full animate-gradient opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)",
            animationDelay: "3s",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-lg mx-auto px-4 py-12 md:py-16 animate-fade-in"
      >
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-gradient mb-3 select-none">
            SHOUTDOWN
          </h1>
          <p className="text-white/40 text-lg font-medium tracking-wide">
            Shout the words before they fall ⚡
          </p>
        </div>

        {/* Card body */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl animate-slide-up">
          {/* Word pool input */}
          <div className="mb-5">
            <label
              htmlFor="word-pool"
              className="block text-sm font-semibold text-white/60 mb-2 tracking-wide uppercase"
            >
              📝 Paste your word pool (comma-separated)
            </label>
            <textarea
              id="word-pool"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Enter words separated by commas..."
              rows={4}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white 
                         placeholder:text-white/20 resize-none text-base leading-relaxed transition-all duration-300"
            />
          </div>

          {/* Word count + example */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-white/30">
              {parsedWords.length > 0 ? (
                <span>
                  <span className="text-white/60 font-semibold">
                    {parsedWords.length}
                  </span>{" "}
                  word{parsedWords.length !== 1 ? "s" : ""} loaded
                </span>
              ) : (
                "No words yet"
              )}
            </span>
            <button
              onClick={handleFillExample}
              className="text-sm text-purple-400 hover:text-purple-300 font-medium 
                         transition-colors duration-200 cursor-pointer"
              id="example-button"
            >
              ✨ Load example
            </button>
          </div>

          {/* Word preview chips */}
          {parsedWords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 max-h-28 overflow-y-auto pr-1">
              {parsedWords.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium 
                             bg-purple-500/10 text-purple-300 border border-purple-500/20"
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 
                       cursor-pointer active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed
                       disabled:hover:shadow-none relative overflow-hidden group"
            style={{
              background: canStart
                ? "linear-gradient(135deg, #8b5cf6, #06b6d4)"
                : "rgba(255,255,255,0.05)",
              color: canStart ? "#fff" : "rgba(255,255,255,0.3)",
              boxShadow: canStart
                ? "0 8px 30px rgba(139, 92, 246, 0.3)"
                : "none",
            }}
            id="start-game-button"
          >
            {/* Shimmer effect */}
            {canStart && (
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                }}
              />
            )}
            <span className="relative z-10">
              {canStart ? "🎮 Start Game" : "Enter at least 2 words to start"}
            </span>
          </button>
        </div>

        {/* How to play */}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-3">
              How to Play
            </h3>
            <ul className="space-y-2.5 text-sm text-white/35 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">🎙️</span>
                <span>
                  <strong className="text-white/50">Speak</strong> the falling words to destroy them
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">⚡</span>
                <span>
                  Words get <strong className="text-white/50">faster</strong> and more{" "}
                  <strong className="text-white/50">frequent</strong> over time
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400 mt-0.5">💔</span>
                <span>
                  Lose a life when a word reaches the{" "}
                  <strong className="text-white/50">bottom</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">🔥</span>
                <span>
                  Build <strong className="text-white/50">combos</strong> for bonus
                  score multipliers
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Browser notice */}
        <p className="text-center text-white/15 text-xs mt-6">
          Best experience in Chrome or Edge • Microphone required
        </p>
      </div>
    </div>
  );
}
