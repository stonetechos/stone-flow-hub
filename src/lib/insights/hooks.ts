/**
 * Shared hooks for the Executive Intelligence Foundation (Phase G.1).
 *
 * `useInsights` polls every registered provider via react-query — 60s
 * staleTime per the phase spec — and flattens the results into a single,
 * sorted list. `useInsightRegistry` exposes the live provider list itself,
 * for any UI that needs to know *what* producers exist (e.g. a future
 * settings/debug panel), independent of their fetched data.
 *
 * No providers are registered in Phase G.1, so `useInsights` always
 * resolves to an empty list today — this only proves the plumbing works
 * end-to-end for later phases to build on.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueries } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import type { Insight, InsightProvider } from "./types";
import { listInsightProviders, subscribeInsightRegistry } from "./registry";

/** Per Phase G.1 spec / performance tuning: producers are polled at a 5-minute cadence. */
export const INSIGHTS_STALE_TIME_MS = 300_000;

/** Live list of currently-registered providers — updates whenever a
 *  provider is registered/unregistered anywhere in the app. */
export function useInsightRegistry(): InsightProvider[] {
  return useSyncExternalStore(subscribeInsightRegistry, listInsightProviders, listInsightProviders);
}

export interface UseInsightsOptions {
  enabled?: boolean;
}

export interface UseInsightsResult {
  insights: Insight[];
  isLoading: boolean;
  isError: boolean;
  /** Ids of providers whose fetch failed — surfaced so one bad producer
   *  can't blank out every other insight in the merged list. */
  failedProviderIds: string[];
}

/** Aggregate insights across every registered provider. */
export function useInsights(options?: UseInsightsOptions): UseInsightsResult {
  const isEnabled = options?.enabled ?? true;
  const providers = useInsightRegistry();
  const [isDeferredReady, setIsDeferredReady] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      setIsDeferredReady(false);
      return;
    }
    // Stagger background insight queries 2s after mount so primary page data loads without network contention
    const t = setTimeout(() => setIsDeferredReady(true), 2000);
    return () => clearTimeout(t);
  }, [isEnabled]);

  const results = useQueries({
    queries: providers.map((provider) => ({
      queryKey: qk.insights.provider(provider.id),
      queryFn: provider.fetch,
      staleTime: INSIGHTS_STALE_TIME_MS,
      enabled: isEnabled && isDeferredReady,
    })),
  });

  return useMemo(() => {
    const insights: Insight[] = [];
    const failedProviderIds: string[] = [];
    results.forEach((result, index) => {
      if (result.data) insights.push(...result.data);
      if (result.isError) failedProviderIds.push(providers[index].id);
    });
    // Highest priority first; stable otherwise (Array#sort is stable in
    // modern JS engines, so equal-priority insights keep provider order).
    insights.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return {
      insights,
      isLoading: isEnabled && isDeferredReady && results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
      failedProviderIds,
    };
  }, [results, providers, isDeferredReady, isEnabled]);
}
