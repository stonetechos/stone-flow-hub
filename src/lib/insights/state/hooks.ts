/**
 * useInsightLifecycle — Phase G.8.6 Task 3, extended Phase G.8.7 Task 4.
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
 *
 * G.8.7 Task 4 adds two time-aware cases on top of the plain status
 * lookup, neither of which needs a write on every read:
 *  - `expired`: derived automatically from the insight's own
 *    `expiresAt` field (already part of the `Insight` contract, G.2) —
 *    once that timestamp passes, the insight is treated as settled even
 *    if no row was ever written for it.
 *  - `snoozed`: a row with status "snoozed" only stays settled while
 *    `snoozed_until` is still in the future; once it passes, the insight
 *    reverts to showing up as active again without any write happening —
 *    the *next* explicit action (dismiss, acknowledge, re-snooze) is what
 *    updates the row.
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
  type InsightStateRow,
} from "./api";

export interface InsightWithLifecycle extends ProcessedInsight {
  lifecycleStatus: InsightLifecycleStatus;
  snoozedUntil: string | null;
}

function stateKey(source: string, id: string): string {
  return `${source}:${id}`;
}

/** True when this insight should NOT be treated as needing attention right
 *  now — either because its own stored status is settled (and, for
 *  "snoozed", still within its snooze window), or because it has
 *  naturally expired per `Insight.expiresAt` regardless of any stored row. */
function isSettledNow(insight: ProcessedInsight, row: InsightStateRow | undefined): boolean {
  if (insight.expiresAt && new Date(insight.expiresAt).getTime() <= Date.now()) return true;
  if (!row) return false;
  if (row.status === "snoozed") {
    return !!row.snoozed_until && new Date(row.snoozed_until).getTime() > Date.now();
  }
  return INSIGHT_SETTLED_STATUSES.has(row.status);
}

export interface UseInsightLifecycleResult {
  /** Every insight passed in, annotated with its current lifecycle status
   *  ("new" when the user has never interacted with it, "expired" when
   *  past its own expiresAt regardless of any stored row). */
  withLifecycle: InsightWithLifecycle[];
  /** Same list, minus anything settled right now — what a "needs
   *  attention" surface should actually render. A snoozed insight
   *  reappears here automatically once its snooze window passes. */
  active: InsightWithLifecycle[];
  /** Update one insight's status. Shared by every surface — one write
   *  path, immediately reflected everywhere via query invalidation.
   *  `snoozedUntil` is required for status "snoozed" (also how a
   *  user-chosen "remind me on this date" action is modeled). */
  setStatus: (
    insight: Pick<ProcessedInsight, "source" | "id">,
    status: InsightLifecycleStatus,
    snoozedUntil?: string,
  ) => void;
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
    const m = new Map<string, InsightStateRow>();
    for (const row of statesQ.data ?? []) {
      m.set(stateKey(row.insight_source, row.insight_id), row);
    }
    return m;
  }, [statesQ.data]);

  const withLifecycle = useMemo<InsightWithLifecycle[]>(
    () =>
      insights.map((i) => {
        const row = stateMap.get(stateKey(i.source, i.id));
        const expiredByOwnClock =
          !row && i.expiresAt && new Date(i.expiresAt).getTime() <= Date.now();
        return {
          ...i,
          lifecycleStatus: expiredByOwnClock ? "expired" : (row?.status ?? "new"),
          snoozedUntil: row?.snoozed_until ?? null,
        };
      }),
    [insights, stateMap],
  );

  const active = useMemo(
    () => withLifecycle.filter((i) => !isSettledNow(i, stateMap.get(stateKey(i.source, i.id)))),
    [withLifecycle, stateMap],
  );

  const mutation = useMutation({
    mutationFn: (vars: {
      source: string;
      id: string;
      status: InsightLifecycleStatus;
      snoozedUntil?: string;
    }) => setInsightState(vars.source, vars.id, vars.status, vars.snoozedUntil),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.insightStates.all }),
  });

  return {
    withLifecycle,
    active,
    setStatus: (insight, status, snoozedUntil) =>
      mutation.mutate({ source: insight.source, id: insight.id, status, snoozedUntil }),
    loading: statesQ.isLoading,
  };
}
