/** "N days" chip that warns when the lead has been stuck in a stage. */
import { Clock, AlertTriangle } from "lucide-react";
import type { LeadStage } from "@/lib/types";
import { STAGE_AGE_WARNING_DAYS, stageAgeStatus } from "@/lib/lead-stage/health";
import { STAGE_TO_UMBRELLA } from "@/lib/constants";

export function StageAgeChip({
  stage,
  days,
  compact = false,
}: {
  stage: LeadStage;
  days: number;
  compact?: boolean;
}) {
  const status = stageAgeStatus(stage, days);
  const warn = status === "warning";
  const threshold = STAGE_AGE_WARNING_DAYS[STAGE_TO_UMBRELLA[stage]];
  const title = warn
    ? `More than ${threshold} days in this stage`
    : `${days} day${days === 1 ? "" : "s"} in this stage`;
  const cls = warn
    ? "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
    >
      {warn ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {compact ? `${days}d` : `${days} day${days === 1 ? "" : "s"}`}
    </span>
  );
}
