/**
 * Store Employee One-Tap Voice Assistant Tab.
 *
 * Metallic tab styling with a pulsating aura of turquoise light.
 * Enables store employees to tap once to speak all customer & enquiry details,
 * listen continuously until tapped to stop, automatically feed all details into
 * the customer form, and prompts for review/edit before final save.
 */
import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Sparkles, Edit3, Volume2, CheckCircle2, RotateCcw } from "lucide-react";
import { useSpeechCapture, type SpeechCaptureLanguage } from "@/lib/voice/useSpeechCapture";
import { parseVoiceCustomer, type ParsedVoiceCustomer } from "@/lib/customers/voice-parser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [lastParsed, setLastParsed] = useState<ParsedVoiceCustomer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessTranscript = useCallback(
    (text: string) => {
      setIsProcessing(true);
      try {
        const parsed = parseVoiceCustomer(text);
        setLastParsed(parsed);
        onCustomerExtracted(parsed);
        toast.success(
          `Voice captured: ${parsed.name || "Customer"}. Please review & edit details before saving.`,
          { icon: "✨" },
        );
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
      setLastParsed(null);
      speech.start();
    }
  };

  const handleReset = () => {
    speech.reset();
    setLastParsed(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-300",
        // Metallic tab casing — brushed titanium & chrome appearance
        "border border-zinc-600/70 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_6px_20px_rgba(0,0,0,0.5)]",
        speech.isListening
          ? "animate-turquoise-aura ring-2 ring-teal-400/80"
          : "hover:border-zinc-500",
        compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4",
        className,
      )}
    >
      {/* Specular metallic highlight line at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Background pulsating turquoise aura when active */}
      {speech.isListening && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.25)_0%,rgba(6,182,212,0.1)_50%,transparent_80%)] animate-turquoise-ring" />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Metallic Mic Button & Status */}
        <div className="flex items-center gap-3">
          {/* Metallic Button with Pulsating Turquoise Light */}
          <div className="relative shrink-0">
            {speech.isListening && (
              <span className="absolute -inset-1.5 rounded-full bg-teal-400/40 blur-xs animate-ping" />
            )}
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 focus:outline-none",
                // Metallic physical button styling
                "border border-zinc-400/50 bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950 shadow-[inset_0_2px_3px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.6)] active:scale-95",
                speech.isListening
                  ? "border-teal-400 text-teal-300 shadow-[0_0_24px_rgba(20,184,166,0.9),inset_0_0_12px_rgba(20,184,166,0.5)]"
                  : "text-zinc-200 hover:border-teal-400/60 hover:text-white",
              )}
              title={
                speech.isListening
                  ? "Click to stop listening and feed form"
                  : "Click to speak customer details"
              }
              aria-label={speech.isListening ? "Stop listening" : "Start speaking"}
            >
              {speech.isListening ? (
                <MicOff className="h-5 w-5 text-teal-300 animate-pulse" />
              ) : (
                <Mic className="h-5 w-5 text-zinc-100" />
              )}
            </button>
          </div>

          {/* Heading & Status Text */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Store Voice Counter
              </span>
              {speech.isListening ? (
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[10px] animate-pulse">
                  ● Listening — Click to Stop
                </Badge>
              ) : lastParsed ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Auto-Filled (Edit below)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-[10px]">
                  One-Tap Voice Assistant
                </Badge>
              )}
            </div>

            <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">
              {speech.isListening
                ? "Listening continuously... Say name, phone, firm, city, material, then click to stop."
                : lastParsed
                  ? "Data populated in form. Please edit any details before saving."
                  : "One tap to speak customer details. Auto-fills form for quick edit & save."}
            </p>
          </div>
        </div>

        {/* Right side: Action controls & Language switch */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Language selector */}
          <div className="inline-flex rounded-lg bg-zinc-800/80 p-0.5 border border-zinc-700">
            {(["en-IN", "hi-IN", "gu-IN"] as SpeechCaptureLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => speech.setLanguage(lang)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium rounded-md transition-all",
                  speech.language === lang
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
                title={`Speech Language: ${lang}`}
              >
                {lang === "en-IN" ? "Eng" : lang === "hi-IN" ? "हिन्दी" : "ગુજરાતી"}
              </button>
            ))}
          </div>

          {speech.transcript && !speech.isListening && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              title="Clear voice transcript"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleToggle}
            className={cn(
              "h-8 px-3.5 text-xs font-semibold rounded-lg shadow-sm transition-all",
              speech.isListening
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                : "bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-zinc-100 border border-zinc-600/70",
            )}
          >
            {speech.isListening ? (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-white" />
                Done (Fill Form)
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-400" />
                Tap to Speak
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Live Audio Visualizer & Transcript Strip */}
      {speech.transcript && (
        <div className="mt-3 rounded-lg border border-teal-500/30 bg-black/50 p-2.5 backdrop-blur-xs">
          <div className="flex items-center gap-2 mb-1">
            <Volume2
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                speech.isListening ? "text-teal-400 animate-bounce" : "text-zinc-400",
              )}
            />
            <span className="text-[10px] uppercase font-mono tracking-wider text-teal-400 font-semibold">
              {speech.isListening ? "Live Transcription" : "Spoken Utterance"}
            </span>
            {speech.isListening && (
              <div className="ml-auto flex items-center gap-0.5">
                <span className="h-2 w-0.5 rounded-full bg-teal-400 animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="h-3.5 w-0.5 rounded-full bg-teal-400 animate-[pulse_0.4s_ease-in-out_infinite]" />
                <span className="h-2 w-0.5 rounded-full bg-teal-400 animate-[pulse_0.7s_ease-in-out_infinite]" />
                <span className="h-4 w-0.5 rounded-full bg-teal-400 animate-[pulse_0.5s_ease-in-out_infinite]" />
                <span className="h-1.5 w-0.5 rounded-full bg-teal-400 animate-[pulse_0.8s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-200 font-sans italic leading-relaxed select-text">
            &ldquo;{speech.transcript}&rdquo;
          </p>

          {lastParsed && (
            <div className="mt-2 pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-300">
              <span className="text-teal-400 font-medium">Extracted:</span>
              {lastParsed.name && (
                <Badge variant="secondary" className="bg-zinc-800 text-[10px]">
                  Name: {lastParsed.name}
                </Badge>
              )}
              {lastParsed.company_name && (
                <Badge variant="secondary" className="bg-zinc-800 text-[10px]">
                  Firm: {lastParsed.company_name}
                </Badge>
              )}
              {lastParsed.mobile && (
                <Badge variant="secondary" className="bg-zinc-800 text-[10px]">
                  Phone: {lastParsed.mobile}
                </Badge>
              )}
              {lastParsed.city && (
                <Badge variant="secondary" className="bg-zinc-800 text-[10px]">
                  City: {lastParsed.city}
                </Badge>
              )}
              {lastParsed.customer_type && (
                <Badge variant="secondary" className="bg-zinc-800 text-[10px]">
                  Type: {lastParsed.customer_type}
                </Badge>
              )}
              <span className="ml-auto text-teal-300 font-semibold flex items-center gap-1">
                <Edit3 className="h-3 w-3" /> Ready for review & edit
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
