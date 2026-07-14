/**
 * actions.ts — Top Five Executive Actions.
 *
 * The quality layer already guarantees at most one card per entity
 * (merge.ts) and at most one card per action destination (dedupe.ts), so
 * in practice there's rarely anything left to collapse here — but this
 * stays a self-contained, defensive pure function rather than trusting
 * the caller's array, per the phase spec's own explicit "no duplicate
 * actions / maximum one action per entity" rules for this file.
 *
 * Ordering: highest `normalizedPriority` first (re-sorted here rather
 * than assumed, for the same self-contained reason).
 */
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import type { ExecutiveAction } from "./types";
import { resolveTone } from "@/lib/ui/tones";

const TOP_ACTIONS_LIMIT = 5;

export function buildTopActions(insights: ProcessedInsight[], limit = TOP_ACTIONS_LIMIT): ExecutiveAction[] {
  const sorted = [...insights].sort((a, b) => b.normalizedPriority - a.normalizedPriority);

  const seenEntities = new Set<string>();
  const seenActions = new Set<string>();
  const result: ExecutiveAction[] = [];

  for (const insight of sorted) {
    const entityKey = `${insight.entity.type}:${insight.entity.id}`;
    const actionKey = `${insight.title}::${insight.action.href}`;
    if (seenEntities.has(entityKey) || seenActions.has(actionKey)) continue;

    seenEntities.add(entityKey);
    seenActions.add(actionKey);
    result.push({
      id: insight.id,
      title: insight.title,
      href: insight.action.href,
      module: insight.module,
      tone: resolveTone(insight.tone),
      normalizedPriority: insight.normalizedPriority,
      entityType: insight.entity.type,
      entityId: insight.entity.id,
    });

    if (result.length >= limit) break;
  }

  return result;
}
