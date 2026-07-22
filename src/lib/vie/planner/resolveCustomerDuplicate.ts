/**
 * Planner resolver — checks whether an extracted mobile number already
 * belongs to an existing customer, before create_customer is allowed to
 * proceed past a blocker.
 *
 * Read-only (calls the SAME findCustomerByPhone() that createCustomer()
 * itself uses as its own second line of defense) — this resolver is only
 * the FIRST line, letting the Planner report the conflict as a blocker
 * before ever attempting a write. Never merges, never auto-links — a match
 * is always a blocker naming the existing customer, so a human decides.
 * See VIE-CreateCustomer-UX-Contract.md §9.
 *
 * Unlike resolveCustomer.ts (name -> existing customer_id, used by
 * log_enquiry/note_followup to LOOK UP a record), this resolver never
 * returns an id to link against — create_customer always prepares a new
 * record; a match here is purely a safety check, not a lookup result.
 *
 * Sprint AI-1.5: a match is reported as a `confirmation_required` blocker
 * (not a `*_selection` — there's nothing to pick between, just one existing
 * record the employee needs to see before deciding whether to proceed) with
 * that record as its sole candidate, for reference/linking, not a picker.
 */
import { findCustomerByPhone } from "@/lib/customers/api";
import type { PlannerBlocker } from "../types";

export interface CustomerDuplicateResolution {
  blocker: PlannerBlocker | null;
}

export async function resolveCustomerDuplicate(
  mobile: string | undefined,
): Promise<CustomerDuplicateResolution> {
  if (!mobile || !mobile.trim()) {
    // No mobile extracted at all is reported as its own, separate blocker
    // by the caller (planner/index.ts's planCreateCustomer) — nothing to
    // check here since there's no number to look up.
    return { blocker: null };
  }

  const existing = await findCustomerByPhone(mobile);
  if (!existing) return { blocker: null };

  return {
    blocker: {
      id: "mobile",
      type: "confirmation_required",
      message: `A customer with this phone number already exists: ${existing.name} (${existing.customer_code}).`,
      field: "mobile",
      required: true,
      currentValue: mobile,
      candidates: [{ id: existing.id, label: `${existing.name} (${existing.customer_code})` }],
    },
  };
}
