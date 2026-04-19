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
        <button onClick={handlePause} id="pause-button">
          {gameState?.paused ? "Resume" : "Pause"}
        </button>
        <button onClick={onBack} id="quit-button">
          Quit
        </button>
      </div>

      {/* Status Info */}
      <div style={{ position: "absolute", top: "1rem", right: "1rem", textAlign: "right", color: "#fff", pointerEvents: "none" }}>
        <div>Score: {gameState?.score}</div>
        <div>Lives: {gameState?.lives}</div>
        <div style={{ color: getMicStatusColor(), fontWeight: "bold" }}>
          Mic: {getMicStatusLabel()}
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
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <div style={{ background: "#fff", color: "#000", padding: "2rem", maxWidth: "400px", width: "90%", textAlign: "center", margin: "auto" }}>
            <h2 style={{ fontSize: "2rem", margin: "0 0 1rem" }}>GAME OVER</h2>
            <div style={{ marginBottom: "1.5rem" }}>
              <p>Final Score: <strong>{finalScore}</strong></p>
              <p>Words Cleared: <strong>{finalWordsCleared}</strong></p>
              <p>Max Combo: <strong>{gameState?.maxCombo ?? 0}x</strong></p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button onClick={handlePlayAgain} id="play-again-button" style={{ padding: "1rem", fontWeight: "bold" }}>
                PLAY AGAIN
              </button>
              <button onClick={onBack} id="back-menu-button">
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


