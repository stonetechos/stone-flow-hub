/**
 * GrowthAdvisoryProvider — org-wide margin/pricing/sales-target advisory.
 *
 * Wraps computeGrowthAdvisory() (src/lib/executive/growthAdvisory.ts —
 * read that file's header for the full reasoning and formula) as a single
 * Insight so it appears wherever the Finance pack already does: the
 * dashboard, Smart Notifications, Business Health, Copilot, and
 * DangerNotifications toasts — all already wired to
 * `useExecutiveInsights()` (see src/hooks/useExecutiveInsights.ts). No new
 * dashboard wiring needed for this part of Rishi's request.
 *
 * This is deliberately ONE org-wide insight, not one per project —
 * MarginWatchProvider already covers the per-project case. This is the
 * aggregate statement Rishi asked for ("across all the users", a single
 * shared target, not per-project noise).
 *
 * The separate broadcast-notification piece (the "notifications" half of
 * the request) is NOT done here — an Insight only renders to whoever is
 * looking at a screen that reads the registry. Posting an actual row to
 * the shared, all-users notification centre needs a privileged
 * service-role write, which insight providers deliberately can't do (they
 * are pure reads). See GrowthAdvisoryBroadcaster.tsx +
 * growthAdvisory.functions.ts for that half.
 */
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import {
  computeGrowthAdvisory,
  formatGrowthAdvisoryBody,
  formatGrowthAdvisoryTitle,
} from "@/lib/executive/growthAdvisory";

export const GROWTH_ADVISORY_PROVIDER_ID = "finance.growth-advisory";

export const GrowthAdvisoryProvider: InsightProvider = {
  id: GROWTH_ADVISORY_PROVIDER_ID,
  label: "Growth advisory",
  fetch: async () => {
    const advisory = await computeGrowthAdvisory();
    if (!advisory) return [];

    const insight: Insight = {
      id: `${GROWTH_ADVISORY_PROVIDER_ID}:${advisory.key}`,
      source: GROWTH_ADVISORY_PROVIDER_ID,
      module: "Finance",
      kind: "risk",
      tone: advisory.aggregateMarginPct <= 0 ? "danger" : "warning",
      confidence: 1,
      title: formatGrowthAdvisoryTitle(advisory),
      why: formatGrowthAdvisoryBody(advisory),
      action: { label: "Open Business Health", href: "/dashboards/business-health" },
      entity: { type: "organization", id: "org", label: "Stone Tech" },
      value: advisory.additionalRevenueNeeded,
      priority: computePriority({
        urgencyDays: Math.max(0, advisory.targetMarginPct - advisory.aggregateMarginPct),
        valueInr: advisory.aggregateRevenue,
      }),
      generatedAt: new Date().toISOString(),
    };
    return [insight];
  },
};
