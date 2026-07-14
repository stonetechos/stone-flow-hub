/**
 * headline.ts — selects exactly ONE headline for the Executive Brief.
 *
 * Ordering (per phase spec, in this exact priority): highest-severity
 * insight (tone) first; among ties, module preference
 * Finance > Operations > Sales > Customer; among further ties, the
 * quality layer's own `normalizedPriority`. This is a distinct selection
 * rule from `quality/merge.ts`'s `isMoreSevere` (which tie-breaks on raw
 * `priority`, not module preference or normalizedPriority), so it isn't
 * duplicated scoring — it's a different, headline-specific ordering the
 * phase spec calls for explicitly.
 */
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import type { ExecutiveHeadline } from "./types";
import { resolveTone } from "@/lib/ui/tones";

const TONE_RANK: Record<string, number> = { danger: 4, warning: 3, info: 2, success: 1, neutral: 0 };
const MODULE_RANK: Record<string, number> = { Finance: 4, Operations: 3, Sales: 2, Customer: 1 };

function headlineScore(insight: ProcessedInsight): [number, number, number] {
  return [
    TONE_RANK[resolveTone(insight.tone)] ?? 0,
    MODULE_RANK[insight.module] ?? 0,
    insight.normalizedPriority,
  ];
}

function compareDesc(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return b[i] - a[i];
  }
  return 0;
}

const NO_INSIGHTS_HEADLINE: ExecutiveHeadline = {
  headline: "All clear",
  subtitle: "No open insights",
  reason: "No insights were produced by any provider in this run.",
  module: "Executive",
  tone: "success",
  insightId: "",
  href: "",
};

export function selectHeadline(insights: ProcessedInsight[]): ExecutiveHeadline {
  if (insights.length === 0) return NO_INSIGHTS_HEADLINE;

  const [winner] = [...insights].sort((a, b) => compareDesc(headlineScore(a), headlineScore(b)));

  return {
    headline: winner.title,
    subtitle: `${winner.module} · ${resolveTone(winner.tone)}`,
    reason: winner.why,
    module: winner.module,
    tone: resolveTone(winner.tone),
    insightId: winner.id,
    href: winner.action.href,
  };
}
