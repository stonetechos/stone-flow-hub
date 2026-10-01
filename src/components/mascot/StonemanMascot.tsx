import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StonemanMascotProps {
  onClick?: () => void;
  className?: string;
}

const STORAGE_KEY = "stos_stoneman_mascot_pos_v2";
const MASCOT_SIZE = 56;
const MARGIN = 16;

function clamp(val: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(val, min), max);
}

export function StonemanMascot({ onClick, className }: StonemanMascotProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef<{
    isPointerDown: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    pointerId: number;
  }>({
    isPointerDown: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    pointerId: -1,
  });

  // Calculate default position: safely ~150px from bottom so it never covers bottom form tabs
  const getDefaultPos = () => {
    if (typeof window === "undefined") return { x: 200, y: 200 };
    const defaultX = Math.max(MARGIN, window.innerWidth - MASCOT_SIZE - MARGIN);
    const defaultY = Math.max(MARGIN, window.innerHeight - MASCOT_SIZE - 150);
    return { x: defaultX, y: defaultY };
  };

  // Restore saved position on mount or compute safe default
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          const maxX = Math.max(MARGIN, window.innerWidth - MASCOT_SIZE - MARGIN);
          const maxY = Math.max(MARGIN, window.innerHeight - MASCOT_SIZE - MARGIN);
          setPos({
            x: clamp(parsed.x, MARGIN, maxX),
            y: clamp(parsed.y, MARGIN, maxY),
          });
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }

    setPos(getDefaultPos());
  }, []);

  // Keep mascot within viewport bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev) return null;
        const maxX = Math.max(MARGIN, window.innerWidth - MASCOT_SIZE - MARGIN);
        const maxY = Math.max(MARGIN, window.innerHeight - MASCOT_SIZE - MARGIN);
        return {
          x: clamp(prev.x, MARGIN, maxX),
          y: clamp(prev.y, MARGIN, maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors in older runtimes
    }

    const currentPos = pos ?? getDefaultPos();
    dragStateRef.current = {
      isPointerDown: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initX: currentPos.x,
      initY: currentPos.y,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isPointerDown) return;

    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;

    // Distinguish between simple click/tap and intentional drag (6px threshold)
    if (!dragStateRef.current.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragStateRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragStateRef.current.hasMoved) {
      const maxX = Math.max(MARGIN, window.innerWidth - MASCOT_SIZE - MARGIN);
      const maxY = Math.max(MARGIN, window.innerHeight - MASCOT_SIZE - MARGIN);
      const nextX = clamp(dragStateRef.current.initX + dx, MARGIN, maxX);
      const nextY = clamp(dragStateRef.current.initY + dy, MARGIN, maxY);
      setPos({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isPointerDown) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const wasMoved = dragStateRef.current.hasMoved;
    dragStateRef.current.isPointerDown = false;
    setIsDragging(false);

    if (wasMoved) {
      // Persist chosen position across reloads
      if (pos) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch {
          // Ignore storage quota errors
        }
      }
    } else {
      // Clean tap / click without drag: open Copilot
      onClick?.();
    }
  };

  const handlePointerCancel = () => {
    dragStateRef.current.isPointerDown = false;
    setIsDragging(false);
  };

  // Determine if tooltip should show on left or right of mascot based on screen position
  const tooltipOnRight = pos ? pos.x < 140 : false;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={
        pos
          ? {
              position: "fixed",
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              touchAction: "none",
              userSelect: "none",
            }
          : {
              touchAction: "none",
              userSelect: "none",
            }
      }
      className={cn(
        "fixed z-50 flex items-center select-none",
        tooltipOnRight ? "flex-row-reverse gap-2" : "gap-2",
        !pos &&
          "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))]",
        className,
      )}
    >
      {/* Speech tooltip — hidden during active dragging */}
      <div
        className={cn(
          "pointer-events-none hidden sm:flex items-center gap-1.5 rounded-full border border-teal-800/40 bg-slate-900/90 px-3 py-1 text-xs font-semibold text-teal-100 shadow-xl backdrop-blur-md transition-all duration-200",
          hovered && !isDragging ? "opacity-100 scale-100" : "opacity-0 scale-95",
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

      {/* Animated Draggable Mascot Button */}
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label="Open Stoneman AI (⌘J, draggable)"
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full select-none",
          isDragging
            ? "cursor-grabbing scale-105 shadow-2xl ring-4 ring-teal-400/50"
            : "cursor-grab",
          "bg-gradient-to-br from-[#0c4e58] via-[#083b43] to-slate-950",
          "border-2 border-teal-400/50 text-white",
          !isDragging &&
            "animate-stoneman-float animate-stoneman-glow hover:scale-110 hover:border-teal-300",
          "transition-shadow transition-border duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
        )}
      >
        {/* Stone Energy Aura Ring */}
        <span className="absolute inset-0 rounded-full bg-teal-500/15 group-hover:bg-teal-400/25 transition-colors" />

        {/* Stoneman Character */}
        <div className="relative h-11 w-11 overflow-hidden rounded-full p-0.5 pointer-events-none">
          <img
            src="/stoneman-avatar.png"
            alt="Stoneman AI Mascot"
            draggable={false}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-115 animate-stoneman-eyes select-none pointer-events-none"
          />
        </div>

        {/* Live indicator dot */}
        <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center pointer-events-none">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-slate-900" />
        </span>
      </button>
    </div>
  );
}
