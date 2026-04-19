import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import { DeepgramClient, type Deepgram } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error("CRITICAL: DEEPGRAM_API_KEY is not set in .env");
  process.exit(1);
}

// Initialize the Deepgram client
const deepgramClient = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);

  io.on("connection", async (socket) => {
    console.log("[PROXY] Client connected:", socket.id);

    let dgSocket: Awaited<ReturnType<(typeof deepgramClient.listen.v1)["connect"]>> | null = null;
    let chunksReceived = 0;

    // Wait for the client to send its word pool before connecting to Deepgram
    socket.on("init", async (payload: { keywords?: string[] }) => {
      const keywords = payload.keywords ?? [];
      console.log(`[PROXY] Received init with ${keywords.length} keywords`);

      try {
        // Build Deepgram connection config with latency optimizations
        if (keywords.length > 0) {
          console.log(`[PROXY] Keywords received (not sent to Deepgram — may require paid tier):`, keywords.slice(0, 5));
        }

        dgSocket = await deepgramClient.listen.v1.connect({
          model: "nova-2",
          interimResults: true,
          endpointing: false,                    // Keep original — 300ms value caused 400
          smartFormat: false,                   // #1: Skip punctuation/capitalization post-processing
          encoding: "opus",
          container: "webm",
        });

        // SDK v5: Explicitly start the handshake
        dgSocket.connect();

        dgSocket.on("open", () => {
          console.log("[PROXY] Deepgram WebSocket OPENED for client:", socket.id);
        });

        dgSocket.on("message", (message: Deepgram.listen.V1Socket.Response) => {
          if (message.type === "Results") {
            const transcript = message.channel.alternatives[0]?.transcript ?? "";
            const isFinal = message.is_final ?? false;
            if (transcript) {
              console.log(`[PROXY] Transcript: "${transcript}" (final: ${isFinal})`);
              socket.emit("transcript", { text: transcript, isFinal });
            }
          }
        });

        dgSocket.on("error", (err: Error) => {
          console.error("[PROXY] Deepgram Error:", err);
          socket.emit("error", "Deepgram processing error");
        });

        dgSocket.on("close", (event: any) => {
          console.log(`🚨 [PROXY] Deepgram Hung Up! Code: ${event?.code} Reason: ${event?.reason}`);
        });

        console.log("[PROXY] Waiting for Deepgram to be ready...");
        await dgSocket.waitForOpen();
        console.log("[PROXY] Deepgram is READY. Signaling client...");

        // Signal client that it's safe to start sending audio
        socket.emit("proxy-ready");

        // Now listen for client audio data
        socket.on("audio-chunk", (data: any) => {
          if (!dgSocket || dgSocket.readyState !== 1) return;

          if (chunksReceived === 0) {
            const isBuffer = Buffer.isBuffer(data);
            const dataLength = isBuffer ? data.length : (data.byteLength || 0);
            console.log(`[PROXY] First chunk: type=${typeof data}, isBuffer=${isBuffer}, size=${dataLength}b`);
          }

          chunksReceived++;
          dgSocket.sendMedia(data);
        });

      } catch (err) {
        console.error("[PROXY] Setup failed:", err);
        socket.emit("error", "Failed to initialize transcription proxy");
      }
    });

    socket.on("disconnect", () => {
      console.log("[PROXY] Client disconnected:", socket.id);
      if (dgSocket) {
        dgSocket.close();
        dgSocket = null;
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
