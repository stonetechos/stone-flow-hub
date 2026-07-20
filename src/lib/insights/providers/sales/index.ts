/**
 * Sales Intelligence Pack — registers every Sales insight provider with
 * the shared Insight Registry (see lib/insights/registry.ts).
 *
 * Per the phase spec, no provider references another, and this file is
 * the only place that knows all six exist.
 *
 * Deliberately NOT auto-run on import: nothing in the app calls
 * `registerSalesInsightProviders()` yet (Phase G.2 explicitly excludes
 * dashboard/Copilot wiring). A later phase decides where/when to invoke
 * this — e.g. once during app bootstrap.
 */
import { registerInsightProvider } from "@/lib/insights/registry";
import { QuoteAgeingProvider } from "./quoteAgeing";
import { ColdEnquiryProvider } from "./coldEnquiry";
import { LostOpportunityProvider } from "./lostOpportunity";
import { FollowUpRecommendationProvider } from "./followUpRecommendation";
import { EnquiryOwnershipProvider } from "./enquiryOwnership";
import { ProjectDelayProvider } from "./projectDelay";

export { QuoteAgeingProvider } from "./quoteAgeing";
export { ColdEnquiryProvider } from "./coldEnquiry";
export { LostOpportunityProvider } from "./lostOpportunity";
export { FollowUpRecommendationProvider } from "./followUpRecommendation";
export { EnquiryOwnershipProvider } from "./enquiryOwnership";
export { ProjectDelayProvider } from "./projectDelay";

const SALES_INSIGHT_PROVIDERS = [
  QuoteAgeingProvider,
  ColdEnquiryProvider,
  LostOpportunityProvider,
  FollowUpRecommendationProvider,
  EnquiryOwnershipProvider,
  ProjectDelayProvider,
];

/**
 * Registers all Sales Intelligence providers with the Insight Registry.
 * Returns a single cleanup function that unregisters every one of them.
 * Safe to call more than once — `registerInsightProvider` replaces an
 * existing registration by id rather than duplicating it.
 */
export function registerSalesInsightProviders(): () => void {
  const unregisterFns = SALES_INSIGHT_PROVIDERS.map((provider) =>
    registerInsightProvider(provider),
  );
  return () => unregisterFns.forEach((unregister) => unregister());
}
