/**
 * CustomerLifetimeValueProvider — surfaces top-value, large-lifetime-spend,
 * and rapidly-growing customers.
 *
 * Reads: `listCustomerScores()` (the same new bulk export from
 * `executive/customer-intel.ts` that CustomerHealthProvider uses) — this
 * provider does not compute revenue itself at all, only classifies the
 * numbers `listCustomerScores()` already produced, per the phase rule
 * "reuse existing revenue calculations, never duplicate revenue logic."
 *
 * "Rapidly growing" compares two REAL, already-elapsed 90-day windows
 * (`recent_revenue` vs `prior_revenue`, both computed in customer-intel.ts
 * from actual invoice dates) — it is a period-over-period comparison of
 * history, not a forecast of future revenue.
 *
 * One insight per customer (not per reason) — a customer can be both
 * top-value and rapidly growing at once, so every applicable reason is
 * folded into a single `why`.
 */
import { listCustomerScores } from "@/lib/executive/customer-intel";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { CUSTOMER_LTV_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const CUSTOMER_LTV_PROVIDER_ID = "customer.lifetime-value";

export const CustomerLifetimeValueProvider: InsightProvider = {
  id: CUSTOMER_LTV_PROVIDER_ID,
  label: "Customer lifetime value",
  fetch: async () => {
    const scores = await listCustomerScores();
    if (scores.length === 0) return [];

    const byRevenue = [...scores].sort((a, b) => b.revenue - a.revenue);
    const topValueIds = new Set(
      byRevenue.slice(0, THRESHOLDS.topValueRank).map((s) => s.customer_id),
    );

    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const score of scores) {
      if (score.revenue <= 0) continue;

      const reasons: string[] = [];
      const rank = byRevenue.findIndex((s) => s.customer_id === score.customer_id) + 1;
      const isTopValue = topValueIds.has(score.customer_id);
      const isLargeSpend = score.revenue >= THRESHOLDS.largeLifetimeSpendMinInr;
      const isRapidGrowth =
        score.prior_revenue > 0 &&
        score.recent_revenue >= score.prior_revenue * THRESHOLDS.growthMultiplier;

      if (isTopValue) reasons.push(`#${rank} customer by lifetime revenue`);
      if (isLargeSpend) reasons.push(`${formatInr(score.revenue)} lifetime spend`);
      if (isRapidGrowth) {
        const growthPct = Math.round((score.recent_revenue / score.prior_revenue - 1) * 100);
        reasons.push(
          `revenue up ${growthPct}% (${formatInr(score.prior_revenue)} -> ${formatInr(score.recent_revenue)} over the last two 90-day windows)`,
        );
      }

      if (reasons.length === 0) continue;

      insights.push({
        id: `${CUSTOMER_LTV_PROVIDER_ID}:${score.customer_id}`,
        source: CUSTOMER_LTV_PROVIDER_ID,
        module: "Customer",
        kind: "opportunity",
        tone: "success",
        confidence: 1,
        title: `${score.name} — ${formatInr(score.revenue)} lifetime value`,
        why: `${score.name}: ${reasons.join("; ")}.`,
        action: { label: "Open customer intelligence", href: "/dashboards/customer-intelligence" },
        entity: { type: "customer", id: score.customer_id, label: score.name },
        value: score.revenue,
        priority: computePriority({
          urgencyDays: (isTopValue ? 10 : 0) + (isRapidGrowth ? 10 : 0),
          valueInr: score.revenue,
        }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
