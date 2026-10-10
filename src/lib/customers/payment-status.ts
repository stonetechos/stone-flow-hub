/**
 * Customer Financial & Payment Status Tracking.
 *
 * Tracks customer payment status (Full Payment Received, Part Payment Received,
 * Payment Received, Payment Pending) across directory listings, order pipeline,
 * and financial summaries.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { CustomerLedgerOverviewItem } from "@/lib/customer-ledger/api";
import { normalizeCustomerRow } from "./normalize";
import type { CustomerRow } from "./api";

export type CustomerPaymentStatus =
  | "payment_pending"
  | "part_payment_received"
  | "full_payment_received"
  | "payment_received";

export interface CustomerPaymentStatusConfig {
  value: CustomerPaymentStatus;
  label: string;
  shortLabel: string;
  tone: string;
  badgeTone: string;
  dotColor: string;
  description: string;
}

export const CUSTOMER_PAYMENT_STATUS_CONFIG: Record<
  CustomerPaymentStatus,
  CustomerPaymentStatusConfig
> = {
  full_payment_received: {
    value: "full_payment_received",
    label: "Full Payment Received",
    shortLabel: "Fully Paid",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badgeTone: "bg-emerald-100/90 text-emerald-900 border-emerald-300 font-semibold",
    dotColor: "bg-emerald-500",
    description: "100% payment received; balance cleared.",
  },
  part_payment_received: {
    value: "part_payment_received",
    label: "Part Payment Received",
    shortLabel: "Part Paid",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    badgeTone: "bg-amber-100/90 text-amber-900 border-amber-300 font-semibold",
    dotColor: "bg-amber-500",
    description: "Partial or token payment received; balance remaining.",
  },
  payment_received: {
    value: "payment_received",
    label: "Payment Received",
    shortLabel: "Payment Rcvd",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    badgeTone: "bg-sky-100/90 text-sky-900 border-sky-300 font-semibold",
    dotColor: "bg-sky-500",
    description: "Advance or unallocated payment received on account.",
  },
  payment_pending: {
    value: "payment_pending",
    label: "Payment Pending",
    shortLabel: "Pending",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    badgeTone: "bg-rose-100/90 text-rose-900 border-rose-300 font-semibold",
    dotColor: "bg-rose-500",
    description: "No payment received yet; awaiting remittance.",
  },
};

/**
 * Determines a customer's payment status, checking manual assignment in workflow_state / external_ref
 * first, and falling back to live ledger transactions when available.
 */
export function getCustomerPaymentStatus(
  customer:
    | {
        workflow_state?: unknown;
        external_ref?: unknown;
      }
    | null
    | undefined,
  ledgerSummary?: CustomerLedgerOverviewItem | null,
): CustomerPaymentStatus {
  if (!customer) return "payment_pending";

  const wf = (customer.workflow_state as Record<string, unknown> | null) ?? {};
  const ext = (customer.external_ref as Record<string, unknown> | null) ?? {};

  const explicitStatus = (wf.payment_status || ext.payment_status) as
    | CustomerPaymentStatus
    | undefined;

  if (explicitStatus && CUSTOMER_PAYMENT_STATUS_CONFIG[explicitStatus]) {
    return explicitStatus;
  }

  // Derive from ledger transactions if available
  if (ledgerSummary) {
    const { totalDebit, totalCredit, balance } = ledgerSummary;
    if (totalDebit > 0 && balance <= 0 && totalCredit > 0) {
      return "full_payment_received";
    }
    if (totalCredit > 0 && balance > 0) {
      return "part_payment_received";
    }
    if (totalCredit > 0 && totalDebit === 0) {
      return "payment_received";
    }
    if (totalDebit > 0 && totalCredit === 0) {
      return "payment_pending";
    }
  }

  return "payment_pending";
}

export interface UpdateCustomerPaymentStatusOptions {
  customerId: string;
  payment_status: CustomerPaymentStatus;
  notes?: string;
}

export async function updateCustomerPaymentStatus(
  input: UpdateCustomerPaymentStatusOptions,
): Promise<CustomerRow> {
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("customers")
    .select("id, workflow_state, external_ref, notes")
    .eq("id", input.customerId)
    .single();

  if (fetchErr || !existing) {
    throw new AppError(fetchErr ? mapDbError(fetchErr) : "Customer not found");
  }

  const wf = (existing.workflow_state as Record<string, unknown> | null) ?? {};
  const ext = (existing.external_ref as Record<string, unknown> | null) ?? {};

  const updatedWf = {
    ...wf,
    payment_status: input.payment_status,
    payment_status_updated_at: new Date().toISOString(),
  };

  const updatedExt = {
    ...ext,
    payment_status: input.payment_status,
  };

  let updatedNotes = existing.notes;
  if (input.notes && input.notes.trim()) {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const log = `\n[Payment Status · ${timestamp}] Marked as ${CUSTOMER_PAYMENT_STATUS_CONFIG[input.payment_status].label}: ${input.notes.trim()}`;
    updatedNotes = existing.notes ? `${existing.notes.trim()}${log}` : log.trim();
  }

  const { data: updated, error: updateErr } = await db
    .from("customers")
    .update({
      workflow_state: updatedWf as never,
      external_ref: updatedExt as never,
      notes: updatedNotes,
    })
    .eq("id", input.customerId)
    .select("*")
    .single();

  if (updateErr) throw new AppError(mapDbError(updateErr));
  return normalizeCustomerRow(updated);
}
