/**
 * AI Collection Assistant — ranks outstanding milestones by risk + urgency,
 * suggests who to chase first, expected cash inflow, and recommended strategy.
 *
 * Runs client-side over `customer_payment_dashboard` so no privileged data
 * leaves the browser; the AI Gateway is used only for narrative reasoning.
 */
import type { PaymentScheduleDashboardRow } from "./schedule";

export interface CollectionPriority {
  row: PaymentScheduleDashboardRow;
  score: number; // 0..100
  risk: "low" | "medium" | "high" | "critical";
  reason: string[];
  strategy: string;
  expectedInflow: number;
}

/** Deterministic ranking — safe default when AI is unavailable. */
export function rankCollectionPriorities(
  rows: PaymentScheduleDashboardRow[],
): CollectionPriority[] {
  return rows
    .filter((r) => r.status !== "paid" && r.balance_due > 0)
    .map<CollectionPriority>((row) => {
      const days = row.days_to_due ?? 0;
      const reasons: string[] = [];
      let score = 30;

      if (days < 0) {
        score += Math.min(50, Math.abs(days) * 2);
        reasons.push(`Overdue by ${Math.abs(days)} d`);
      } else if (days === 0) {
        score += 25;
        reasons.push("Due today");
      } else if (days <= 3) {
        score += 15;
        reasons.push(`Due in ${days} d`);
      }

      if (row.balance_due >= 300000) {
        score += 15;
        reasons.push("Large ticket (≥ ₹3L)");
      } else if (row.balance_due >= 75000) {
        score += 8;
        reasons.push("Mid ticket");
      }

      if (row.last_reminder_stage) reasons.push(`Last reminder: ${row.last_reminder_stage}`);
      if (row.status === "partial") {
        score -= 5;
        reasons.push("Partial received");
      }

      const risk: CollectionPriority["risk"] =
        score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low";

      const strategy =
        days < -14
          ? "Escalate to founder — send legal / final notice."
          : days < -7
            ? "Phone call + WhatsApp with payment link."
            : days < 0
              ? "Send polite reminder + share payment link."
              : days === 0
                ? "Confirm receipt via UPI/bank; call in the evening if not received."
                : "Send scheduled reminder 3 days before due date.";

      return {
        row,
        score: Math.min(100, score),
        risk,
        reason: reasons,
        strategy,
        expectedInflow: row.balance_due,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function summariseInflow(priorities: CollectionPriority[]) {
  const today = priorities
    .filter((p) => p.row.bucket === "due_today")
    .reduce((s, p) => s + p.expectedInflow, 0);
  const week = priorities
    .filter((p) => ["due_today", "due_week"].includes(p.row.bucket))
    .reduce((s, p) => s + p.expectedInflow, 0);
  const overdue = priorities
    .filter((p) => p.row.bucket === "overdue")
    .reduce((s, p) => s + p.expectedInflow, 0);
  const upcoming = priorities
    .filter((p) => p.row.bucket === "upcoming")
    .reduce((s, p) => s + p.expectedInflow, 0);
  return { today, week, overdue, upcoming, total: today + week + overdue + upcoming };
}
