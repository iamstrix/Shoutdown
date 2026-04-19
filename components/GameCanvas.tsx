"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { GameEngine } from "@/lib/game-engine";
import { SpeechRecognitionEngine } from "@/lib/speech-recognition";
import type { GameState, GameConfig } from "@/lib/types";

interface GameCanvasProps {
  wordPool: string[];
  onGameOver: (score: number, wordsCleared: number) => void;
  onBack: () => void;
}

export default function GameCanvas({ wordPool, onGameOver, onBack }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const speechRef = useRef<SpeechRecognitionEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalWordsCleared, setFinalWordsCleared] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);

  const handleGameOver = useCallback(
    (score: number, wordsCleared: number) => {
      setFinalScore(score);
      setFinalWordsCleared(wordsCleared);
      setShowGameOver(true);

      // Stop speech
      if (speechRef.current) {
        speechRef.current.stop();
      }

      onGameOver(score, wordsCleared);
    },
    [onGameOver]
  );

  // Initialize the game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config: Partial<GameConfig> = {
      wordPool,
    };

    const engine = new GameEngine(
      canvas,
      config,
      (state) => setGameState(state),
      handleGameOver
    );

    engineRef.current = engine;
    engine.start();

    // Setup speech recognition
    if (SpeechRecognitionEngine.isSupported()) {
      const speech = new SpeechRecognitionEngine(
        (transcript, isFinal) => {
          engine.handleTranscript(transcript, isFinal);
        },
        (active) => {
          engine.setMicActive(active);
        }
      );
      speechRef.current = speech;
      speech.start();
    } else {
      setSpeechSupported(false);
    }

    // Handle resize
    const handleResize = () => {
      engine.resizeCanvas();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      engine.stop();
      if (speechRef.current) {
        speechRef.current.stop();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [wordPool, handleGameOver]);

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  const handlePlayAgain = () => {
    // Reload the page to restart
    window.location.reload();
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#0a0a1a]">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />

      {/* Top controls overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <button
          onClick={handlePause}
          className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20
                     text-white text-sm font-medium hover:bg-white/20 transition-all duration-200
                     active:scale-95 cursor-pointer"
          id="pause-button"
        >
          {gameState?.paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20
                     text-white text-sm font-medium hover:bg-white/20 transition-all duration-200
                     active:scale-95 cursor-pointer"
          id="quit-button"
        >
          ✕ Quit
        </button>
      </div>

      {/* Speech not supported warning */}
      {!speechSupported && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 
                        bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 
                        rounded-2xl text-yellow-200 text-sm text-center max-w-sm">
          ⚠️ Speech recognition is not supported in this browser. 
          Please use Chrome or Edge for voice control.
        </div>
      )}

      {/* Game Over Overlay */}
      {showGameOver && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in">
          <div className="bg-gradient-to-b from-[#1a1a3a] to-[#0d0d25] border border-white/10 
                          rounded-3xl p-8 md:p-12 max-w-md w-[90%] text-center shadow-2xl">
            <h2 className="text-5xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-cyan-400 mx-auto mb-6 rounded-full" />

            <div className="space-y-4 mb-8">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/50 text-sm uppercase tracking-wider mb-1">Final Score</p>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                  {finalScore.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Words Cleared</p>
                  <p className="text-2xl font-bold text-green-400">{finalWordsCleared}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Max Combo</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {gameState?.maxCombo ?? 0}x
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePlayAgain}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 
                           text-white font-bold text-lg hover:from-purple-500 hover:to-cyan-400 
                           transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25
                           active:scale-95 cursor-pointer"
                id="play-again-button"
              >
                🔄 Play Again
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 
                           text-white/70 font-medium hover:bg-white/10 
                           transition-all duration-200 active:scale-95 cursor-pointer"
                id="back-menu-button"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
