/**
 * useInsightLifecycle — Phase G.8.6 Task 3.
 *
 * The one hook every consuming surface (Copilot, DangerNotifications,
 * EntityInsightPanel, and any future dashboard) calls to read and write
 * shared insight lifecycle state, so "acknowledged in Copilot" actually
 * means "stops showing up as new everywhere else" instead of each surface
 * keeping its own private memory.
 *
 * Deliberately thin: fetches the small `insight_states` table once (same
 * pattern as `useFavorites`), merges it onto whatever processed insight
 * list the caller already has (from `useExecutiveInsights()`), and
 * exposes one mutation every surface shares — so there is exactly one
 * write path, not one per surface.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import {
  listMyInsightStates,
  setInsightState,
  INSIGHT_SETTLED_STATUSES,
  type InsightLifecycleStatus,
} from "./api";

export interface InsightWithLifecycle extends ProcessedInsight {
  lifecycleStatus: InsightLifecycleStatus;
}

function stateKey(source: string, id: string): string {
  return `${source}:${id}`;
}

export interface UseInsightLifecycleResult {
  /** Every insight passed in, annotated with its current lifecycle status
   *  ("new" when the user has never interacted with it). */
  withLifecycle: InsightWithLifecycle[];
  /** Same list, minus anything already acknowledged/resolved/dismissed —
   *  what a "needs attention" surface should actually render. */
  active: InsightWithLifecycle[];
  /** Update one insight's status. Shared by every surface — one write
   *  path, immediately reflected everywhere via query invalidation. */
  setStatus: (insight: Pick<ProcessedInsight, "source" | "id">, status: InsightLifecycleStatus) => void;
  loading: boolean;
}

/** Merge shared lifecycle state onto a processed insight list, and expose
 *  the one mutation every surface should use to change it. */
export function useInsightLifecycle(insights: ProcessedInsight[]): UseInsightLifecycleResult {
  const qc = useQueryClient();

  const statesQ = useQuery({
    queryKey: qk.insightStates.all,
    queryFn: listMyInsightStates,
    staleTime: 30_000,
  });

  const stateMap = useMemo(() => {
    const m = new Map<string, InsightLifecycleStatus>();
    for (const row of statesQ.data ?? []) {
      m.set(stateKey(row.insight_source, row.insight_id), row.status);
    }
    return m;
  }, [statesQ.data]);

  const withLifecycle = useMemo<InsightWithLifecycle[]>(
    () =>
      insights.map((i) => ({
        ...i,
        lifecycleStatus: stateMap.get(stateKey(i.source, i.id)) ?? "new",
      })),
    [insights, stateMap],
  );

  const mutation = useMutation({
    mutationFn: (vars: { source: string; id: string; status: InsightLifecycleStatus }) =>
      setInsightState(vars.source, vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.insightStates.all }),
  });

  return {
    withLifecycle,
    active: withLifecycle.filter((i) => !INSIGHT_SETTLED_STATUSES.has(i.lifecycleStatus)),
    setStatus: (insight, status) => mutation.mutate({ source: insight.source, id: insight.id, status }),
    loading: statesQ.isLoading,
  };
}
