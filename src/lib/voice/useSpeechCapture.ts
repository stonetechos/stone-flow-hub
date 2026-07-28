/**
 * Voice-capture foundation (Goal 5) — browser-native speech-to-text.
 *
 * Deliberately built on the Web Speech API (`SpeechRecognition` /
 * `webkitSpeechRecognition`) rather than a server round trip: it needs no
 * new credentials, no new vendor integration, and works today in every
 * Chromium-based browser (including Android WebView/Capacitor, which this
 * app already ships on — see capacitor.config.ts). This is genuinely a
 * FOUNDATION, not the final word on voice quality — see the honest
 * limitation below before assuming it handles every case the target
 * workflow describes.
 *
 * What this hook does NOT do: any parsing, extraction, or interpretation
 * of what was said. It only turns audio into text and hands that text to
 * the caller — same "the LLM understands, the ERP decides" separation of
 * concerns nl-search.functions.ts's header comment establishes. In
 * Copilot.tsx, the transcript lands straight in the existing "Do" mode
 * textarea and flows through the ALREADY-WORKING VIE pipeline
 * (understand.ts's LLM classification -> Planner -> Workflow Engine) —
 * this hook adds zero new parsing rules, exactly per the brief's "do not
 * hardcode parsing rules" instruction.
 *
 * KNOWN LIMITATION, stated plainly rather than glossed over: the Web
 * Speech API's `lang` parameter selects ONE recognition language per
 * session (e.g. "en-IN", "hi-IN", "gu-IN") — it does not reliably handle
 * intra-sentence code-switching the way understand.ts's LLM classifier
 * already does for TYPED mixed-language text (see prompts.ts's Gujlish
 * few-shot examples). A sentence that switches between Hindi and English
 * mid-utterance may transcribe accurately only in the selected language's
 * words and mangle the others. This hook defaults to `en-IN` (broadest
 * practical coverage for Indian English plus a fair amount of
 * Hindi/Gujarati loanword tolerance in Chrome's implementation) and
 * exposes `setLanguage` so a user can switch for a mostly-Hindi or
 * mostly-Gujarati utterance, but true robust code-switched transcription
 * needs a server-side model with native audio understanding (e.g. asking
 * the Lovable AI Gateway for a multimodal-audio-capable model) — flagged
 * as the clear next step in this sprint's final report, not implemented
 * here since it needs a credentials/cost decision this sandbox can't make
 * unilaterally.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechCaptureLanguage = "en-IN" | "hi-IN" | "gu-IN";

export interface UseSpeechCaptureResult {
  /** True if this browser/WebView exposes any SpeechRecognition implementation. */
  isSupported: boolean;
  isListening: boolean;
  /** Set once recognition starts producing text; caller decides what to do with it. */
  transcript: string;
  error: string | null;
  language: SpeechCaptureLanguage;
  setLanguage: (lang: SpeechCaptureLanguage) => void;
  start: () => void;
  stop: () => void;
}

// The Web Speech API has no first-party TypeScript lib types (it's
// non-standard/vendor-prefixed) — this is the minimal shape this hook
// actually uses, not a claim of the full spec.
interface MinimalSpeechRecognitionResult {
  0: { transcript: string };
}
interface MinimalSpeechRecognitionEvent {
  results: ArrayLike<MinimalSpeechRecognitionResult>;
}
interface MinimalSpeechRecognitionErrorEvent {
  error?: string;
}
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: MinimalSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as new () => MinimalSpeechRecognition) : null;
}

export function useSpeechCapture(): UseSpeechCaptureResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<SpeechCaptureLanguage>("en-IN");
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  const isSupported = getSpeechRecognitionCtor() !== null;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");

    const recognition = new Ctor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      // Concatenate every result segment recognized so far in this
      // session — interimResults means this fires repeatedly as the
      // transcript firms up, not just once at the end.
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined);
    };
    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine (user paused or hit stop
      // manually) — surfacing those as an error message would be noise,
      // not a real failure worth showing.
      const code = event?.error;
      if (code && code !== "no-speech" && code !== "aborted") {
        setError(`Voice input error: ${code}`);
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [language]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { isSupported, isListening, transcript, error, language, setLanguage, start, stop };
}
