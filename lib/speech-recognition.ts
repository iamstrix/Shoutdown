// ─── Deepgram Speech Recognition Engine ───────────────────────────────────────
import { io, Socket } from "socket.io-client";

export type SpeechStatus = "none" | "starting" | "active" | "error" | "reconnecting";
export type TranscriptCallback = (transcript: string, isFinal: boolean) => void;
export type StatusCallback = (status: SpeechStatus) => void;

export class SpeechRecognitionEngine {
  private socket: Socket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onTranscript: TranscriptCallback;
  private onStatus: StatusCallback;
  private currentStatus: SpeechStatus = "none";
  private isRunning = false;

  constructor(onTranscript: TranscriptCallback, onStatus: StatusCallback) {
    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && !!navigator.mediaDevices;
  }

  private setStatus(status: SpeechStatus) {
    if (this.currentStatus !== status) {
      console.log(`[SPEECH] Status change: ${this.currentStatus} -> ${status}`);
      this.currentStatus = status;
      this.onStatus(status);
    }
  }

  /**
   * Start streaming audio to the backend proxy for Deepgram processing.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.setStatus("starting");

      // Initialize Socket.io connection to our backend
      this.socket = io();

      this.socket.on("connect", () => {
        console.log("[SPEECH] Socket.io connected, awaiting proxy-ready...");
      });

      // KEY FIX: Only start the recorder after the proxy tells us it's fully connected to Deepgram.
      // This ensures the first chunk (with WebM headers) is not dropped.
      this.socket.on("proxy-ready", () => {
        console.log("[SPEECH] Received proxy-ready signal. Initializing mic...");
        this.initializeMediaRecorder();
      });

      this.socket.on("transcript", (data: { text: string; isFinal: boolean }) => {
        if (data.text) {
          this.onTranscript(data.text, data.isFinal);
        }
      });

      this.socket.on("error", (err: string) => {
        console.error("[SPEECH] Server reported error:", err);
        this.setStatus("error");
      });

      this.socket.on("disconnect", () => {
        console.log("[SPEECH] Socket.io disconnected");
        if (this.isRunning) {
          this.setStatus("reconnecting");
          this.stopMediaRecorder();
        }
      });

    } catch (error) {
      console.error("[SPEECH] Failed to start stream:", error);
      this.setStatus("error");
      this.stop();
    }
  }

  private async initializeMediaRecorder() {
    try {
      // Capture Microphone
      console.log("[SPEECH] Requesting microphone access...");
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[SPEECH] Microphone access granted");
      
      // We use webm/opus for standard streaming compatibility
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm; codecs=opus",
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket?.connected) {
          // Send raw Blob. Socket.io handles Blob/Buffer conversion.
          this.socket.emit("audio-chunk", event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("[SPEECH] MediaRecorder error:", event);
        this.setStatus("error");
      };

      this.mediaRecorder.start(250); // Timeslice: 250ms chunks as requested
      console.log("[SPEECH] MediaRecorder started (250ms intervals)");
      
      this.isRunning = true;
      this.setStatus("active");
    } catch (err) {
      console.error("[SPEECH] Media initialization failed:", err);
      this.setStatus("error");
    }
  }

  private stopMediaRecorder() {
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Stop audio capture and close WebSocket.
   */
  stop(): void {
    console.log("[SPEECH] Stopping engine...");
    this.isRunning = false;
    this.stopMediaRecorder();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setStatus("none");
  }

  get running(): boolean {
    return this.isRunning;
  }

  get status(): SpeechStatus {
    return this.currentStatus;
  }
}
