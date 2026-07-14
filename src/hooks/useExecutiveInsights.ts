/**
 * useExecutiveInsights — Phase G.7 UI integration point for the completed
 * Insight Framework (G.1-G.6).
 *
 * Wires together, in order: `useInsights()` (G.1, polls every registered
 * provider), `processInsights()` (G.5.5, merge/dedupe/conflict-resolve/
 * normalize/summarize), and `buildExecutiveBrief()` (G.6, one Executive
 * Brief). No business logic lives here — this only calls the existing
 * pipeline functions and memoizes their output.
 *
 * Registers every provider pack (Sales, Finance, Operations, Customer)
 * exactly once per module load. None of the G.2-G.5 phases wired their
 * own `register*InsightProviders()` into the running app yet (each phase
 * explicitly excluded dashboard wiring) — `registry.ts` says as much:
 * "later phases call registerInsightProvider from their own module init
 * (e.g. a feature's api.ts or a top-level bootstrap file)". This hook is
 * that bootstrap file. `registerInsightProvider` replaces by id, so
 * calling this on every import (including hot-reload) is safe and
 * idempotent — it never double-registers.
 */
import { useMemo } from "react";
import { useInsights } from "@/lib/insights/hooks";
import type { Insight } from "@/lib/insights/types";
import { processInsights } from "@/lib/insights/quality/pipeline";
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import { buildExecutiveBrief } from "@/lib/insights/executive/brief";
import type { ExecutiveBrief } from "@/lib/insights/executive/types";
import { registerSalesInsightProviders } from "@/lib/insights/providers/sales";
import { registerFinanceInsightProviders } from "@/lib/insights/providers/finance";
import { registerOperationsInsightProviders } from "@/lib/insights/providers/operations";
import { registerCustomerInsightProviders } from "@/lib/insights/providers/customer";

let providersRegistered = false;
function ensureProvidersRegistered(): void {
  if (providersRegistered) return;
  providersRegistered = true;
  registerSalesInsightProviders();
  registerFinanceInsightProviders();
  registerOperationsInsightProviders();
  registerCustomerInsightProviders();
}
ensureProvidersRegistered();

export interface UseExecutiveInsightsResult {
  /** Raw, unprocessed insights straight from every registered provider. */
  rawInsights: Insight[];
  /** Merged, deduped, conflict-resolved, priority-normalized, sorted. */
  processedInsights: ProcessedInsight[];
  executiveBrief: ExecutiveBrief;
  loading: boolean;
  error: boolean;
}

export function useExecutiveInsights(): UseExecutiveInsightsResult {
  const { insights: rawInsights, isLoading, isError } = useInsights();

  return useMemo(() => {
    const result = processInsights(rawInsights);
    return {
      rawInsights,
      processedInsights: result.insights,
      executiveBrief: buildExecutiveBrief(result),
      loading: isLoading,
      error: isError,
    };
  }, [rawInsights, isLoading, isError]);
}
