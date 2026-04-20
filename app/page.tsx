"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { EXAMPLE_WORDS, PREDEFINED_CATEGORIES } from "@/lib/types";

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

  const handleSelectCategory = (categoryName: string) => {
    const words = PREDEFINED_CATEGORIES[categoryName as keyof typeof PREDEFINED_CATEGORIES];
    setWordInput(words.join(", "));
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
      <h1>SHOUTDOWN</h1>
      <p>Voice-controlled words game. Speak the words to clear them.</p>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Categories:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {Object.keys(PREDEFINED_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="word-pool" style={{ display: "block", marginBottom: "0.5rem" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{parsedWords.length} words loaded</span>
          <button type="button" onClick={handleFillExample} style={{ fontSize: "0.85rem" }}>
            Load Starter (Genshin)
          </button>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="AI Prompt (e.g. 80s Movies)"
            style={{ flex: 1, padding: "0.5rem", border: "1px solid #ccc", fontSize: "0.9rem" }}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateWords()}
          />
          <button
            type="button"
            onClick={handleGenerateWords}
            disabled={!topic || isGenerating}
            style={{ fontWeight: "normal", fontSize: "0.9rem" }}
          >
            {isGenerating ? "AI Thinking..." : "AI Generate ✨"}
          </button>
        </div>
      </div>

      {parsedWords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          {parsedWords.map((word, i) => (
            <span key={i} style={{ border: "1px solid #ccc", padding: "0.2rem 0.5rem" }}>
              {word}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleStartGame}
        disabled={!canStart}
        style={{ width: "100%", padding: "1rem", fontWeight: "bold" }}
      >
        START GAME
      </button>

      <div style={{ marginTop: "2rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
        <h2>How to Play</h2>
        <ul>
          <li>Allow microphone access when prompted.</li>
          <li>Speak the words that fall from the top of the screen.</li>
          <li>Don't let them reach the bottom!</li>
        </ul>
      </div>
    </div>
  );
}

