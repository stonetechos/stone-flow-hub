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
 */
import { findCustomerByPhone } from "@/lib/customers/api";

export interface CustomerDuplicateResolution {
  blocker: string | null;
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
    blocker: `A customer with this phone number already exists: ${existing.name} (${existing.customer_code}).`,
  };
}
