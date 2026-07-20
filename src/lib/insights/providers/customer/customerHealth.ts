/**
 * CustomerHealthProvider — classifies each customer's CURRENT health from
 * real, already-recorded activity. No forecasting, no prediction: this is
 * a point-in-time read of overdue balance, activity recency, and
 * follow-up backlog.
 *
 * Reads: `listCustomerScores()` (new bulk export from `executive/
 * customer-intel.ts`, added this phase — gives outstanding/overdue_days/
 * last_order_at per customer without a second revenue calculation),
 * `listEnquiries()`, `listReceipts()`, and `listFollowups({scope:
 * "pending"})` — all existing bulk fetches, grouped client-side by
 * customer, the same "group by id" idiom every other insight provider in
 * this app already uses (e.g. G.4's `productionBySo` map).
 *
 * Healthy customers are not surfaced — there's nothing actionable to
 * report for them, the same choice MarginWatchProvider (G.3) made for
 * projects with a healthy margin.
 */
import { listCustomerScores } from "@/lib/executive/customer-intel";
import { listEnquiries } from "@/lib/enquiries/api";
import { listReceipts } from "@/lib/receipts/api";
import { listFollowups } from "@/lib/followups/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightKind, InsightProvider } from "@/lib/insights/types";
import { daysSince } from "@/lib/insights/shared/dates";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";
import { CUSTOMER_HEALTH_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const CUSTOMER_HEALTH_PROVIDER_ID = "customer.health";

export type HealthLevel = "Healthy" | "Watch" | "Risk" | "Critical";

function levelFor(points: number): HealthLevel {
  if (points >= THRESHOLDS.criticalScoreMin) return "Critical";
  if (points >= THRESHOLDS.riskScoreMin) return "Risk";
  if (points >= THRESHOLDS.watchScoreMin) return "Watch";
  return "Healthy";
}

function latestOf(...dates: Array<string | null | undefined>): string | null {
  return dates.reduce<string | null>((acc, d) => (d && (!acc || d > acc) ? d : acc), null);
}

export const CustomerHealthProvider: InsightProvider = {
  id: CUSTOMER_HEALTH_PROVIDER_ID,
  label: "Customer health",
  fetch: async () => {
    const [scores, enquiries, receipts, pendingFollowups] = await Promise.all([
      listCustomerScores(),
      listEnquiries(),
      listReceipts(),
      listFollowups({ scope: "pending", limit: 2000 }),
    ]);

    const lastEnquiryByCustomer = new Map<string, string>();
    for (const e of enquiries) {
      if (!e.customer?.id) continue;
      const prev = lastEnquiryByCustomer.get(e.customer.id);
      if (!prev || e.created_at > prev) lastEnquiryByCustomer.set(e.customer.id, e.created_at);
    }

    const lastReceiptByCustomer = new Map<string, string>();
    for (const r of receipts) {
      if (!r.customer?.id) continue;
      const prev = lastReceiptByCustomer.get(r.customer.id);
      if (!prev || r.received_at > prev) lastReceiptByCustomer.set(r.customer.id, r.received_at);
    }

    const followupBacklogByCustomer = new Map<string, number>();
    for (const f of pendingFollowups) {
      const customerId = f.enquiry?.customer?.id;
      if (!customerId) continue;
      followupBacklogByCustomer.set(
        customerId,
        (followupBacklogByCustomer.get(customerId) ?? 0) + 1,
      );
    }

    const nowDate = new Date();
    const now = nowDate.toISOString();
    const insights: Insight[] = [];

    for (const score of scores) {
      const lastEnquiryAt = lastEnquiryByCustomer.get(score.customer_id) ?? null;
      const lastReceiptAt = lastReceiptByCustomer.get(score.customer_id) ?? null;
      const followupBacklog = followupBacklogByCustomer.get(score.customer_id) ?? 0;
      const lastTouch = latestOf(score.last_order_at, lastEnquiryAt, lastReceiptAt);
      const daysSinceTouch = lastTouch ? daysSince(lastTouch, nowDate) : null;

      let points = 0;
      const reasons: string[] = [];

      if (score.outstanding > 0) {
        if (score.overdue_days > THRESHOLDS.overdueDaysMajor) {
          points += 3;
          reasons.push(
            `${formatInr(score.outstanding)} outstanding, overdue by ${score.overdue_days} days`,
          );
        } else if (score.overdue_days > THRESHOLDS.overdueDaysMinor) {
          points += 2;
          reasons.push(
            `${formatInr(score.outstanding)} outstanding, overdue by ${score.overdue_days} days`,
          );
        } else {
          points += 1;
          reasons.push(`${formatInr(score.outstanding)} outstanding`);
        }
      }

      if (daysSinceTouch === null) {
        points += 2;
        reasons.push("no recorded invoice, enquiry, or receipt activity");
      } else if (daysSinceTouch > THRESHOLDS.inactivityDaysMajor) {
        points += 2;
        reasons.push(`no activity in ${daysSinceTouch} days`);
      } else if (daysSinceTouch > THRESHOLDS.inactivityDaysMinor) {
        points += 1;
        reasons.push(`no activity in ${daysSinceTouch} days`);
      }

      if (followupBacklog >= THRESHOLDS.followupBacklogMin) {
        points += 1;
        reasons.push(`${followupBacklog} pending follow-ups`);
      }

      const level = levelFor(points);
      if (level === "Healthy") continue;

      const tone: Insight["tone"] =
        level === "Critical" ? "danger" : level === "Risk" ? "warning" : "info";
      const kind: InsightKind = level === "Watch" ? "warning" : "risk";

      insights.push({
        id: `${CUSTOMER_HEALTH_PROVIDER_ID}:${score.customer_id}`,
        source: CUSTOMER_HEALTH_PROVIDER_ID,
        module: "Customer",
        kind,
        tone,
        confidence: computeConfidence(daysSinceTouch === null ? 1 : 0),
        title: `${score.name} — ${level}`,
        why: `${score.name} is classified "${level}": ${reasons.join("; ")}.`,
        action: { label: "Open customer", href: `/customers/${score.customer_id}` },
        entity: { type: "customer", id: score.customer_id, label: score.name },
        value: score.outstanding > 0 ? score.outstanding : undefined,
        priority: computePriority({ urgencyDays: points * 10, valueInr: score.outstanding }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
