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
    <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "2rem", border: "10px solid var(--primary)", position: "relative" }}>
      {/* Decorative corners */}
      <div style={{ position: "absolute", top: -20, left: -20, width: 40, height: 40, background: "var(--secondary)" }} />
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 40, height: 40, background: "var(--secondary)" }} />

      <h1 style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>SHOUTDOWN</h1>
      <p style={{ marginBottom: "3rem", fontSize: "1.2rem", color: "var(--neutral)" }}>Speak to survive. Destroy the falling words.</p>

      <div style={{ marginBottom: "2rem" }}>
        <label htmlFor="topic-input" style={{ display: "block", marginBottom: "0.5rem", color: "var(--neutral)" }}>
          GENERATE FROM TOPIC
        </label>
        <div style={{ display: "flex", gap: "1rem" }}>
          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. CYBERPUNK, VOID"
            onKeyDown={(e) => e.key === "Enter" && handleGenerateWords()}
          />
          <button
            type="button"
            className="btn-generate"
            onClick={handleGenerateWords}
            disabled={!topic || isGenerating}
            style={{ whiteSpace: "nowrap" }}
          >
            {isGenerating ? "MAPPING..." : "GENERATE"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <label htmlFor="word-pool" style={{ display: "block", marginBottom: "0.5rem", color: "var(--neutral)" }}>
          WORD POOL
        </label>
        <textarea
          id="word-pool"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          placeholder="ENTER WORDS SEPARATED BY COMMAS..."
          rows={6}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.9rem", color: "var(--secondary)" }}>{parsedWords.length} LOADED</span>
        <button type="button" onClick={handleFillExample} style={{ border: "1px solid var(--neutral)", padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
          LOAD EXAMPLES
        </button>
      </div>

      {parsedWords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "3rem", padding: "1rem", background: "#111", borderLeft: "4px solid var(--primary)" }}>
          {parsedWords.map((word, i) => (
            <span key={i} style={{ color: "var(--foreground)", fontSize: "0.8rem", borderBottom: "1px solid #333" }}>
              {word}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleStartGame}
        disabled={!canStart}
        style={{ width: "100%", padding: "1.5rem", fontSize: "1.5rem", background: "var(--primary)", border: "none", color: "white" }}
      >
        START MISSION
      </button>

      <div style={{ marginTop: "4rem", borderTop: "2px solid #222", paddingTop: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>MISSION PARAMETERS</h2>
        <ul style={{ listStyle: "none", padding: 0, color: "var(--neutral)", fontSize: "0.9rem" }}>
          <li style={{ marginBottom: "0.5rem" }}>▲ ENABLE MICROPHONE ACCESS</li>
          <li style={{ marginBottom: "0.5rem" }}>▲ SHOUT WORDS BEFORE IMPACT</li>
          <li style={{ marginBottom: "0.5rem" }}>▲ DO NOT LET THEM REACH THE VOID</li>
        </ul>
      </div>
    </div>
  );
}

