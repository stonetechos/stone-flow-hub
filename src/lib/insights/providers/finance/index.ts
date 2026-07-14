/**
 * Finance Intelligence Pack — registers every Finance insight provider with
 * the shared Insight Registry (see lib/insights/registry.ts).
 *
 * Mirrors `providers/sales/index.ts` exactly: no provider references
 * another, and this file is the only place that knows all four exist.
 *
 * Deliberately NOT auto-run on import — nothing in the app calls
 * `registerFinanceInsightProviders()` yet (Phase G.3 explicitly excludes
 * dashboard wiring). A later phase decides where/when to invoke this.
 */
import { registerInsightProvider } from "@/lib/insights/registry";
import { CollectionPriorityProvider } from "./collectionPriority";
import { PaymentScheduleAdherenceProvider } from "./paymentScheduleAdherence";
import { VendorPaymentQueueProvider } from "./vendorPaymentQueue";
import { MarginWatchProvider } from "./marginWatch";

export { CollectionPriorityProvider } from "./collectionPriority";
export { PaymentScheduleAdherenceProvider } from "./paymentScheduleAdherence";
export { VendorPaymentQueueProvider } from "./vendorPaymentQueue";
export { MarginWatchProvider } from "./marginWatch";

const FINANCE_INSIGHT_PROVIDERS = [
  CollectionPriorityProvider,
  PaymentScheduleAdherenceProvider,
  VendorPaymentQueueProvider,
  MarginWatchProvider,
];

/**
 * Registers all Finance Intelligence providers with the Insight Registry.
 * Returns a single cleanup function that unregisters every one of them.
 * Safe to call more than once — `registerInsightProvider` replaces an
 * existing registration by id rather than duplicating it.
 */
export function registerFinanceInsightProviders(): () => void {
  const unregisterFns = FINANCE_INSIGHT_PROVIDERS.map((provider) => registerInsightProvider(provider));
  return () => unregisterFns.forEach((unregister) => unregister());
}
