/** Small colored dot + label for Lead Health. Rule-driven, no AI. */
import { Badge } from "@/components/ui/badge";
import type { HealthResult } from "@/lib/lead-stage/health";

export function LeadHealthBadge({
  health,
  compact = false,
}: {
  health: HealthResult;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        title={`${health.label} — ${health.reason}`}
        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${health.dotClass}`}
        aria-label={health.label}
      />
    );
  }
  return (
    <Badge
      variant="outline"
      title={health.reason}
      className={`gap-1.5 border-border ${health.textClass}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${health.dotClass}`} />
      {health.label}
    </Badge>
  );
}
