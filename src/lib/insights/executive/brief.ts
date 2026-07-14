/**
 * brief.ts — `buildExecutiveBrief()`, the single entry point for the
 * Executive Aggregator (Phase G.6).
 *
 * Input: whatever `processInsights()` (Phase G.5.5) already produced —
 * this file does not read the database, does not know about the Insight
 * Registry or any individual provider, and does not import React or any
 * dashboard component. Pure function: same `ProcessedInsightResult` in,
 * same `ExecutiveBrief` out, every time.
 */
import type { ExecutiveBrief, ProcessedInsightResult } from "./types";
import { selectHeadline } from "./headline";
import { computeHealth } from "./health";
import { buildSections } from "./sections";
import { buildTopActions } from "./actions";
import { buildMetrics } from "./metrics";

export function buildExecutiveBrief(result: ProcessedInsightResult): ExecutiveBrief {
  const { insights, summary } = result;

  return {
    headline: selectHeadline(insights),
    health: computeHealth(summary),
    metrics: buildMetrics(insights, summary),
    sections: buildSections(insights),
    topActions: buildTopActions(insights),
    generatedAt: new Date().toISOString(),
  };
}
