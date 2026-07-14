/**
 * Insight Registry — central place where feature modules register their
 * `InsightProvider` (Phase G.1 infrastructure).
 *
 * The registry only tracks *which producers exist*; it does not fetch or
 * cache their data (that's `useInsights` in ./hooks, via react-query).
 * Ships empty — later phases call `registerInsightProvider` from their own
 * module init (e.g. a feature's `api.ts` or a top-level bootstrap file).
 */
import type { InsightProvider } from "./types";

const providers = new Map<string, InsightProvider>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Register a provider. Re-registering the same `id` replaces it (last write
 * wins) so hot-reload and test setup/teardown stay simple.
 * Returns an unregister function for convenient cleanup (e.g. in a
 * `useEffect`).
 */
export function registerInsightProvider(provider: InsightProvider): () => void {
  providers.set(provider.id, provider);
  notify();
  return () => unregisterInsightProvider(provider.id);
}

export function unregisterInsightProvider(id: string): void {
  if (providers.delete(id)) notify();
}

/** Snapshot of every currently-registered provider. */
export function listInsightProviders(): InsightProvider[] {
  return Array.from(providers.values());
}

export function getInsightProvider(id: string): InsightProvider | undefined {
  return providers.get(id);
}

/** React-friendly subscription — pairs with `useSyncExternalStore` in ./hooks. */
export function subscribeInsightRegistry(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Test/dev helper — clears all registered providers and listeners. */
export function resetInsightRegistry(): void {
  providers.clear();
  notify();
}
