/**
 * Lead Health + stage-age rules. Pure functions, no I/O. Rule-driven and
 * configurable via `STAGE_AGE_WARNING_DAYS`. No AI. Signals feed in from
 * `src/lib/lead-stage/signals.ts` (stage entered, next follow-up, etc.).
 */
import type { LeadStage } from "@/lib/types";
import { STAGE_TO_UMBRELLA, type LeadUmbrellaId } from "@/lib/constants";

/** Warn when the lead has spent more than this many days in the umbrella. */
export const STAGE_AGE_WARNING_DAYS: Record<LeadUmbrellaId, number> = {
  new_enquiry: 3,
  exploration: 14,
  requirement_gathering: 14,
  quotation_sent: 7,
  negotiation: 10,
  qualified: 10,
  order_confirmed: 7,
  procurement: 21,
  execution: 45,
  completed: 9999,
  after_sales: 9999,
  lost: 9999,
  cancelled: 9999,
};

export function daysSince(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export function stageAgeStatus(stage: LeadStage, daysInStage: number): "ok" | "warning" {
  const umb = STAGE_TO_UMBRELLA[stage];
  const threshold = STAGE_AGE_WARNING_DAYS[umb];
  return daysInStage > threshold ? "warning" : "ok";
}

export type HealthLevel = "healthy" | "warm" | "attention" | "cold" | "lost";

export interface HealthInputs {
  stage: LeadStage;
  daysInStage: number;
  /** Days since the most recent follow-up (any status). null = never. */
  daysSinceFollowup: number | null;
  /** True when the next pending follow-up is past its scheduled time. */
  followupOverdue: boolean;
  /** True when the lead has a pending quotation not yet responded to. */
  pendingQuotation?: boolean;
  /** Set for `lost` / `cancelled` stages. */
  isTerminalLost?: boolean;
}

export interface HealthResult {
  level: HealthLevel;
  label: string;
  dotClass: string;
  textClass: string;
  reason: string;
}

const LEVEL_META: Record<HealthLevel, Pick<HealthResult, "label" | "dotClass" | "textClass">> = {
  healthy:   { label: "Healthy",           dotClass: "bg-status-success-fg",  textClass: "text-status-success-fg" },
  warm:      { label: "Warm",              dotClass: "bg-status-warning-fg",  textClass: "text-status-warning-fg" },
  attention: { label: "Attention Needed",  dotClass: "bg-status-warning-fg",  textClass: "text-status-warning-fg" },
  cold:      { label: "Cold",              dotClass: "bg-status-danger-fg",   textClass: "text-status-danger-fg" },
  lost:      { label: "Lost",              dotClass: "bg-muted-foreground/60", textClass: "text-muted-foreground" },
};

/**
 * Rule-based health. Not AI. Ordered by severity — first match wins.
 *  - Terminal lost/cancelled       → Lost
 *  - Overdue follow-up             → Cold
 *  - Stage age > 2× warning        → Cold
 *  - Stage age > warning           → Attention Needed
 *  - No follow-up for >14 days     → Attention Needed
 *  - No follow-up for >7 days OR
 *    pending quotation             → Warm
 *  - otherwise                     → Healthy
 */
export function computeLeadHealth(input: HealthInputs): HealthResult {
  if (input.isTerminalLost) return { ...LEVEL_META.lost, level: "lost", reason: "Marked lost/cancelled" };

  const umb = STAGE_TO_UMBRELLA[input.stage];
  const threshold = STAGE_AGE_WARNING_DAYS[umb];

  if (input.followupOverdue) return { ...LEVEL_META.cold, level: "cold", reason: "Follow-up is overdue" };
  if (input.daysInStage > threshold * 2) return { ...LEVEL_META.cold, level: "cold", reason: `Stuck ${input.daysInStage} days in stage` };
  if (input.daysInStage > threshold) return { ...LEVEL_META.attention, level: "attention", reason: `Over ${threshold} days in stage` };
  if (input.daysSinceFollowup != null && input.daysSinceFollowup > 14)
    return { ...LEVEL_META.attention, level: "attention", reason: `No follow-up for ${input.daysSinceFollowup} days` };
  if (input.pendingQuotation)
    return { ...LEVEL_META.warm, level: "warm", reason: "Quotation awaiting response" };
  if (input.daysSinceFollowup != null && input.daysSinceFollowup > 7)
    return { ...LEVEL_META.warm, level: "warm", reason: `No follow-up for ${input.daysSinceFollowup} days` };
  return { ...LEVEL_META.healthy, level: "healthy", reason: "On track" };
}
