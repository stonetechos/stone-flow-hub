/**
 * Operations Intelligence Pack — registers every Operations insight
 * provider with the shared Insight Registry (see lib/insights/registry.ts).
 *
 * Mirrors `providers/sales/index.ts` and `providers/finance/index.ts`
 * exactly: no provider references another, and this file is the only
 * place that knows all five exist.
 *
 * Deliberately NOT auto-run on import — nothing in the app calls
 * `registerOperationsInsightProviders()` yet (Phase G.4 explicitly
 * excludes dashboard wiring). A later phase decides where/when to invoke
 * this.
 */
import { registerInsightProvider } from "@/lib/insights/registry";
import { DispatchRiskProvider } from "./dispatchRisk";
import { InstallationDelayProvider } from "./installationDelay";
import { InventoryShortageProvider } from "./inventoryShortage";
import { ProductionBottleneckProvider } from "./productionBottleneck";
import { VendorDeliveryRiskProvider } from "./vendorDeliveryRisk";

export { DispatchRiskProvider } from "./dispatchRisk";
export { InstallationDelayProvider } from "./installationDelay";
export { InventoryShortageProvider } from "./inventoryShortage";
export { ProductionBottleneckProvider } from "./productionBottleneck";
export { VendorDeliveryRiskProvider } from "./vendorDeliveryRisk";

const OPERATIONS_INSIGHT_PROVIDERS = [
  DispatchRiskProvider,
  InstallationDelayProvider,
  InventoryShortageProvider,
  ProductionBottleneckProvider,
  VendorDeliveryRiskProvider,
];

/**
 * Registers all Operations Intelligence providers with the Insight
 * Registry. Returns a single cleanup function that unregisters every one
 * of them. Safe to call more than once — `registerInsightProvider`
 * replaces an existing registration by id rather than duplicating it.
 */
export function registerOperationsInsightProviders(): () => void {
  const unregisterFns = OPERATIONS_INSIGHT_PROVIDERS.map((provider) => registerInsightProvider(provider));
  return () => unregisterFns.forEach((unregister) => unregister());
}
