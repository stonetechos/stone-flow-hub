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

export function HealthCard({ to, icon, label, value, trend, target, tone, insight }: HealthCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-card p-4",
        "shadow-e1 transition-all duration-150 hover:-translate-y-px hover:border-border-default hover:shadow-e2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intent-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          <span className="text-text-secondary">{icon}</span>
          {label}
        </div>
        <span
          className={cn(
            "rounded-sm px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
            TONE_ACCENT[tone],
          )}
        >
          {TONE_LABEL[tone]}
        </span>
      </div>
      <div className="mt-3 font-display text-[26px] font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-text-secondary">{trend}</div>
      <div className="mt-3 border-t border-border-subtle pt-2 text-[11px] text-text-muted">
        {target}
      </div>
      <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-snug text-text-secondary">
        <span>{insight}</span>
      </div>
      <ArrowUpRight
        aria-hidden
        className="absolute right-3 top-3 h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}
