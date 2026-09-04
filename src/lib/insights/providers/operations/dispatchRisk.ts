/**
 * DispatchRiskProvider — flags dispatch and delivery risk on outbound
 * dispatches (Sales Order -> Dispatch pipeline).
 *
 * Reads: `listDispatches()` (existing bulk fetch).
 *
 * Three independent rules, each producing its own insight — a dispatch can
 * appear more than once if more than one condition is true, the same
 * approach FollowUpRecommendationProvider (G.2) used for its
 * overdue/due-today/due-tomorrow buckets.
 *
 * A fourth rule used to flag Sales Orders whose delivery was imminent but
 * production wasn't complete, cross-referencing `manufacturing/api.ts`'s
 * production orders. That rule was removed along with the Manufacturing
 * feature (2026-09-04 Purchase module restructure) — see the project doc
 * engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md.
 * The three dispatch-only rules below are unaffected by that removal.
 */
import { listDispatches } from "@/lib/dispatch/api";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince, daysUntil } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { DISPATCH_RISK_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const DISPATCH_RISK_PROVIDER_ID = "operations.dispatch-risk";

export const DispatchRiskProvider: InsightProvider = {
  id: DISPATCH_RISK_PROVIDER_ID,
  label: "Dispatch risk",
  fetch: async () => {
    const dispatches = await listDispatches();
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const insights: Insight[] = [];

    for (const d of dispatches) {
      const customerPart = d.customer ? ` for ${d.customer.name}` : "";

      if (d.status === "planned") {
        const daysTo = daysUntil(d.dispatch_date, nowDate);
        if (daysTo < 0) {
          const overdueDays = -daysTo;
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:overdue:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "risk",
            tone: "danger",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} is overdue — ${overdueDays}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} was planned for ${d.dispatch_date} and is still "planned" ${overdueDays} day${overdueDays === 1 ? "" : "s"} later.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({ urgencyDays: overdueDays }),
            generatedAt: now,
          });
        } else if (daysTo <= THRESHOLDS.dueSoonDays) {
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:due-soon:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} due in ${daysTo}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} is planned for ${d.dispatch_date}, ${daysTo} day${daysTo === 1 ? "" : "s"} from now.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({ urgencyDays: THRESHOLDS.dueSoonDays - daysTo }),
            generatedAt: now,
          });
        }
      } else if (d.status === "in_transit") {
        const inTransitDays = daysSince(d.dispatch_date, nowDate);
        if (inTransitDays > THRESHOLDS.inTransitStallDays) {
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:pending-completion:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} still in transit after ${inTransitDays}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} left "in_transit" on ${d.dispatch_date} and hasn't been marked delivered ${inTransitDays} days later.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({
              urgencyDays: inTransitDays - THRESHOLDS.inTransitStallDays,
            }),
            generatedAt: now,
          });
        }
      }
    }

    return insights;
  },
};
