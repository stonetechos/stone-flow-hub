/**
 * Filters insights for the active entity and renders them in InsightList.
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
  // Insights should not starve primary transactional data fetches on entity detail pages
  const { processedInsights, loading } = useExecutiveInsights({ enabled: false });

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
