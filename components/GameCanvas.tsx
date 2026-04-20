"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { GameEngine } from "@/lib/game-engine";
import { SpeechRecognitionEngine, type SpeechStatus } from "@/lib/speech-recognition";
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
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("none");

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
        (status) => {
          setSpeechStatus(status);
          engine.setMicActive(status === "active");
        },
        wordPool // Pass the game's word pool as Deepgram keywords
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

  const getMicStatusColor = () => {
    switch (speechStatus) {
      case "active": return "#0f0";
      case "starting":
      case "reconnecting": return "#ff0";
      case "error": return "#f00";
      default: return "#888";
    }
  };

  const getMicStatusLabel = () => {
    switch (speechStatus) {
      case "active": return "ON";
      case "starting": return "Starting...";
      case "reconnecting": return "Reconnecting...";
      case "error": return "Error";
      default: return "OFF";
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", backgroundColor: "#000" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />

      {/* Top controls overlay */}
      <div style={{ position: "absolute", top: "1rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "1rem", zIndex: 10 }}>
        <button onClick={handlePause} id="pause-button" style={{ background: "rgba(59, 130, 246, 0.05)", color: "var(--accent)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "2px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px" }}>
          {gameState?.paused ? "Resume" : "Pause"}
        </button>
        <button onClick={onBack} id="quit-button" style={{ background: "rgba(255, 255, 255, 0.05)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "2px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px" }}>
          Quit
        </button>
      </div>

      {/* Status Info */}
      <div style={{ position: "absolute", top: "1.2rem", right: "1.5rem", textAlign: "right", color: "#fff", pointerEvents: "none", fontFamily: "monospace", fontSize: "1rem", letterSpacing: "1px" }}>
        <div style={{ opacity: 0.7 }}>SCORE: <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{gameState?.score}</span></div>
        <div style={{ opacity: 0.7 }}>LIVES: <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{gameState?.lives}</span></div>
        <div style={{ color: getMicStatusColor(), fontWeight: "bold", fontSize: "0.8rem", marginTop: "0.2rem" }}>
          MIC: {getMicStatusLabel()}
        </div>
      </div>

      {/* Speech not supported warning */}
      {!speechSupported && (
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "yellow", color: "black", padding: "1rem", border: "1px solid black" }}>
          Speech recognition is not supported in this browser.
        </div>
      )}

      {/* Game Over Overlay */}
      {showGameOver && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <div style={{ background: "#050505", color: "#fff", padding: "3rem 2rem", maxWidth: "420px", width: "90%", textAlign: "center", border: "1px solid var(--accent)", borderRadius: "2px", boxShadow: "0 0 40px rgba(59, 130, 246, 0.15)" }}>
            <h2 style={{ fontSize: "2.5rem", margin: "0 0 1.5rem", letterSpacing: "6px", color: "var(--accent)", fontWeight: "900" }}>GAME OVER</h2>
            <div style={{ marginBottom: "2rem", opacity: 0.9, fontFamily: "monospace", fontSize: "1.1rem" }}>
              <p style={{ marginBottom: "0.5rem" }}>FINAL SCORE: <strong style={{ color: "var(--accent)" }}>{finalScore}</strong></p>
              <p style={{ marginBottom: "0.5rem" }}>WORDS CLEARED: <strong style={{ color: "var(--accent)" }}>{finalWordsCleared}</strong></p>
              <p>MAX COMBO: <strong style={{ color: "var(--accent)" }}>{gameState?.maxCombo ?? 0}x</strong></p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button 
                onClick={handlePlayAgain} 
                id="play-again-button" 
                style={{ background: "var(--accent)", color: "#000", padding: "1.2rem", fontWeight: "bold", border: "none", borderRadius: "2px", letterSpacing: "2px", textTransform: "uppercase" }}
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={onBack} 
                id="back-menu-button" 
                style={{ background: "transparent", color: "#fff", border: "1px solid #222", padding: "0.8rem", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


