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
};

export async function getExecutionPolicy(intent: VieIntent): Promise<VieExecutionPolicy> {
  try {
    const configured = await getAppSetting<Partial<Record<VieIntent, VieExecutionPolicy>>>(
      "vie.execution_policies",
    );
    return configured?.[intent] ?? DEFAULT_POLICIES[intent];
  } catch {
    // getAppSetting reads via the raw anon Supabase singleton, not the
    // request-scoped authenticated client (see server-context.ts) — if RLS
    // denies that read from within a server function, fall back to the safe
    // defaults above rather than failing the whole planning step.
    return DEFAULT_POLICIES[intent];
  }
}
