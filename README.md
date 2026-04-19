# 🎙️ SHOUTDOWN — Voice-Controlled Falling Words Game

A Z-Type inspired falling-words game where you **shout words** to destroy them before they hit the bottom. Built with Next.js, HTML5 Canvas, and the Web Speech API.

![Next.js](https://img.shields.io/badge/Next.js-15+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Features

- **Voice-controlled gameplay** — Say the words to clear them
- **Canvas-based rendering** — Smooth 60fps game loop with `requestAnimationFrame`
- **Fuzzy matching** — Smart Levenshtein-based matching handles pronunciation variations
- **Progressive difficulty** — Words spawn faster and fall quicker over time
- **Combo system** — Chain clears for score multipliers
- **Particle effects** — Satisfying clear animations and particles
- **Mobile friendly** — Responsive canvas that works on any screen size
- **100% client-side** — Zero backend, zero API keys, zero database

## 🚀 Quick Start

### Create from scratch

```bash
npx -y create-next-app@latest shoutdown --typescript --tailwind --app --use-npm --yes --eslint
cd shoutdown
```

Then replace the project files with the ones from this repo.

### Run the game

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** or **Edge** (required for Web Speech API).

## 🎯 How to Play

1. **Paste your word pool** — Enter comma-separated words (or click "Load example")
2. **Start the game** — Click the Start button
3. **Allow microphone access** — The browser will ask for mic permission
4. **Speak the words!** — Say each falling word before it reaches the bottom
5. **Build combos** — Chain successful clears for bonus multipliers
6. **Survive** — You have 5 lives. Each missed word costs 1 life.

## 🏗️ Project Structure

```
shoutdown/
├── app/
│   ├── globals.css          # Global styles, animations, theme
│   ├── layout.tsx           # Root layout with SEO metadata
│   └── page.tsx             # Home/Setup screen + game wrapper
├── components/
│   └── GameCanvas.tsx       # React canvas component + speech integration
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   ├── game-engine.ts       # Canvas game loop, rendering, physics
│   ├── fuzzy-match.ts       # Levenshtein distance matching
│   └── speech-recognition.ts # Web Speech API wrapper
├── package.json
├── tsconfig.json
└── README.md
```

## 🧠 Technical Details

### Game Engine
- Single `GameEngine` class manages the entire canvas loop
- 60fps target with delta-time based updates
- Device pixel ratio aware for crisp rendering on HiDPI displays
- Starfield background, danger zone, HUD, particle system

### Speech Recognition
- Uses the native `SpeechRecognition` API (`webkitSpeechRecognition` on Chrome)
- `continuous: true` + `interimResults: true` for real-time transcription
- Auto-restart on silence/errors for uninterrupted gameplay
- Processes alternative transcripts for better matching accuracy

### Fuzzy Matching
- Levenshtein distance with normalized similarity scoring
- Multi-strategy matching: exact, substring, token-level, full fuzzy
- Configurable threshold (default: 0.35 — quite forgiving)

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Edge    | ✅ Full |
| Firefox | ❌ No Web Speech API |
| Safari  | ⚠️ Partial (limited SpeechRecognition) |
| Brave   | ❌ Privacy blocks speech service |

## 📝 License

MIT — do whatever you want with it.
