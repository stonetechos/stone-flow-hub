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
 */
import { listCustomers } from "@/lib/customers/api";
import type { PlannerBlocker } from "../types";

export interface CustomerResolution {
  customerId: string | null;
  customerLabel: string | null;
  blocker: PlannerBlocker | null;
}

/** Selection blockers hand the UI every match rather than the old string
 *  blocker's first-5-then-ellipsis (a prose-readability limit that doesn't
 *  apply to a rendered list) — capped generously so one pathological search
 *  term can't hand the UI an unbounded list. */
const MAX_CANDIDATES = 20;

export async function resolveCustomer(name: string | undefined): Promise<CustomerResolution> {
  if (!name || !name.trim()) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: {
        id: "customer_id",
        type: "text_required",
        message: "No customer name was extracted from the utterance.",
        field: "customer_name",
        required: true,
      },
    };
  }

  const matches = await listCustomers(name.trim());

  if (matches.length === 0) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: {
        id: "customer_id",
        type: "customer_selection",
        message: `No existing customer matches "${name}".`,
        field: "customer_id",
        required: true,
        currentValue: name,
        candidates: [],
      },
    };
  }

  if (matches.length > 1) {
    return {
      customerId: null,
      customerLabel: null,
      blocker: {
        id: "customer_id",
        type: "customer_selection",
        message: `"${name}" matches ${matches.length} customers — choose one.`,
        field: "customer_id",
        required: true,
        currentValue: name,
        candidates: matches.slice(0, MAX_CANDIDATES).map((m) => ({
          id: m.id,
          label: m.name,
          subtitle: m.customer_code,
        })),
      },
    };
  }

  return {
    customerId: matches[0].id,
    customerLabel: matches[0].name,
    blocker: null,
  };
}
