/**
 * metrics.ts — Executive Metrics, pure aggregation over the quality
 * layer's own summary plus the processed insights themselves.
 *
 * `critical` / `warning` / `healthy` are read straight from the quality
 * layer's `ExecutiveSummary` (`quality/summarize.ts`) — not recomputed.
 * `resolved` counts insights the quality layer already consolidated away:
 * every extra raw insight `merge.ts` absorbed into a card (`mergedFrom`
 * beyond the first) plus every insight `conflicts.ts` folded into
 * `supportingContext` — i.e. how much noise was cleaned up before this
 * brief was built. `attentionRequired` is critical + warning.
 * `completionRatio` is healthy / total (1 when there are no insights at
 * all — nothing outstanding to report).
 */
import type { ExecutiveSummary } from "@/lib/insights/quality/summarize";
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import type { ExecutiveMetric } from "./types";

export function buildMetrics(
  insights: ProcessedInsight[],
  summary: ExecutiveSummary,
): ExecutiveMetric {
  const resolved = insights.reduce(
    (sum, insight) =>
      sum + Math.max(0, insight.mergedFrom.length - 1) + insight.supportingContext.length,
    0,
  );

  const attentionRequired = summary.critical + summary.warning;
  const completionRatio =
    summary.total === 0 ? 1 : Number((summary.healthy / summary.total).toFixed(2));

  return {
    critical: summary.critical,
    warning: summary.warning,
    healthy: summary.healthy,
    resolved,
    attentionRequired,
    completionRatio,
  };
}
