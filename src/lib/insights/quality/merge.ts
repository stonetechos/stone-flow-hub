/**
 * merge.ts — collapses duplicate Insights that refer to the exact same
 * underlying record (same customer, same invoice, same quote, same
 * project, same production order, ...) into a single card, regardless of
 * which provider(s) produced them.
 *
 * "Same entity" is judged purely from `Insight.entity` (type + id) —
 * already present on every Insight since Phase G.2's contract requires
 * it — so this needs no database read, just a reduce over the array
 * already in memory. Never mutates its input; every group produces a
 * brand new object.
 */
import type { Insight } from "@/lib/insights/types";
import { resolveTone } from "@/lib/ui/tones";

/** A merged card remembers every raw insight it absorbed, so later
 *  pipeline stages (dedupe, conflicts) can still reason about the group
 *  without re-deriving it from scratch. */
export interface MergedInsight extends Insight {
  mergedFrom: Insight[];
}

/** Ordinal severity for the 5 canonical tones — the one place this
 *  ranking is defined; dedupe.ts and conflicts.ts both import
 *  `compareSeverity` from here instead of redefining it. */
const TONE_RANK: Record<string, number> = {
  danger: 4,
  warning: 3,
  info: 2,
  success: 1,
  neutral: 0,
};

/** True when `a` should be considered more severe/urgent than `b` — tone
 *  first, then the provider's own raw `priority` as a tiebreaker. Shared
 *  by every stage that needs to pick a "winner" between insights. */
export function isMoreSevere(a: Insight, b: Insight): boolean {
  const ra = TONE_RANK[resolveTone(a.tone)] ?? 0;
  const rb = TONE_RANK[resolveTone(b.tone)] ?? 0;
  if (ra !== rb) return ra > rb;
  return (a.priority ?? 0) > (b.priority ?? 0);
}

function entityKey(insight: Insight): string {
  return `${insight.entity.type}:${insight.entity.id}`;
}

/** Combine one entity's insights into a single representative card: the
 *  most severe tone/kind/action, the highest raw priority, and every
 *  distinct `why` sentence joined together so no information is lost. */
function combine(group: Insight[]): MergedInsight {
  if (group.length === 1) return { ...group[0], mergedFrom: group };

  const primary = group.reduce((best, next) => (isMoreSevere(next, best) ? next : best));
  const others = group.filter((i) => i !== primary);
  const whys = [primary.why, ...others.map((o) => o.why)].filter(
    (w, idx, arr) => arr.indexOf(w) === idx,
  );

  return {
    ...primary,
    id: `merged:${entityKey(primary)}`,
    why: whys.join(" "),
    priority: Math.max(...group.map((i) => i.priority ?? 0)),
    mergedFrom: group,
  };
}

/** Groups insights by `entity.type:entity.id` — exported so dedupe.ts and
 *  conflicts.ts can reuse the exact same notion of "same record" if they
 *  ever need it, instead of re-deriving their own key. */
export function groupByEntity(insights: Insight[]): Map<string, Insight[]> {
  const groups = new Map<string, Insight[]>();
  for (const insight of insights) {
    const key = entityKey(insight);
    const list = groups.get(key) ?? [];
    list.push(insight);
    groups.set(key, list);
  }
  return groups;
}

/** Merges every duplicate-entity group in `insights` into one card each.
 *  Order of the returned array is not significant — later pipeline stages
 *  (priority normalization, sorting) decide final ordering. */
export function mergeInsights(insights: Insight[]): MergedInsight[] {
  return [...groupByEntity(insights).values()].map(combine);
}
