/**
 * pipeline.ts — the single deterministic entry point for the Insight
 * Quality Layer (Phase G.5.5).
 *
 *   merge -> dedupe -> conflict resolution -> priority normalization ->
 *   summary generation -> sorted output
 *
 * `processInsights()` is a pure function of its input: the same
 * `Insight[]` always produces the same `ProcessedInsights` back. It does
 * not read the database, does not know about the Insight Registry or any
 * individual provider, and never mutates the array it's given — every
 * stage returns a brand new array. Callers (a future dashboard/Copilot
 * phase) are expected to feed it whatever `useInsights()` already
 * resolved, e.g. `processInsights(useInsights().insights)`.
 */
import type { Insight } from "@/lib/insights/types";
import { mergeInsights } from "./merge";
import { dedupeInsights } from "./dedupe";
import { resolveConflicts, type ResolvedInsight } from "./conflicts";
import { normalizePriority, type WithNormalizedPriority } from "./priority";
import { summarizeInsights, type ExecutiveSummary } from "./summarize";

export type ProcessedInsight = WithNormalizedPriority<ResolvedInsight>;

export interface ProcessedInsights {
  /** Merged, deduped, conflict-resolved, normalized, and sorted
   *  (highest `normalizedPriority` first). Ready to render as-is. */
  insights: ProcessedInsight[];
  summary: ExecutiveSummary;
}

export function processInsights(insights: Insight[]): ProcessedInsights {
  const merged = mergeInsights(insights);
  const deduped = dedupeInsights(merged);
  const resolved = resolveConflicts(deduped);
  const scored = normalizePriority(resolved);
  const sorted = [...scored].sort((a, b) => b.normalizedPriority - a.normalizedPriority);
  const summary = summarizeInsights(sorted);

  return { insights: sorted, summary };
}
