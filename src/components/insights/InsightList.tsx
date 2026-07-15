/**
 * <InsightList> — a pure layout component that arranges `Insight`s in a
 * responsive grid, delegating all actual rendering to <InsightCard>.
 *
 * Deliberately minimal (Phase G.1.1 refinement): earlier drafts of this
 * component also owned loading / empty / error states, which duplicated
 * responsibility that belongs to whichever page consumes `useInsights()` —
 * exactly as every other list/table screen in this app already handles its
 * own loading/empty/error via the shared `components/layout/States`
 * primitives (see e.g. `routes/_authenticated/invoices/new.tsx`). Keeping
 * that logic out of InsightList keeps it a true layout-only primitive that
 * any Intelligence surface can drop resolved insights into.
 *
 * `onDismiss` (Phase G.8.6 Task 3, optional/additive): forwarded to each
 * `InsightCard` so a caller wired to the shared insight lifecycle
 * (`useInsightLifecycle`) can let a user dismiss/acknowledge directly from
 * the list, reflected everywhere else that insight is shown.
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
