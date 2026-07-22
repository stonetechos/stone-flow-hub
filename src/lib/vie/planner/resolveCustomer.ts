/**
 * Planner resolver — customer name -> existing customer_id.
 *
 * Read-only (calls the SAME listCustomers() the manual EntityPicker uses).
 * Never creates a customer: enquiryCreateSchema's inline-create fallback
 * requires a mobile number, which an AI-transcribed utterance never has, so
 * "no match" and "ambiguous match" are both blockers rather than an
 * auto-create — see ADR-0001 §8.
 *
 * Sprint AI-1.5: `blocker` is now a structured `PlannerBlocker` (see
 * types.ts) instead of a plain string — built right here, where the real
 * candidate list already exists, rather than reconstructed later from
 * formatted text.
 *
 * Sprint AI-1.6: the search / zero-one-many classification / blocker
 * assembly this file used to implement inline now lives once in
 * entityResolution.ts (the generic Entity Resolution Framework) — this file
 * is a thin adapter that only specifies what's actually customer-specific:
 * the search function, the candidate label/subtitle, and the blocker
 * message text. Behavior (including the exact byte-for-byte PlannerBlocker
 * shape) is unchanged — resolveCustomer.test.ts is unmodified by this
 * sprint and still passes against this file.
 */
import { listCustomers } from "@/lib/customers/api";
import type { PlannerBlocker } from "../types";
import { requiredInputBlocker, resolveEntityByQuery } from "./entityResolution";

export interface CustomerResolution {
  customerId: string | null;
  customerLabel: string | null;
  blocker: PlannerBlocker | null;
}

export async function resolveCustomer(name: string | undefined): Promise<CustomerResolution> {
  if (!name || !name.trim()) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: requiredInputBlocker({
        id: "customer_id",
        field: "customer_name",
        message: "No customer name was extracted from the utterance.",
      }),
    };
  }

  // `query` here is deliberately the RAW (untrimmed) `name` — matches the
  // pre-Sprint-AI-1.6 behavior of interpolating the raw name into the
  // blocker's message/currentValue while only ever trimming it for the
  // actual listCustomers() call itself. The framework doesn't trim on a
  // caller's behalf, so that split is expressed here via the `search`
  // wrapper below rather than in entityResolution.ts.
  const { record, blocker } = await resolveEntityByQuery(name, {
    id: "customer_id",
    type: "customer_selection",
    search: (query) => listCustomers(query.trim()),
    toCandidate: (m) => ({ id: m.id, label: m.name, subtitle: m.customer_code }),
    noMatchMessage: (q) => `No existing customer matches "${q}".`,
    multipleMatchesMessage: (q, count) => `"${q}" matches ${count} customers — choose one.`,
  });

  if (!record) return { customerId: null, customerLabel: null, blocker };
  return { customerId: record.id, customerLabel: record.name, blocker: null };
}
