/**
 * sections.ts — builds the four executive sections (Sales, Operations,
 * Finance, Customers), each with a headline, top insight, count, health,
 * and at most one action.
 *
 * Insights arrive already sorted by `normalizedPriority` descending (the
 * quality layer's own final sort — see `quality/pipeline.ts`), so the
 * first insight matching a module is already that module's top insight;
 * this file doesn't re-derive priority ordering, only filters and counts.
 * Health reuses `computeHealth` from `health.ts` — the same function the
 * brief-level health uses, just fed this module's own counts.
 */
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import type { ExecutiveAction, ExecutiveSection, HealthCounts } from "./types";
import { resolveTone } from "@/lib/ui/tones";
import { computeHealth } from "./health";

/** [Insight.module value, display label] — Insight.module is "Customer"
 *  (singular, per every Phase G.5 provider) but the section is displayed
 *  as "Customers" (plural), per the phase spec's own section list. */
const SECTION_DEFS: Array<[string, string]> = [
  ["Sales", "Sales"],
  ["Operations", "Operations"],
  ["Finance", "Finance"],
  ["Customer", "Customers"],
];

function toAction(insight: ProcessedInsight): ExecutiveAction {
  return {
    id: insight.id,
    title: insight.title,
    href: insight.action.href,
    module: insight.module,
    tone: resolveTone(insight.tone),
    normalizedPriority: insight.normalizedPriority,
    entityType: insight.entity.type,
    entityId: insight.entity.id,
  };
}

function buildSection(
  moduleKey: string,
  label: string,
  insights: ProcessedInsight[],
): ExecutiveSection {
  const scoped = insights.filter((i) => i.module === moduleKey);

  const counts: HealthCounts = { critical: 0, warning: 0, healthy: 0, total: scoped.length };
  for (const insight of scoped) {
    const tone = resolveTone(insight.tone);
    if (tone === "danger") counts.critical += 1;
    else if (tone === "warning") counts.warning += 1;
    else counts.healthy += 1;
  }

  const top = scoped[0] ?? null;

  return {
    module: label,
    headline: top ? top.title : `No open ${label.toLowerCase()} insights`,
    topInsight: top,
    count: scoped.length,
    health: computeHealth(counts),
    topAction: top ? toAction(top) : null,
  };
}

export function buildSections(insights: ProcessedInsight[]): ExecutiveSection[] {
  return SECTION_DEFS.map(([moduleKey, label]) => buildSection(moduleKey, label, insights));
}
