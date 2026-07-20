/**
 * Stone Tech Intelligence — Lead Score (0..100).
 *
 * Pure rule-based scoring. Consumes the same signals surface as the Next
 * Best Action engine — no new data plumbing. Bands map to Excellent / Hot
 * / Warm / Cold / Dormant for UI badging.
 */
import type { LeadStage } from "@/lib/types";
import { STAGE_TO_UMBRELLA, type LeadUmbrellaId } from "@/lib/constants";

export type ScoreTier = "excellent" | "hot" | "warm" | "cold" | "dormant";

export interface ScoreInputs {
  stage: LeadStage;
  daysInStage: number;
  daysSinceLastFollowup: number | null;
  followupOverdue: boolean;
  budgetInr: number | null;
  hasQuoteSent: boolean;
  hasSiteVisitCompleted: boolean;
  hasSampleSent: boolean;
  hasAdvancePayment: boolean;
  daysSinceLastActivity: number | null;
  followupCount30d: number;
}

export interface ScoreBreakdown {
  score: number;
  tier: ScoreTier;
  reasons: Array<{ label: string; delta: number }>;
}

const STAGE_BASE: Record<LeadUmbrellaId, number> = {
  new_enquiry: 20,
  exploration: 30,
  requirement_gathering: 45,
  quotation_sent: 55,
  negotiation: 65,
  qualified: 70,
  order_confirmed: 85,
  procurement: 80,
  execution: 75,
  completed: 90,
  after_sales: 60,
  lost: 0,
  cancelled: 0,
};

function tierOf(score: number): ScoreTier {
  if (score >= 80) return "excellent";
  if (score >= 65) return "hot";
  if (score >= 45) return "warm";
  if (score >= 20) return "cold";
  return "dormant";
}

export function computeLeadScore(input: ScoreInputs): ScoreBreakdown {
  const reasons: ScoreBreakdown["reasons"] = [];
  const umb = STAGE_TO_UMBRELLA[input.stage];
  let s = STAGE_BASE[umb];
  reasons.push({ label: `Stage: ${umb}`, delta: s });

  const add = (label: string, delta: number) => {
    if (delta === 0) return;
    s += delta;
    reasons.push({ label, delta });
  };

  if (input.hasQuoteSent) add("Quote sent", 5);
  if (input.hasSiteVisitCompleted) add("Site visit done", 5);
  if (input.hasSampleSent) add("Sample sent", 3);
  if (input.hasAdvancePayment) add("Advance received", 10);
  if ((input.budgetInr ?? 0) >= 1_000_000) add("High-value project", 5);
  else if ((input.budgetInr ?? 0) >= 250_000) add("Mid-value project", 2);

  if (input.followupCount30d >= 3) add("Active follow-ups (30d)", 4);
  else if (input.followupCount30d === 0) add("No follow-ups in 30d", -6);

  if (input.daysSinceLastFollowup != null) {
    if (input.daysSinceLastFollowup > 30) add("Silent >30 days", -15);
    else if (input.daysSinceLastFollowup > 14) add("Silent >14 days", -8);
    else if (input.daysSinceLastFollowup > 7) add("Silent >7 days", -4);
  } else if (umb !== "new_enquiry") {
    add("No follow-up recorded", -6);
  }

  if (input.followupOverdue) add("Follow-up overdue", -8);

  if (input.daysInStage > 30) add("Stuck >30 days in stage", -8);
  else if (input.daysInStage > 14) add("Slow in stage", -4);

  if (input.daysSinceLastActivity != null && input.daysSinceLastActivity > 45)
    add("Inactive >45 days", -10);

  if (umb === "lost" || umb === "cancelled") s = 0;

  s = Math.max(0, Math.min(100, Math.round(s)));
  return { score: s, tier: tierOf(s), reasons };
}

export const SCORE_TIER_META: Record<ScoreTier, { label: string; className: string }> = {
  excellent: {
    label: "Excellent",
    className: "bg-status-success-bg text-status-success-fg border-status-success-border",
  },
  hot: {
    label: "Hot",
    className: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  },
  warm: {
    label: "Warm",
    className: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  },
  cold: {
    label: "Cold",
    className: "bg-status-info-bg text-status-info-fg border-status-info-border",
  },
  dormant: { label: "Dormant", className: "bg-muted text-muted-foreground border-border" },
};
