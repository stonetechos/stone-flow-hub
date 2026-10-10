/**
 * Store Employee Voice Assistant — Mic in Circle with Radiating Turquoise Rings.
 *
 * Lightweight, elegant circular mic control with continuous radiating turquoise rings.
 * Tapping records customer details via browser speech recognition, automatically
 * feeds them into the customer form, and prompts for quick review before saving.
 */
import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, RotateCcw } from "lucide-react";
import { useSpeechCapture, type SpeechCaptureLanguage } from "@/lib/voice/useSpeechCapture";
import { parseVoiceCustomer, type ParsedVoiceCustomer } from "@/lib/customers/voice-parser";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StoreVoiceAssistantTabProps {
  onCustomerExtracted: (parsed: ParsedVoiceCustomer) => void;
  className?: string;
  compact?: boolean;
}

export function StoreVoiceAssistantTab({
  onCustomerExtracted,
  className,
  compact = false,
}: StoreVoiceAssistantTabProps) {
  const speech = useSpeechCapture();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessTranscript = useCallback(
    (text: string) => {
      setIsProcessing(true);
      try {
        const parsed = parseVoiceCustomer(text);
        onCustomerExtracted(parsed);
        toast.success(`Voice captured: ${parsed.name || "Customer"}. Details filled for review.`, {
          icon: "✨",
        });
      } catch (err) {
        console.error("[StoreVoiceAssistant] Parsing error:", err);
        toast.error("Could not parse spoken input. Please try speaking again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onCustomerExtracted],
  );

  // When listening stops, process the recorded transcript
  useEffect(() => {
    if (!speech.isListening && speech.transcript.trim() && !isProcessing) {
      handleProcessTranscript(speech.transcript.trim());
    }
  }, [speech.isListening, speech.transcript, isProcessing, handleProcessTranscript]);

  const handleToggle = () => {
    if (speech.isListening) {
      speech.stop();
    } else {
      speech.start();
    }
  };

  const handleReset = () => {
    speech.reset();
  };

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      {/* Mic circle with radiating turquoise rings */}
      <div className="relative inline-flex items-center justify-center p-1.5">
        {/* Radiating Turquoise Rings */}
        <span className="absolute inset-0 rounded-full border-2 border-teal-400/80 animate-radiate-rings pointer-events-none" />
        <span className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-radiate-rings-delay-1 pointer-events-none" />
        <span className="absolute inset-0 rounded-full border border-teal-300/40 animate-radiate-rings-delay-2 pointer-events-none" />

        {speech.isListening && (
          <span className="absolute -inset-2 rounded-full bg-teal-400/30 blur-xs animate-ping pointer-events-none" />
        )}

        {/* Center Mic Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "relative z-10 flex items-center justify-center rounded-full transition-all duration-300 shadow-md",
            "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 cursor-pointer",
            compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11",
            speech.isListening
              ? "bg-gradient-to-tr from-teal-500 via-cyan-400 to-teal-300 text-white shadow-[0_0_24px_rgba(20,184,166,0.95)] scale-105"
              : "bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 text-white hover:shadow-[0_0_18px_rgba(20,184,166,0.65)] hover:scale-105 active:scale-95",
          )}
          title={
            speech.isListening
              ? "Listening... Click mic to stop and fill form"
              : "Voice Assistant: Click mic to speak customer details"
          }
          aria-label={speech.isListening ? "Stop listening" : "Start voice assistant"}
        >
          {speech.isListening ? (
            <MicOff className={cn(compact ? "h-4 w-4" : "h-5 w-5", "animate-pulse")} />
          ) : (
            <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </button>
      </div>

      {/* Language pill toggle */}
      <div className="inline-flex items-center rounded-full bg-muted/70 p-0.5 border border-border text-[10px]">
        {(["en-IN", "hi-IN", "gu-IN"] as SpeechCaptureLanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => speech.setLanguage(lang)}
            className={cn(
              "px-1.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer",
              speech.language === lang
                ? "bg-teal-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={`Speech Language: ${lang}`}
          >
            {lang === "en-IN" ? "Eng" : lang === "hi-IN" ? "हिं" : "ગુજ"}
          </button>
        ))}
      </div>

      {/* Live transcript / status pill when listening */}
      {speech.isListening && (
        <div className="flex items-center gap-1.5 rounded-full bg-teal-950/80 border border-teal-500/50 px-2.5 py-1 text-[11px] text-teal-200 shadow-sm animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping shrink-0" />
          <span className="truncate max-w-[160px] sm:max-w-[240px]">
            {speech.transcript ? `"${speech.transcript}"` : "Listening... Tap mic when done"}
          </span>
          {speech.transcript && (
            <button
              type="button"
              onClick={handleReset}
              className="text-teal-400 hover:text-white ml-1 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
