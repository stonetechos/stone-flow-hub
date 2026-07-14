/**
 * Customer Intelligence Pack — registers every Customer insight provider
 * with the shared Insight Registry (see lib/insights/registry.ts).
 *
 * Mirrors `providers/sales/index.ts`, `providers/finance/index.ts`, and
 * `providers/operations/index.ts` exactly: no provider references
 * another, and this file is the only place that knows all four exist.
 *
 * `registerCustomerInsightProviders()` is called from
 * `useExecutiveInsights()`, which is what actually reaches Copilot,
 * DangerNotifications, and the Executive Brief.
 *
 * `CustomerDataQualityProvider` (./customerDataQuality.ts) is
 * deliberately excluded from `CUSTOMER_INSIGHT_PROVIDERS` below — it's a
 * future-ready Data Quality report (Phase G.8 Part 1), not an Executive
 * Intelligence source, and must not be added to that array or registered
 * until a dedicated Data Quality surface actually wants it.
 */
import { registerInsightProvider } from "@/lib/insights/registry";
import { CustomerHealthProvider } from "./customerHealth";
import { CustomerLifetimeValueProvider } from "./customerLifetimeValue";
import { CustomerHygieneProvider } from "./customerHygiene";
import { RepeatBusinessProvider } from "./repeatBusiness";

export { CustomerHealthProvider } from "./customerHealth";
export { CustomerLifetimeValueProvider } from "./customerLifetimeValue";
export { CustomerHygieneProvider } from "./customerHygiene";
export { RepeatBusinessProvider } from "./repeatBusiness";
// Not part of CUSTOMER_INSIGHT_PROVIDERS — see header comment.
export { CustomerDataQualityProvider } from "./customerDataQuality";

const CUSTOMER_INSIGHT_PROVIDERS = [
  CustomerHealthProvider,
  CustomerLifetimeValueProvider,
  CustomerHygieneProvider,
  RepeatBusinessProvider,
];

/**
 * Registers all Customer Intelligence providers with the Insight Registry.
 * Returns a single cleanup function that unregisters every one of them.
 * Safe to call more than once — `registerInsightProvider` replaces an
 * existing registration by id rather than duplicating it.
 */
export function registerCustomerInsightProviders(): () => void {
  const unregisterFns = CUSTOMER_INSIGHT_PROVIDERS.map((provider) => registerInsightProvider(provider));
  return () => unregisterFns.forEach((unregister) => unregister());
}
