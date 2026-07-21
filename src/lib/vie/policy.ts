/**
 * Execution policy lookup (ADR-0001 §6). Reuses the existing app_settings
 * key/value store rather than a new table — the same "reuse existing infra"
 * discipline as reusing gateway.server.ts for the LLM call.
 *
 * Thresholds are DATA, not code: an admin can flip an intent between modes
 * or retune a threshold by editing the "vie.execution_policies" app_settings
 * row, with no deploy. The constants below are fallback defaults only, used
 * when that row doesn't exist yet (e.g. immediately after Phase 1 ships,
 * before anyone has touched Settings) — see "Known limitations" in the
 * Phase 1 completion report for a caveat about how this setting is read.
 */
import { getAppSetting } from "@/lib/app-settings/api";
import type { VieExecutionPolicy, VieIntent } from "./types";

const DEFAULT_POLICIES: Record<VieIntent, VieExecutionPolicy> = {
  // Matches the example table you approved: follow-up notes are low-risk
  // (cheap to correct if slightly off), enquiries touch customer records
  // and an implied budget figure, so they get a one-tap check first.
  note_followup: { mode: "auto", autoThreshold: 0.85 },
  log_enquiry: { mode: "confirm", autoThreshold: 0.85 },
  // A wrongly-created customer record is costlier to unwind than a
  // slightly-off enquiry note or follow-up (enquiries/quotes/invoices can
  // end up linked to it) — seeded at "confirm", a ceiling never upgraded by
  // confidence, until the create_customer/log_enquiry classification
  // boundary (VIE-CreateCustomer-UX-Contract.md §7/§8/§12) has been
  // observed in production. Retune via app_settings, same as any intent —
  // no deploy needed to later allow "auto".
  create_customer: { mode: "confirm", autoThreshold: 0.9 },
  // A wrongly-created quotation is a customer-facing commercial document —
  // at least as costly to unwind as a wrongly-created customer record,
  // arguably more. Seeded confirm-only, at least as conservative as
  // create_customer's own 0.9, per
  // VIE-CreateQuotation-UX-Contract.md §5 and
  // VIE-CreateQuotation-Architecture-Review.md §9's explicit recommendation.
  // Not intended to reach "auto" in Phase 3 at all (see the UX Contract's
  // own "not recommended... under any confidence threshold" guidance) —
  // this default is a ceiling only, same mechanism as every other intent.
  create_quotation: { mode: "confirm", autoThreshold: 0.9 },
};

export async function getExecutionPolicy(intent: VieIntent): Promise<VieExecutionPolicy> {
  try {
    const configured =
      await getAppSetting<Partial<Record<VieIntent, VieExecutionPolicy>>>("vie.execution_policies");
    return configured?.[intent] ?? DEFAULT_POLICIES[intent];
  } catch {
    // getAppSetting reads via the raw anon Supabase singleton, not the
    // request-scoped authenticated client (see server-context.ts) — if RLS
    // denies that read from within a server function, fall back to the safe
    // defaults above rather than failing the whole planning step.
    return DEFAULT_POLICIES[intent];
  }
}
