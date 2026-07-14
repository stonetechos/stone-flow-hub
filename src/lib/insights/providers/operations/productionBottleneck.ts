/**
 * ProductionBottleneckProvider — flags production orders and stages that
 * are overdue, blocked, stalled, or piling up at the same stage.
 *
 * Reads: `listProductionOrders()` and `listActiveProductionStages()` —
 * both new bulk fetches added to `manufacturing/api.ts` this phase,
 * mirroring the existing per-order `listProductionOrdersForSalesOrder` and
 * the stage query already inline in `routes/manufacturing/$id.tsx` (same
 * shape, just not scoped to one order).
 *
 * "Stage overload" does not invent a capacity number — it reuses each
 * stage's own `typical_days` (an existing value on `manufacturing_stages`,
 * the app's own definition of how long that stage normally takes) to
 * decide a stage is "stalled" for a given order, then counts how many
 * orders are simultaneously stalled at the same stage. The only
 * configurable number here is `stageOverloadMinOrders` — a detection
 * threshold like every other provider's thresholds.ts entries, not a
 * fabricated capacity/throughput figure.
 */
import {
  listProductionOrders,
  listActiveProductionStages,
  type ProductionStageListItem,
} from "@/lib/manufacturing/api";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince, daysUntil } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { PRODUCTION_BOTTLENECK_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const PRODUCTION_BOTTLENECK_PROVIDER_ID = "operations.production-bottleneck";

const OPEN_PO_STATUSES = new Set(["planned", "in_progress", "on_hold"]);

function stageStartDate(stage: ProductionStageListItem): string | null {
  return stage.actual_start ?? stage.started_at ?? stage.planned_start ?? null;
}

export const ProductionBottleneckProvider: InsightProvider = {
  id: PRODUCTION_BOTTLENECK_PROVIDER_ID,
  label: "Production bottleneck",
  fetch: async () => {
    const [orders, stages] = await Promise.all([listProductionOrders(), listActiveProductionStages()]);
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const insights: Insight[] = [];

    // Rule: overdue production order.
    for (const po of orders) {
      if (!OPEN_PO_STATUSES.has(po.status) || !po.planned_end) continue;
      const daysTo = daysUntil(po.planned_end, nowDate) + THRESHOLDS.overdueGraceDays;
      if (daysTo >= 0) continue;
      const overdueDays = -daysTo;
      const productName = po.products?.name ?? po.mfg_no;

      insights.push({
        id: `${PRODUCTION_BOTTLENECK_PROVIDER_ID}:overdue:${po.id}`,
        source: PRODUCTION_BOTTLENECK_PROVIDER_ID,
        module: "Operations",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `Production order ${po.mfg_no} is overdue — ${overdueDays}d`,
        why: `Production order ${po.mfg_no} (${productName}) was planned to finish by ${po.planned_end} and is still "${po.status}" ${overdueDays} day${overdueDays === 1 ? "" : "s"} later.`,
        action: { label: "Open production order", href: `/manufacturing/${po.id}` },
        entity: { type: "production_order", id: po.id, label: po.mfg_no },
        priority: computePriority({ urgencyDays: overdueDays }),
        generatedAt: now,
      });
    }

    // Rules: blocked / stalled stages (stalled also feeds the overload rule below).
    const stalledByStage = new Map<string, ProductionStageListItem[]>();

    for (const stage of stages) {
      const po = stage.production_orders;
      if (!po) continue;
      const stageName = stage.manufacturing_stages?.name ?? stage.stage_id;
      const orderLabel = po.mfg_no;

      if (stage.status === "on_hold" || stage.delay_reason) {
        insights.push({
          id: `${PRODUCTION_BOTTLENECK_PROVIDER_ID}:blocked:${stage.id}`,
          source: PRODUCTION_BOTTLENECK_PROVIDER_ID,
          module: "Operations",
          kind: "risk",
          tone: "danger",
          confidence: 1,
          title: `${orderLabel} blocked at ${stageName}`,
          why: stage.delay_reason
            ? `Production order ${orderLabel} is stuck at the ${stageName} stage: "${stage.delay_reason}".`
            : `Production order ${orderLabel} is on hold at the ${stageName} stage.`,
          action: { label: "Open production order", href: `/manufacturing/${po.id}` },
          entity: { type: "production_order", id: po.id, label: orderLabel },
          priority: computePriority({ urgencyDays: 10 }),
          generatedAt: now,
        });
        continue;
      }

      const typicalDays = stage.manufacturing_stages?.typical_days;
      const startDate = stageStartDate(stage);
      if (!typicalDays || typicalDays <= 0 || !startDate) continue;

      const daysInStage = daysSince(startDate, nowDate);
      const stallThreshold = typicalDays * THRESHOLDS.stageStallMultiplier;
      if (daysInStage <= stallThreshold) continue;

      insights.push({
        id: `${PRODUCTION_BOTTLENECK_PROVIDER_ID}:stalled:${stage.id}`,
        source: PRODUCTION_BOTTLENECK_PROVIDER_ID,
        module: "Operations",
        kind: "warning",
        tone: "warning",
        confidence: 1,
        title: `${orderLabel} stalled at ${stageName} — ${daysInStage}d`,
        why: `Production order ${orderLabel} has been at the ${stageName} stage for ${daysInStage} days — normal for this stage is ${typicalDays} day${typicalDays === 1 ? "" : "s"}.`,
        action: { label: "Open production order", href: `/manufacturing/${po.id}` },
        entity: { type: "production_order", id: po.id, label: orderLabel },
        priority: computePriority({ urgencyDays: daysInStage - typicalDays }),
        generatedAt: now,
      });

      const list = stalledByStage.get(stage.stage_id) ?? [];
      list.push(stage);
      stalledByStage.set(stage.stage_id, list);
    }

    // Rule: stage overload — several orders simultaneously stalled at the
    // same stage is a bigger bottleneck than any one order alone.
    for (const [stageId, stalled] of stalledByStage) {
      if (stalled.length < THRESHOLDS.stageOverloadMinOrders) continue;
      const stageName = stalled[0].manufacturing_stages?.name ?? stageId;
      const typicalDays = stalled[0].manufacturing_stages?.typical_days;
      const orderLabels = stalled
        .map((s) => s.production_orders?.mfg_no)
        .filter((label): label is string => !!label)
        .join(", ");

      insights.push({
        id: `${PRODUCTION_BOTTLENECK_PROVIDER_ID}:overload:${stageId}`,
        source: PRODUCTION_BOTTLENECK_PROVIDER_ID,
        module: "Operations",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `${stageName} stage is overloaded — ${stalled.length} orders stalled`,
        why:
          `${stalled.length} production orders are simultaneously stalled at the ${stageName} stage, ` +
          `each beyond its normal ${typicalDays ?? "typical"}-day duration: ${orderLabels}.`,
        action: { label: "Open production board", href: "/manufacturing" },
        entity: { type: "manufacturing_stage", id: stageId, label: stageName },
        priority: computePriority({ urgencyDays: stalled.length * 5 }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
