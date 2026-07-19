/**
 * Planner resolver — customer name -> existing customer_id.
 *
 * Read-only (calls the SAME listCustomers() the manual EntityPicker uses).
 * Never creates a customer: enquiryCreateSchema's inline-create fallback
 * requires a mobile number, which an AI-transcribed utterance never has, so
 * "no match" and "ambiguous match" are both blockers rather than an
 * auto-create — see ADR-0001 §8.
 */
import { listCustomers } from "@/lib/customers/api";

export interface CustomerResolution {
  customerId: string | null;
  customerLabel: string | null;
  blocker: string | null;
}

export async function resolveCustomer(name: string | undefined): Promise<CustomerResolution> {
  if (!name || !name.trim()) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: "No customer name was extracted from the utterance.",
    };
  }

  const matches = await listCustomers(name.trim());

  if (matches.length === 0) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: `No existing customer matches "${name}".`,
    };
  }

  if (matches.length > 1) {
    const labels = matches
      .slice(0, 5)
      .map((m) => `${m.name} (${m.customer_code})`)
      .join(", ");
    return {
      customerId: null,
      customerLabel: null,
      blocker: `"${name}" matches ${matches.length} customers: ${labels}${
        matches.length > 5 ? ", ..." : ""
      }.`,
    };
  }

  return { customerId: matches[0].id, customerLabel: matches[0].name, blocker: null };
}
