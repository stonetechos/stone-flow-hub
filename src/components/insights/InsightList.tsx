/**
 * <InsightList> — renders a set of `Insight`s using the existing
 * <InsightCard> (Phase G.1 infrastructure — no new card design).
 *
 * Purely presentational: it takes already-resolved insights (typically from
 * `useInsights`, see lib/insights/hooks.ts) plus loading/error flags, and
 * handles the loading / empty / error states with the same shared
 * primitives used across the rest of the app.
 */
import { Sparkles } from "lucide-react";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights/types";

export interface InsightListProps {
  insights: Insight[];
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}

export function InsightList({
  insights,
  isLoading,
  isError,
  emptyTitle = "No insights yet",
  emptyMessage = "Nothing needs your attention right now.",
  className,
}: InsightListProps) {
  if (isLoading) return <LoadingBlock label="Loading insights…" />;
  if (isError) return <ErrorBlock message="Some insights failed to load." />;
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {insights.map((insight) => (
        <InsightCard
          key={`${insight.source}:${insight.id}`}
          kind={insight.kind}
          tone={insight.tone}
          title={insight.title}
          detail={insight.detail}
          to={insight.href}
        />
      ))}
    </div>
  );
}
