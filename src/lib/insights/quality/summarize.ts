/**
 * summarize.ts — produces one Executive Summary object from a batch of
 * already-processed insights. Pure aggregation: counts by tone bucket and
 * the top few actions by normalized priority. No AI, no scoring of its
 * own — everything here was already computed by an earlier stage.
 *
 * Tone buckets: `critical` = danger-toned insights, `warning` =
 * warning-toned, `healthy` = everything else (info/success/neutral —
 * i.e. informational or positive signals like CustomerLifetimeValueProvider
 * or RepeatBusinessProvider's "opportunity" cards, not things on fire).
 */
import type { Insight } from "@/lib/insights/types";
import { resolveTone, type Tone } from "@/lib/ui/tones";
import type { WithNormalizedPriority } from "./priority";

export interface TopAction {
  id: string;
  title: string;
  module: string;
  tone: Tone;
  normalizedPriority: number;
  href: string;
}

export interface ExecutiveSummary {
  critical: number;
  warning: number;
  healthy: number;
  total: number;
  topActions: TopAction[];
}

const TOP_ACTIONS_LIMIT = 5;

export function summarizeInsights(insights: WithNormalizedPriority<Insight>[]): ExecutiveSummary {
  let critical = 0;
  let warning = 0;
  let healthy = 0;

  for (const insight of insights) {
    const tone = resolveTone(insight.tone);
    if (tone === "danger") critical += 1;
    else if (tone === "warning") warning += 1;
    else healthy += 1;
  }

  const topActions: TopAction[] = [...insights]
    .sort((a, b) => b.normalizedPriority - a.normalizedPriority)
    .slice(0, TOP_ACTIONS_LIMIT)
    .map((i) => ({
      id: i.id,
      title: i.title,
      module: i.module,
      tone: resolveTone(i.tone),
      normalizedPriority: i.normalizedPriority,
      href: i.action.href,
    }));

  return { critical, warning, healthy, total: insights.length, topActions };
}
