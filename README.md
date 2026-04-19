# 🎙️ SHOUTDOWN — Voice-Controlled Falling Words Game

A Z-Type inspired falling-words game where you **shout words** to destroy them before they hit the bottom. Powered by **Deepgram** for ultra-low latency voice recognition and **Groq** for AI-powered word pool generation.

![Next.js](https://img.shields.io/badge/Next.js-15+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Deepgram](https://img.shields.io/badge/Deepgram-STT-red)
![Groq](https://img.shields.io/badge/Groq-AI-orange)

## 🎮 Features

- **Voice-controlled gameplay** — Use your voice to clear words in real-time.
- **AI Word Generation** — Enter any topic and let **Groq (Llama 3)** generate a relevant word pool for you.
- **Ultra-Low Latency** — Uses a custom Node.js proxy and Deepgram WebSockets for near-instant transcription.
- **Minimalist Aesthetic** — Sleek dark-mode canvas with smooth 60fps rendering.
- **Fuzzy Matching** — Smart Levenshtein-based matching handles pronunciation variations and accents.
- **Progressive Difficulty** — Words spawn faster and fall quicker as your score increases.

## 🚀 Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Deepgram API Key](https://console.deepgram.com/)
- A [Groq API Key](https://console.groq.com/)

### 2. Installation

```bash
git clone https://github.com/your-username/shoutdown.git
cd shoutdown
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
```

### 4. Run the Game

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** or **Edge**.

## 🎯 How to Play

1.  **Select a Topic** — Enter a topic (e.g., "Space", "Cooking") and click **Generate** to let the AI build your word pool.
2.  **Start the Game** — Click the **START GAME** button.
3.  **Allow Microphone Access** — Ensure your browser has permission to use your mic.
4.  **Speak the Words!** — Shout the words falling from the top. Clear them before they hit the bottom!
5.  **Build Combos** — Chain successful clears for bonus multipliers and higher scores.
6.  **Survival** — You have 5 lives. Each missed word costs 1 life.

## 🏗️ Project Structure

```
shoutdown/
├── app/
│   ├── api/generate/    # Groq AI word generation endpoint
│   ├── globals.css      # Dark theme & global styles
│   └── page.tsx         # Setup screen & game controller
├── components/
│   └── GameCanvas.tsx   # React canvas + Socket.io integration
├── lib/
│   ├── game-engine.ts   # Canvas rendering & game logic
│   ├── fuzzy-match.ts   # Similarity matching algorithm
│   └── types.ts         # TypeScript interfaces
├── server.ts            # Custom Node.js server (Socket.io + Deepgram Proxy)
└── .env                 # API Credentials
```

## 🧠 Technical Details

### Deepgram Proxy Server
To ensure maximum security and performance, voice data is proxied through a custom Node.js server (`server.ts`). This server manages a persistent WebSocket connection to Deepgram, minimizing handshake overhead and keeping API keys hidden from the client.

### Groq AI Generation
The game uses the `llama-3.3-70b-versatile` model on Groq to instantly generate 15-20 contextually relevant words based on user input, making every session unique.

### Fuzzy Matching
The engine uses a combination of Levenshtein distance and token-based similarity to ensure that even if the transcription isn't 100% perfect, your clear will still count (configurable threshold).

## 📝 License

MIT — Created with ❤️ for voice-controlled gaming.
