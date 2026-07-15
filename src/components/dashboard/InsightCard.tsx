/**
 * InsightCard — tinted alert / opportunity card used across dashboards.
 *
 * Feature code passes a `tone` signal ("risk", "warning", "opportunity",
 * "action" or a raw Tone). The card resolves that to STDL status tokens so
 * every theme restyles it consistently.
 *
 * `onDismiss` (Phase G.8.6 Task 3, optional/additive — every existing
 * caller is unaffected): when provided, renders a small dismiss control in
 * the header that stops propagation so it never triggers the card's own
 * `to` navigation. Callers wire this to the shared insight lifecycle
 * (`useInsightLifecycle`) so dismissing here is reflected everywhere else
 * that insight is shown, instead of being a private per-surface dismiss.
 */
import type { ElementType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, AlertTriangle, Target, PackageX, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toneSurface, type ToneSignal } from "@/lib/ui/tones";

export type InsightKind = "risk" | "warning" | "opportunity" | "action";

export interface InsightCardProps {
  kind?: InsightKind;
  tone?: ToneSignal;
  icon?: ElementType;
  title: ReactNode;
  detail?: ReactNode;
  to?: string;
  className?: string;
  /** Optional dismiss action — see file header. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

const KIND_TONE: Record<InsightKind, ToneSignal> = {
  risk: "danger",
  warning: "warning",
  opportunity: "success",
  action: "info",
};

const KIND_ICON: Record<InsightKind, ElementType> = {
  risk: ShieldAlert,
  warning: AlertTriangle,
  opportunity: Target,
  action: PackageX,
};

export function InsightCard({
  kind = "action",
  tone,
  icon,
  title,
  detail,
  to,
  className,
  onDismiss,
  dismissLabel = "Dismiss",
}: InsightCardProps) {
  const Icon = icon ?? KIND_ICON[kind];
  const surface = toneSurface(tone ?? KIND_TONE[kind]);
  const body = (
    <Card className={cn("h-full border transition-shadow hover:shadow-e2", surface, className)}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{title}</span>
          {onDismiss && (
            <button
              type="button"
              aria-label={dismissLabel}
              title={dismissLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss();
              }}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      {detail && <CardContent className="text-sm opacity-90">{detail}</CardContent>}
    </Card>
  );
  return to ? <Link to={to as never}>{body}</Link> : body;
}
