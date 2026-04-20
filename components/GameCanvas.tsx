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
      case "active": return "#ECD444"; // Golden Glow
      case "starting":
      case "reconnecting": return "#6E2594"; // Rebecca Purple
      case "error": return "#ff4444";
      default: return "#808080"; // Grey
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
      <div style={{ position: "absolute", top: "1.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "1rem", zIndex: 10 }}>
        <button onClick={handlePause} id="pause-button" style={{ border: "2px solid var(--primary)", padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
          {gameState?.paused ? "RESUME" : "PAUSE"}
        </button>
        <button onClick={onBack} id="quit-button" style={{ border: "2px solid var(--neutral)", padding: "0.5rem 1rem", fontSize: "0.8rem", color: "var(--neutral)" }}>
          ABORT
        </button>
      </div>

      {/* Status Info */}
      <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", textAlign: "right", color: "var(--secondary)", pointerEvents: "none", fontFamily: "inherit" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: "900" }}>SCORE: {gameState?.score}</div>
        <div style={{ fontSize: "1rem", color: "var(--neutral)" }}>LIVES: {gameState?.lives}</div>
        <div style={{ color: getMicStatusColor(), fontWeight: "bold", fontSize: "0.8rem", marginTop: "0.5rem" }}>
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
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.95)", backdropFilter: "grayscale(1) blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <div style={{ border: "4px solid var(--primary)", background: "var(--background)", color: "var(--foreground)", padding: "3rem", maxWidth: "500px", width: "90%", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: -10, width: 20, height: 20, background: "var(--secondary)" }} />
            <div style={{ position: "absolute", bottom: -10, right: -10, width: 20, height: 20, background: "var(--secondary)" }} />
            
            <h2 style={{ fontSize: "3rem", margin: "0 0 2rem", color: "var(--secondary)" }}>TERMINATED</h2>
            <div style={{ marginBottom: "2rem", borderTop: "1px solid #222", borderBottom: "1px solid #222", padding: "1rem 0" }}>
              <p style={{ margin: "0.5rem 0" }}>SCORE: <strong style={{ color: "var(--secondary)" }}>{finalScore}</strong></p>
              <p style={{ margin: "0.5rem 0" }}>WORDS CLEARED: <strong>{finalWordsCleared}</strong></p>
              <p style={{ margin: "0.5rem 0" }}>MAX COMBO: <strong>{gameState?.maxCombo ?? 0}X</strong></p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button 
                onClick={handlePlayAgain} 
                id="play-again-button" 
                style={{ background: "var(--secondary)", color: "var(--background)", padding: "1.2rem", fontSize: "1.2rem", fontWeight: "bold", border: "none" }}
              >
                REINITIALIZE
              </button>
              <button 
                onClick={onBack} 
                id="back-menu-button" 
                style={{ background: "transparent", color: "var(--neutral)", border: "1px solid var(--neutral)" }}
              >
                RETURN TO HQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


