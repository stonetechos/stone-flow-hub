/**
 * dedupe.ts — removes identical recommendations that survive merge.ts.
 *
 * merge.ts collapses insights that share the exact same `entity` (e.g.
 * two insights both about customer X). This stage catches the broader
 * case the phase spec describes: multiple providers all recommending
 * the same *action* — e.g. CustomerHealthProvider, CustomerHygieneProvider,
 * and PaymentScheduleAdherenceProvider can all land on
 * `action.href = "/customers/<id>"` for the same customer despite having
 * three different `entity.type`s (customer, customer, payment_schedule),
 * so merge.ts's strict entity match wouldn't catch them. Grouping by
 * `action.href` — the literal "where this sends you" — does.
 *
 * "Only retain one. Merge explanations": the most severe surviving card
 * is kept, and every other card's `why` is folded into it rather than
 * discarded.
 */
import type { MergedInsight } from "./merge";
import { isMoreSevere } from "./merge";

function actionKey(insight: MergedInsight): string {
  return insight.action.href;
}

export function dedupeInsights(insights: MergedInsight[]): MergedInsight[] {
  const groups = new Map<string, MergedInsight[]>();
  for (const insight of insights) {
    const key = actionKey(insight);
    const list = groups.get(key) ?? [];
    list.push(insight);
    groups.set(key, list);
  }

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];

    const primary = group.reduce((best, next) => (isMoreSevere(next, best) ? next : best));
    const others = group.filter((i) => i !== primary);
    const whys = [primary.why, ...others.map((o) => o.why)].filter(
      (w, idx, arr) => arr.indexOf(w) === idx,
    );

    return {
      ...primary,
      why: whys.join(" "),
      priority: Math.max(...group.map((i) => i.priority ?? 0)),
      mergedFrom: group.flatMap((g) => g.mergedFrom),
    };
  });
}
