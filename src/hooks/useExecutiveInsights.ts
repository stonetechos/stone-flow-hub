/**
 * Shared executive insights hook.
 * Wires together provider registry polling, pipeline processing, and executive brief.
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

export interface UseExecutiveInsightsOptions {
  enabled?: boolean;
}

export interface UseExecutiveInsightsResult {
  /** Raw, unprocessed insights straight from every registered provider. */
  rawInsights: Insight[];
  /** Merged, deduped, conflict-resolved, priority-normalized, sorted. */
  processedInsights: ProcessedInsight[];
  executiveBrief: ExecutiveBrief;
  loading: boolean;
  error: boolean;
}

export function useExecutiveInsights(
  options?: UseExecutiveInsightsOptions,
): UseExecutiveInsightsResult {
  const { insights: rawInsights, isLoading, isError } = useInsights(options);

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
