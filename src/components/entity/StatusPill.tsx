import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * StatusPill — semantic status label.
 *
 * Maps a workflow status string to one of the STDL status token trios
 * (success / warning / info / danger / neutral). Every colour comes
 * from `--status-*` tokens, so every theme (Quarry, Foundry, Executive,
 * Atelier) restyles the pill automatically without touching a call site.
 */

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_MAP: Record<string, Tone> = {
  draft: "neutral",
  planned: "neutral",
  new: "neutral",
  pending: "neutral",

  sent: "info",
  confirmed: "info",
  acknowledged: "info",
  approved: "info",
  submitted: "info",

  in_production: "warning",
  in_progress: "warning",
  in_transit: "warning",
  processing: "warning",
  partially_received: "warning",
  partial: "warning",
  on_hold: "warning",

  ready: "success",
  received: "success",
  delivered: "success",
  completed: "success",
  paid: "success",
  active: "success",
  shipped: "success",

  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
  overdue: "danger",
  lost: "danger",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral:
    "border-border-subtle bg-surface-panel text-muted-foreground",
  info:
    "border-status-info-border bg-status-info-bg text-status-info-fg",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  success:
    "border-status-success-border bg-status-success-bg text-status-success-fg",
  danger:
    "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
};

export function StatusPill({
  status,
  tone: toneOverride,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const tone = toneOverride ?? TONE_MAP[key] ?? "neutral";
  return (
    <Badge variant="outline" className={cn("capitalize", TONE_CLASS[tone], className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
