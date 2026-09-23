import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StonemanMascotProps {
  onClick?: () => void;
  className?: string;
}

export function StonemanMascot({ onClick, className }: StonemanMascotProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex items-center gap-2",
        className,
      )}
    >
      {/* Interactive speech tooltip that slides in on hover or focus */}
      <div
        className={cn(
          "pointer-events-none hidden sm:flex items-center gap-1.5 rounded-full border border-teal-800/40 bg-slate-900/90 px-3 py-1 text-xs font-semibold text-teal-100 shadow-xl backdrop-blur-md transition-all duration-300",
          hovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3",
        )}
      >
        <Sparkles
          className="h-3.5 w-3.5 text-teal-300 animate-spin"
          style={{ animationDuration: "6s" }}
        />
        <span>Ask Stoneman</span>
        <kbd className="rounded bg-teal-950/80 px-1.5 py-0.5 font-mono text-[10px] text-teal-300/80">
          ⌘J
        </kbd>
      </div>

      {/* Animated Mascot Button */}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open Stoneman AI (⌘J)"
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full cursor-pointer",
          "bg-gradient-to-br from-[#0c4e58] via-[#083b43] to-slate-950",
          "border-2 border-teal-400/50 text-white",
          "animate-stoneman-float animate-stoneman-glow",
          "transition-all duration-300 hover:scale-110 hover:border-teal-300 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
        )}
      >
        {/* Stone Energy Aura Ring */}
        <span className="absolute inset-0 rounded-full bg-teal-500/15 group-hover:bg-teal-400/25 transition-colors" />

        {/* Stoneman Character */}
        <div className="relative h-11 w-11 overflow-hidden rounded-full p-0.5">
          <img
            src="/stoneman-avatar.png"
            alt="Stoneman AI Mascot"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-115 animate-stoneman-eyes"
          />
        </div>

        {/* Live indicator dot */}
        <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-slate-900" />
        </span>
      </button>
    </div>
  );
}
