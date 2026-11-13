/**
 * Renders a responsive grid of insights via InsightCard.
 */
import { InsightCard } from "@/components/dashboard/InsightCard";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights/types";

export interface InsightListProps {
  insights: Insight[];
  className?: string;
  onDismiss?: (insight: Insight) => void;
}

export function InsightList({ insights, className, onDismiss }: InsightListProps) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {insights.map((insight) => (
        <InsightCard
          key={`${insight.source}:${insight.id}`}
          kind={insight.kind}
          tone={insight.tone}
          title={insight.title}
          detail={insight.why}
          to={insight.action.href}
          onDismiss={onDismiss ? () => onDismiss(insight) : undefined}
        />
      ))}
    </div>
  );
}
