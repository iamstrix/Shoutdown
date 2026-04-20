"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { EXAMPLE_WORDS } from "@/lib/types";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => <div style={{ padding: "2rem" }}>Loading game...</div>,
});

type GameScreen = "setup" | "playing";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("setup");
  const [wordInput, setWordInput] = useState("");
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerateWords = async () => {
    if (!topic || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.words) {
        setWordInput(data.words);
      } else if (data.error) {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate words. Check console.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = useCallback(() => {
    setScreen("setup");
    setWordPool([]);
  }, []);

  if (screen === "playing") {
    return (
      <GameCanvas
        wordPool={wordPool}
        onGameOver={() => {}}
        onBack={handleBack}
      />
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "var(--accent)", letterSpacing: "4px", marginBottom: "0.5rem" }}>SHOUTDOWN</h1>
      <p style={{ opacity: 0.6, marginBottom: "2rem" }}>Voice-controlled words game. Speak the words to clear them.</p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="topic-input" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>
          Generate from Topic:
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Space, Cooking"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateWords()}
          />
          <button
            type="button"
            onClick={handleGenerateWords}
            disabled={!topic || isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="word-pool" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>
          Word Pool (comma-separated):
        </label>
        <textarea
          id="word-pool"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          placeholder="e.g. apple, banana, cherry"
          rows={6}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <span>{parsedWords.length} words loaded</span>
        <button type="button" onClick={handleFillExample}>
          Load Examples
        </button>
      </div>

      {parsedWords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {parsedWords.map((word, i) => (
            <span key={i} style={{ border: "1px solid var(--accent)", padding: "0.2rem 0.6rem", fontSize: "0.8rem", color: "var(--accent)", borderRadius: "2px" }}>
              {word}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleStartGame}
        disabled={!canStart}
        style={{ 
          width: "100%", 
          padding: "1.2rem", 
          fontWeight: "bold", 
          background: "var(--accent)", 
          color: "#000", 
          border: "none",
          fontSize: "1.1rem",
          letterSpacing: "1px"
        }}
      >
        START GAME
      </button>

      <div style={{ marginTop: "3rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem", opacity: 0.6, fontSize: "0.9rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--foreground)" }}>How to Play</h2>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li>Allow microphone access when prompted.</li>
          <li>Speak the words that fall from the top of the screen.</li>
          <li>Don't let them reach the bottom!</li>
        </ul>
      </div>
    </div>
  );
}

