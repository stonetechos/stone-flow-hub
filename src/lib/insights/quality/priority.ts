/**
 * priority.ts — normalizes each Insight's raw `priority` field into a
 * single 0-100 score that's comparable across every module (Sales,
 * Finance, Operations, Customer), each of which computes `priority` on
 * its own scale via `lib/insights/shared/priority.ts`'s `computePriority`.
 *
 * This does NOT alter how any provider computed its priority — that
 * formula stays exactly where Phase G.2 put it. This stage only rescales
 * whichever raw numbers a given pipeline run actually produced, via
 * min-max normalization over the batch, so a "40" from one module and a
 * "9" from another end up on the same comparable scale for sorting and
 * display. Pure function — same input always produces the same output.
 */
import type { Insight } from "@/lib/insights/types";

export type WithNormalizedPriority<T extends Insight> = T & {
  /** 0-100, comparable across every module. Higher = more urgent.
   *  Relative to the batch passed in — not an absolute, cross-run scale. */
  normalizedPriority: number;
};

/** Used when every insight in the batch shares the same raw priority
 *  (nothing to compare against) — avoids a divide-by-zero and avoids
 *  arbitrarily favoring one insight when the inputs don't distinguish
 *  them at all. */
const NEUTRAL_SCORE = 50;

export function normalizePriority<T extends Insight>(insights: T[]): WithNormalizedPriority<T>[] {
  if (insights.length === 0) return [];

  const raw = insights.map((i) => i.priority ?? 0);
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const spread = max - min;

  return insights.map((insight) => {
    const value = insight.priority ?? 0;
    const normalizedPriority = spread === 0 ? NEUTRAL_SCORE : Math.round(((value - min) / spread) * 100);
    return { ...insight, normalizedPriority };
  });
}
