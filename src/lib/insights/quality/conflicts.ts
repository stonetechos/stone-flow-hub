/**
 * conflicts.ts — resolves conflicting recommendations about the same
 * real-world subject (the phase spec's example: one insight recommends
 * following up, another recommends holding dispatch).
 *
 * "Same subject" is judged by matching `entity.label` (e.g. two
 * different insights that both name the same customer) — deliberately
 * conservative. This pipeline never reads the database, so it can't join
 * across tables to discover that a dispatch and a customer are related;
 * matching the human-readable label already sitting on both Insight
 * objects is the one piece of shared context available without one.
 *
 * A "stance" (engage vs restrain) is looked up from the producing
 * provider's stable `source` id — not guessed from free-text `why`/title,
 * which would be closer to pattern-guessing than a deterministic rule.
 * Providers not listed default to "neutral" and never participate in a
 * conflict.
 *
 * Higher severity wins and stays in the output; the loser is removed as
 * its own card and its title is folded into the winner's
 * `supportingContext` instead of being dropped entirely.
 */
import type { MergedInsight } from "./merge";
import { isMoreSevere } from "./merge";

export interface ResolvedInsight extends MergedInsight {
  /** Titles of lower-severity, opposing-stance insights that were folded
   *  into this card instead of shown as their own. Empty when this
   *  insight had no conflict. */
  supportingContext: string[];
}

type Stance = "engage" | "restrain" | "neutral";

const PROVIDER_STANCE: Record<string, Stance> = {
  "sales.followup-recommendation": "engage",
  "sales.cold-enquiry": "engage",
  "sales.lost-opportunity": "engage",
  "customer.repeat-business": "engage",
  "customer.lifetime-value": "engage",
  "finance.collection-priority": "restrain",
  "finance.payment-schedule-adherence": "restrain",
  "finance.vendor-payment-queue": "restrain",
  "operations.dispatch-risk": "restrain",
  "operations.installation-delay": "restrain",
  "customer.health": "restrain",
};

function stanceOf(insight: MergedInsight): Stance {
  return PROVIDER_STANCE[insight.source] ?? "neutral";
}

function labelKey(insight: MergedInsight): string {
  return insight.entity.label.trim().toLowerCase();
}

export function resolveConflicts(insights: MergedInsight[]): ResolvedInsight[] {
  const byLabel = new Map<string, MergedInsight[]>();
  for (const insight of insights) {
    if (!insight.entity.label) continue;
    const key = labelKey(insight);
    const list = byLabel.get(key) ?? [];
    list.push(insight);
    byLabel.set(key, list);
  }

  const demoted = new Set<string>();
  const context = new Map<string, string[]>();

  for (const group of byLabel.values()) {
    if (group.length < 2) continue;
    const engaging = group.filter((i) => stanceOf(i) === "engage");
    const restraining = group.filter((i) => stanceOf(i) === "restrain");
    if (engaging.length === 0 || restraining.length === 0) continue;

    for (const e of engaging) {
      for (const r of restraining) {
        const [winner, loser] = isMoreSevere(e, r) ? [e, r] : [r, e];
        demoted.add(loser.id);
        const list = context.get(winner.id) ?? [];
        if (!list.includes(loser.title)) list.push(loser.title);
        context.set(winner.id, list);
      }
    }
  }

  return insights
    .filter((i) => !demoted.has(i.id))
    .map((i) => ({ ...i, supportingContext: context.get(i.id) ?? [] }));
}
