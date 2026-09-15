/**
 * <HealthCard> — the four-pillar "Business health" tile used on the
 * Executive Command Centre (`/dashboard`).
 *
 * Extracted verbatim from `routes/_authenticated/dashboard.tsx` (Phase
 * G.1.1 — presentation-primitive refactor only, no visual or behavioral
 * change) so it can be reused by Business Health, the Executive Command
 * Centre, and future Intelligence surfaces without duplicating markup.
 *
 * Note: `HealthCardTone` is a small, card-local tone vocabulary
 * ("strong" | "steady" | "watch" | "risk") distinct from the app-wide
 * `Tone` in `lib/ui/tones.ts`. It is *not* routed through the shared STDL
 * tone helpers (toneSurface/toneText/etc.) — preserved exactly as the
 * original dashboard implementation to keep this a pure extraction.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthCardTone = "strong" | "steady" | "watch" | "risk";

const TONE_ACCENT: Record<HealthCardTone, string> = {
  strong: "bg-status-success-bg text-status-success-fg",
  steady: "bg-surface-panel text-text-secondary",
  watch: "bg-status-warning-bg text-status-warning-fg",
  risk: "bg-status-danger-bg text-status-danger-fg",
};
const TONE_LABEL: Record<HealthCardTone, string> = {
  strong: "Strong",
  steady: "Steady",
  watch: "Watch",
  risk: "At risk",
};

export interface HealthCardProps {
  to: string;
  icon: ReactNode;
  label: string;
  value: string;
  trend: string;
  target: string;
  tone: HealthCardTone;
  insight: string;
}

export function HealthCard({
  to,
  icon,
  label,
  value,
  trend,
  target,
  tone,
  insight,
}: HealthCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-blue-100/80 bg-white/95 p-5",
        "shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider uppercase text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 shadow-xs">
            {icon}
          </span>
          <span>{label}</span>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase",
            TONE_ACCENT[tone],
          )}
        >
          {TONE_LABEL[tone]}
        </span>
      </div>
      <div className="mt-3 font-display text-[26px] font-black tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] font-medium text-slate-500">{trend}</div>
      <div className="mt-3 border-t border-blue-50 pt-2 text-[11px] font-semibold text-blue-600">
        {target}
      </div>
      <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-snug text-slate-600">
        <span>{insight}</span>
      </div>
      <ArrowUpRight
        aria-hidden
        className="absolute right-3.5 top-3.5 h-4 w-4 text-blue-400 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}
