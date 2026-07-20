/**
 * MarginWatchProvider — flags projects with thin or negative margins using
 * the existing profitability rollup.
 *
 * Reads: `getProjectProfitability()` (projects, estimates, quotes, invoices,
 * vendor_payments, purchase_orders — already joined/aggregated there).
 * This provider does not recompute gross/net profit itself; it only
 * classifies numbers `getProjectProfitability()` already produced.
 *
 * "Rapidly declining margin" (per phase spec) is a documented no-op: the
 * schema has no historical margin-snapshot table — profitability is
 * computed live from current totals, not stored per period — so there is
 * no real prior-period number to compare against. Fabricating a trend from
 * a single point-in-time snapshot would be inventing data, which the phase
 * rules explicitly forbid, so only the two detectable states (low /
 * negative margin) are implemented — the same honesty pattern Phase G.2's
 * FollowUpRecommendationProvider used for "customer importance".
 */
import { getProjectProfitability } from "@/lib/executive/profitability";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { MARGIN_WATCH_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const MARGIN_WATCH_PROVIDER_ID = "finance.margin-watch";

export type MarginState = "negative" | "low";

/** Pure classification — no I/O, easy to test in isolation. */
export function classifyMargin(profitPct: number, thresholds = THRESHOLDS): MarginState | null {
  if (profitPct <= thresholds.criticalMarginPct) return "negative";
  if (profitPct < thresholds.lowMarginPct) return "low";
  return null;
}

export const MarginWatchProvider: InsightProvider = {
  id: MARGIN_WATCH_PROVIDER_ID,
  label: "Margin watch",
  fetch: async () => {
    const projects = await getProjectProfitability();
    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const p of projects) {
      if (p.actual_sales <= 0) continue; // nothing invoiced yet — no real margin to judge
      const state = classifyMargin(p.profit_pct);
      if (!state) continue;

      const customerPart = p.customer_name ? ` (${p.customer_name})` : "";
      const totalCost =
        p.material_cost +
        p.procurement_cost +
        p.installation_cost +
        p.labour_cost +
        p.transport_cost;

      const title =
        state === "negative"
          ? `${p.project_name} is running at a loss${customerPart}`
          : `${p.project_name} margin is thin${customerPart} — ${p.profit_pct.toFixed(1)}%`;

      const why =
        state === "negative"
          ? `${p.project_name}${customerPart} has billed ${formatInr(p.actual_sales)} against ` +
            `${formatInr(totalCost)} in costs — a net margin of ${p.profit_pct.toFixed(1)}% (${formatInr(p.net_profit)}).`
          : `${p.project_name}${customerPart} net margin is ${p.profit_pct.toFixed(1)}% ` +
            `(${formatInr(p.net_profit)} on ${formatInr(p.actual_sales)} billed) — below the ${THRESHOLDS.lowMarginPct}% target.`;

      insights.push({
        id: `${MARGIN_WATCH_PROVIDER_ID}:${p.project_id}`,
        source: MARGIN_WATCH_PROVIDER_ID,
        module: "Finance",
        kind: state === "negative" ? "risk" : "warning",
        tone: state === "negative" ? "danger" : "warning",
        confidence: 1,
        title,
        why,
        action: { label: "Open project financials", href: `/projects/${p.project_id}` },
        entity: { type: "project", id: p.project_id, label: p.project_name },
        value: p.net_profit,
        priority: computePriority({
          urgencyDays: Math.max(0, THRESHOLDS.lowMarginPct - p.profit_pct),
          valueInr: p.actual_sales,
        }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
