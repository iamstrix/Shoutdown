// ─── Web Speech API Wrapper ──────────────────────────────────────────────────

export type SpeechStatus = "none" | "starting" | "active" | "error" | "reconnecting";
export type TranscriptCallback = (transcript: string, isFinal: boolean) => void;
export type StatusCallback = (status: SpeechStatus) => void;

// ─── Web Speech API Type Declarations ────────────────────────────────────────
// These types aren't included in TypeScript's lib.dom by default

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Extend the Window interface for vendor-prefixed SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

const MIN_RESTART_DELAY = 300;
const MAX_RESTART_DELAY = 10000;
const BACKOFF_FACTOR = 1.5;

export class SpeechRecognitionEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private onTranscript: TranscriptCallback;
  private onStatus: StatusCallback;
  private isRunning = false;
  private shouldRestart = true;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private restartDelay = MIN_RESTART_DELAY;
  private currentStatus: SpeechStatus = "none";

  constructor(onTranscript: TranscriptCallback, onStatus: StatusCallback) {
    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
  }

  /**
   * Check if the Web Speech API is available in this browser.
   */
  static isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private setStatus(status: SpeechStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.onStatus(status);
    }
  }

  /**
   * Start continuous speech recognition.
   */
  start(): void {
    if (!SpeechRecognitionEngine.isSupported()) {
      console.warn("Speech recognition is not supported in this browser.");
      this.setStatus("none");
      return;
    }

    if (this.isRunning) {
      return; // Already running or starting
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 3;

      this.shouldRestart = true;
      this.setStatus(this.restartDelay > MIN_RESTART_DELAY ? "reconnecting" : "starting");

      this.recognition.onstart = () => {
        this.isRunning = true;
        this.restartDelay = MIN_RESTART_DELAY; // Reset backoff on success
        this.setStatus("active");
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();

          if (transcript) {
            this.onTranscript(transcript, result.isFinal);
          }

          if (result.isFinal && result.length > 1) {
            for (let alt = 1; alt < result.length; alt++) {
              const altTranscript = result[alt].transcript.trim();
              if (altTranscript && altTranscript !== transcript) {
                this.onTranscript(altTranscript, true);
              }
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        
        if (event.error === "aborted") return;

        if (event.error === "no-speech") {
          // Benign timeout - fast restart
          this.scheduleRestart(MIN_RESTART_DELAY);
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.shouldRestart = false;
          this.setStatus("error");
          return;
        }

        // Apply backoff for network or other critical errors
        this.setStatus("error");
        this.scheduleRestart(this.restartDelay);
        this.restartDelay = Math.min(MAX_RESTART_DELAY, this.restartDelay * BACKOFF_FACTOR);
      };

      this.recognition.onend = () => {
        this.isRunning = false;
        if (this.shouldRestart) {
          this.scheduleRestart(this.restartDelay);
        } else {
          this.setStatus("none");
        }
      };

      this.recognition.start();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      this.isRunning = false;
      this.scheduleRestart(this.restartDelay);
    }
  }

  /**
   * Stop speech recognition.
   */
  stop(): void {
    this.shouldRestart = false;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onend = null; // Prevent onend trigger
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }

    this.isRunning = false;
    this.setStatus("none");
  }

  /**
   * Schedule a restart after a delay.
   */
  private scheduleRestart(delay: number): void {
    if (!this.shouldRestart || this.restartTimeout) return;

    this.restartTimeout = setTimeout(() => {
      this.restartTimeout = null;
      if (this.shouldRestart) {
        this.cleanup();
        this.start();
      }
    }, delay);
  }

  private cleanup(): void {
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.isRunning = false;
  }

  get running(): boolean {
    return this.isRunning;
  }

  get status(): SpeechStatus {
    return this.currentStatus;
  }
}

