// ─── Web Speech API Wrapper ──────────────────────────────────────────────────

export type TranscriptCallback = (transcript: string, isFinal: boolean) => void;
export type StatusCallback = (active: boolean) => void;

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

export class SpeechRecognitionEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private onTranscript: TranscriptCallback;
  private onStatus: StatusCallback;
  private isRunning = false;
  private shouldRestart = true;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

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

  /**
   * Start continuous speech recognition.
   */
  start(): void {
    if (!SpeechRecognitionEngine.isSupported()) {
      console.warn("Speech recognition is not supported in this browser.");
      this.onStatus(false);
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 3;

    this.shouldRestart = true;

    this.recognition.onstart = () => {
      this.isRunning = true;
      this.onStatus(true);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Process results from the latest result onwards
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (transcript) {
          this.onTranscript(transcript, result.isFinal);
        }

        // Also check alternative results for better matching
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

      if (event.error === "aborted") {
        // Normal when we stop/restart, just ignore
        return;
      }

      if (event.error === "no-speech") {
        // Silence detected — restart
        this.scheduleRestart();
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.onStatus(false);
        this.shouldRestart = false;
        return;
      }

      // For network errors or others, try restarting
      this.scheduleRestart();
    };

    this.recognition.onend = () => {
      this.isRunning = false;

      // Auto-restart if we should keep listening
      if (this.shouldRestart) {
        this.scheduleRestart();
      } else {
        this.onStatus(false);
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      this.scheduleRestart();
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
        this.recognition.abort();
      } catch {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }

    this.isRunning = false;
    this.onStatus(false);
  }

  /**
   * Schedule a restart after a short delay.
   */
  private scheduleRestart(): void {
    if (!this.shouldRestart) return;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    this.restartTimeout = setTimeout(() => {
      if (this.shouldRestart) {
        // Clean up old recognition
        if (this.recognition) {
          try {
            this.recognition.abort();
          } catch {
            // Ignore
          }
        }
        this.start();
      }
    }, 300);
  }

  /**
   * Whether recognition is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }
}
