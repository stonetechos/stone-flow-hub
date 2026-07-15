/**
 * EntityInsightPanel — Phase G.7 UI integration; lifecycle-aware as of
 * Phase G.8.6 Task 3.
 *
 * Filters `useExecutiveInsights().processedInsights` down to whatever
 * `entity.type` + `entity.id` the current page is about, and renders them
 * with the existing `<InsightList>` (Phase G.1.1) — no new rendering
 * primitive, no business logic, just a filter + reuse.
 *
 * Renders nothing while loading or when there are no matching insights.
 * That's expected today for entity types no current provider targets
 * directly — e.g. no provider emits `entity.type === "invoice"` yet (see
 * each provider pack's index.ts for the full list of entity types actually
 * produced) — rather than fabricating a relationship between an invoice
 * and, say, a payment-schedule insight that isn't really about it.
 *
 * Task 3 change: insights already acknowledged/resolved/dismissed
 * elsewhere (Copilot, DangerNotifications) no longer render here either —
 * this was one of the three concrete surfaces the G.8.5 audit named
 * ("Customer Pages") where the same signal kept resurfacing after a user
 * had already dealt with it. Each remaining card offers a dismiss action
 * wired to the same shared state.
 */
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle } from "@/lib/insights/state/hooks";
import { InsightList } from "@/components/insights/InsightList";

export function EntityInsightPanel({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const { processedInsights, loading } = useExecutiveInsights();

  const scoped = processedInsights.filter(
    (insight) => insight.entity.type === entityType && insight.entity.id === entityId,
  );
  const { active, setStatus } = useInsightLifecycle(scoped);

  if (loading) return null;
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Insights
      </h3>
      <InsightList insights={active} onDismiss={(i) => setStatus(i, "dismissed")} />
    </div>
  );
}
