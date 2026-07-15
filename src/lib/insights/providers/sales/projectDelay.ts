/**
 * ProjectDelayProvider — Phase G.8.8 Task 2 (Final Intelligence
 * Consolidation).
 *
 * Surfaces projects past their expected completion date that aren't yet
 * completed/lost/cancelled. This closes the one genuine coverage gap
 * found in `lib/executive/command-center.ts`'s ad-hoc `insights:
 * OwnerInsight[]` array: "Biggest delayed project" was computed there
 * (one query, limit 1, no stable id) with no registry equivalent — unlike
 * that array's other two insights ("Payment needing immediate attention"
 * and "Material shortage"), which duplicated CollectionPriorityProvider
 * and InventoryShortageProvider respectively and were retired outright
 * rather than re-implemented here (see BusinessInsightsCard.tsx and this
 * phase's deliverable for the full reasoning).
 *
 * Unlike the old ad-hoc version (which only ever surfaced the single
 * worst delayed project), this provider follows the same convention every
 * other multi-record provider in this registry uses — one insight per
 * affected record (see DispatchRiskProvider, InstallationDelayProvider)
 * — and lets the Quality Pipeline's priority sort decide what surfaces
 * first wherever only the top few are shown.
 *
 * Reuses `listProjects()` (existing bulk fetch) rather than adding a new
 * raw query — same filter condition command-center.ts used
 * (expected_completion_date in the past, stage not completed/lost/
 * cancelled), just applied to every matching row instead of only the
 * single oldest one.
 */
import { listProjects } from "@/lib/projects/api";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";

export const PROJECT_DELAY_PROVIDER_ID = "sales.project-delay";

const CLOSED_STAGES = new Set(["completed", "lost", "cancelled"]);

export const ProjectDelayProvider: InsightProvider = {
  id: PROJECT_DELAY_PROVIDER_ID,
  label: "Project delay",
  fetch: async () => {
    const projects = await listProjects();
    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const p of projects) {
      if (!p.expected_completion_date) continue;
      if (CLOSED_STAGES.has(String(p.stage))) continue;
      const overdueDays = daysSince(p.expected_completion_date);
      if (overdueDays <= 0) continue;

      const customerPart = p.customer ? ` for ${p.customer.name}` : "";
      insights.push({
        id: `${PROJECT_DELAY_PROVIDER_ID}:${p.id}`,
        source: PROJECT_DELAY_PROVIDER_ID,
        module: "Sales",
        kind: "warning",
        tone: overdueDays > 30 ? "danger" : "warning",
        confidence: 1,
        title: `${p.name} is ${overdueDays}d past its expected completion`,
        why: `Project ${p.name}${customerPart} was expected to complete on ${p.expected_completion_date} and is still "${p.stage}" ${overdueDays} day${overdueDays === 1 ? "" : "s"} later.`,
        action: { label: "Open project", href: `/projects/${p.id}` },
        entity: { type: "project", id: p.id, label: p.name },
        priority: computePriority({ urgencyDays: overdueDays }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
