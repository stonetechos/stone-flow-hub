/**
 * DangerNotifications — Phase G.7 UI integration; lifecycle-aware as of
 * Phase G.8.6 Task 3.
 *
 * Surfaces high-confidence danger-toned insights as interactive, swipeable
 * cards in the top-right corner.
 *
 * Interactions:
 *  - Close (×) button: Immediately removes/dismisses the notification.
 *  - Swipe Right (or drag right): Fluid animation showing "Release to Remove",
 *    and on release past threshold dismisses and permanently silences it for
 *    the session.
 *  - Swipe Left (or drag left): Fluid animation showing "Release to Act & Open",
 *    and on release navigates directly to the action route (e.g. quote / order).
 *  - Direct Action Button: One-click navigation to resolve the red flag.
 *  - Auto-dismiss countdown with pause on hover/touch.
 *  - Session + Database persistence so dismissed insights never reappear.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle, type InsightWithLifecycle } from "@/lib/insights/state/hooks";
import { resolveTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";

const HIGH_CONFIDENCE_MIN = 0.9;
const SWIPE_THRESHOLD = 50;
const AUTO_DISMISS_MS = 14_000;
const SESSION_STORAGE_KEY = "stos_dismissed_danger_insights";

function getDismissedSessionSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDismissedSessionSet();
    set.add(key);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

interface DangerNotificationCardProps {
  insight: InsightWithLifecycle;
  onDismiss: () => void;
  onAct: () => void;
}

function DangerNotificationCard({ insight, onDismiss, onAct }: DangerNotificationCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState<"left" | "right" | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragXRef = useRef(0);
  dragXRef.current = dragX;

  // Auto-dismiss countdown timer (pauses when hovered or dragged)
  useEffect(() => {
    if (isHovered || isDragging || isExiting) return;

    const intervalTime = 100;
    const decrement = (intervalTime / AUTO_DISMISS_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExiting("right");
          setTimeout(onDismiss, 220);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isHovered, isDragging, isExiting, onDismiss]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't intercept button or link clicks
    if (target.closest("button") || target.closest("a")) return;

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if pointer capture unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isExiting) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // If scrolling vertically predominantly, ignore
    if (Math.abs(dy) > Math.abs(dx) * 1.6 && Math.abs(dx) < 10) return;

    // Apply soft dampening when dragging far
    let effective = dx;
    if (Math.abs(dx) > 130) {
      const excess = Math.abs(dx) - 130;
      effective = (dx > 0 ? 1 : -1) * (130 + excess * 0.35);
    }
    setDragX(effective);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    const currentX = dragXRef.current;
    if (currentX > SWIPE_THRESHOLD) {
      // Swiped right -> Remove
      setIsExiting("right");
      setTimeout(onDismiss, 220);
    } else if (currentX < -SWIPE_THRESHOLD) {
      // Swiped left -> Act
      setIsExiting("left");
      setTimeout(onAct, 220);
    } else {
      // Snap back smoothly
      setDragX(0);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting("right");
    setTimeout(onDismiss, 200);
  };

  const handleActClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting("left");
    setTimeout(onAct, 200);
  };

  const swipePercent = Math.min(100, (Math.abs(dragX) / SWIPE_THRESHOLD) * 100);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-800 bg-background/95 backdrop-blur-md select-none transition-shadow hover:shadow-rose-500/10"
    >
      {/* Background Revealed on Swipe Right: Remove / Dismiss */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center gap-2 pl-4 text-white font-medium transition-colors",
          dragX > 0 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{
          backgroundColor: dragX >= SWIPE_THRESHOLD ? "#dc2626" : "#ef4444",
          width: Math.max(0, dragX + 40),
        }}
      >
        <Trash2 className={cn("h-5 w-5 shrink-0", dragX >= SWIPE_THRESHOLD && "animate-bounce")} />
        <span className="text-xs font-semibold whitespace-nowrap">
          {dragX >= SWIPE_THRESHOLD ? "Release to Remove" : `Remove (${Math.round(swipePercent)}%)`}
        </span>
      </div>

      {/* Background Revealed on Swipe Left: Act / Open */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end gap-2 pr-4 text-white font-medium transition-colors",
          dragX < 0 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{
          backgroundColor: dragX <= -SWIPE_THRESHOLD ? "#059669" : "#10b981",
          width: Math.max(0, -dragX + 40),
        }}
      >
        <span className="text-xs font-semibold whitespace-nowrap">
          {dragX <= -SWIPE_THRESHOLD ? "Release to Act" : `Act Now (${Math.round(swipePercent)}%)`}
        </span>
        <ArrowRight
          className={cn("h-5 w-5 shrink-0", dragX <= -SWIPE_THRESHOLD && "animate-pulse")}
        />
      </div>

      {/* Interactive Sliding Card Surface */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform:
            isExiting === "right"
              ? "translateX(120%)"
              : isExiting === "left"
                ? "translateX(-120%)"
                : `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
          transition: isDragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out",
          opacity: isExiting ? 0 : 1 - Math.abs(dragX) / 600,
        }}
        className={cn(
          "relative bg-rose-50/98 dark:bg-rose-950/95 border-l-4 border-l-rose-600 p-3.5 sm:p-4 touch-none cursor-grab active:cursor-grabbing",
          isDragging && "cursor-grabbing",
        )}
      >
        {/* Dynamic Interactive Gesture Banner Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                dragX > 15
                  ? "bg-rose-600 text-white animate-pulse"
                  : dragX < -15
                    ? "bg-emerald-600 text-white animate-pulse"
                    : "bg-rose-200/90 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200",
              )}
            >
              {dragX > 15
                ? "👉 Swiping Right: Remove"
                : dragX < -15
                  ? "👈 Swiping Left: Act"
                  : "🚩 Critical Alert"}
            </span>

            {/* Gesture Cue Pill */}
            <span className="text-[10px] text-rose-700/80 dark:text-rose-300/80 font-medium truncate">
              {dragX === 0 ? "Swipe left to act • right to remove" : null}
            </span>
          </div>

          {/* Dedicated Easy-to-Click Cross Button */}
          <button
            type="button"
            aria-label="Remove notification"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCloseClick}
            className="h-6 w-6 rounded-full flex items-center justify-center text-rose-700 hover:text-rose-950 bg-rose-200/70 hover:bg-rose-300 dark:bg-rose-900/60 dark:hover:bg-rose-800 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
            <AlertCircle className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-100 leading-snug">
              {insight.title}
            </h4>

            {insight.why && (
              <p className="mt-1 text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed font-normal">
                {insight.why}
              </p>
            )}

            {/* Actions Bar */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
              <Button
                size="sm"
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleActClick}
                className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-sm rounded-lg cursor-pointer"
              >
                <span>{insight.action?.label || "Act Now"}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleCloseClick}
                className="text-xs text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 font-medium underline-offset-2 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar (Drains down, pauses on hover/drag) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-200/70 dark:bg-rose-950/60 overflow-hidden">
          <div
            className="h-full bg-rose-600/75 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function DangerNotifications() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard =
    pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboards");
  const { processedInsights } = useExecutiveInsights({ enabled: isDashboard });
  const { withLifecycle, setStatus } = useInsightLifecycle(processedInsights);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => getDismissedSessionSet());
  const navigate = useNavigate();

  // Filter for active, un-dismissed danger insights
  const activeDangerInsights = useMemo(() => {
    return withLifecycle.filter((insight) => {
      if (resolveTone(insight.tone) !== "danger") return false;
      if (insight.confidence < HIGH_CONFIDENCE_MIN) return false;
      if (
        insight.entity?.type === "dispatch" ||
        insight.id.includes("dispatch") ||
        insight.source === "operations.dispatch-risk"
      ) {
        return false;
      }

      const key = `${insight.source}:${insight.id}`;
      if (dismissedKeys.has(key)) return false;
      if (
        insight.lifecycleStatus === "dismissed" ||
        insight.lifecycleStatus === "resolved" ||
        insight.lifecycleStatus === "acknowledged" ||
        insight.lifecycleStatus === "expired"
      ) {
        return false;
      }

      return true;
    });
  }, [withLifecycle, dismissedKeys]);

  const handleDismiss = (insight: InsightWithLifecycle) => {
    const key = `${insight.source}:${insight.id}`;
    persistDismissedKey(key);
    setDismissedKeys((prev) => new Set(prev).add(key));
    setStatus(insight, "dismissed");
  };

  const handleAct = (insight: InsightWithLifecycle) => {
    const key = `${insight.source}:${insight.id}`;
    persistDismissedKey(key);
    setDismissedKeys((prev) => new Set(prev).add(key));
    setStatus(insight, "acknowledged");

    if (insight.action?.href) {
      void navigate({ to: insight.action.href as never });
    }
  };

  if (activeDangerInsights.length === 0) return null;

  // Show top danger notifications at the top right
  return (
    <aside
      aria-label="Critical notifications"
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[99999] flex flex-col gap-2.5 w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[94vw] pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {activeDangerInsights.slice(0, 2).map((insight) => {
        const key = `${insight.source}:${insight.id}`;
        return (
          <DangerNotificationCard
            key={key}
            insight={insight}
            onDismiss={() => handleDismiss(insight)}
            onAct={() => handleAct(insight)}
          />
        );
      })}
    </aside>
  );
}
