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
import { getCustomerResponseStatus } from "./crm-status";
import { normalizeCustomerRow } from "./normalize";
import type { CustomerRow } from "./api";

export type CustomerPaymentStatus =
  | "no_dues"
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
  no_dues: {
    value: "no_dues",
    label: "No Dues / Clean",
    shortLabel: "No Dues",
    tone: "bg-slate-50 text-slate-700 border-slate-200",
    badgeTone: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
    dotColor: "bg-slate-400",
    description: "No pending payment on account; zero dues.",
  },
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
    description: "Pending payment on account; awaiting remittance.",
  },
};

/**
 * Extracts numeric serial number from customer code (e.g. "CUS-000035" -> 35, "CUS-000024" -> 24).
 */
export function extractCustomerSerialNumber(code?: string | null): number | null {
  if (!code) return null;
  const match = code.trim().match(/(\d+)(?!.*\d)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

export interface CustomerRankingContext {
  orderInfo?: {
    activeOrderCount?: number;
    completedOrderCount?: number;
    hasCompletedOrder?: boolean;
    health?: string | null;
  } | null;
  ledgerSummary?: CustomerLedgerOverviewItem | null;
}

/**
 * Customer Directory Ranking:
 * Tier 1: "the order is pending" / CRM Response Status = "order_placed" or active order in pipeline (occupies the very top of the list)
 * Tier 2: Customers who "still need to pay" ("order is completed" AND "payment status is pending / part payment", or outstanding balance)
 * Tier 3: Customers entered recently (active leads, walk-ins, discussions, quotes in progress)
 * Tier 10: Customers whose order is completed AND amount is fully paid (put back to the list at a place according to customer number)
 * Tier 99: CRM Response Status = "do_not_contact" ("Closed · Not Interested") pushed to the very bottom / last of the list
 */
export function getCustomerDirectoryRank(
  customer:
    | {
        workflow_state?: unknown;
        external_ref?: unknown;
        is_active?: boolean;
      }
    | null
    | undefined,
  context?: CustomerRankingContext | null,
): number {
  if (!customer) return 3;

  const crmStatus = getCustomerResponseStatus(customer);
  const isCancelled =
    crmStatus === "order_cancelled_delay" || crmStatus === "order_cancelled_change_of_plans";

  // Tier 1: "the order is pending" (order placed status or active order count, unless cancelled)
  const hasActiveOrder =
    !isCancelled &&
    (crmStatus === "order_placed" ||
      crmStatus === "installation_team_working" ||
      crmStatus === "artwork_team_working" ||
      (context?.orderInfo?.activeOrderCount ?? 0) > 0);
  if (hasActiveOrder) return 1;

  // Determine order completion and payment status
  const isOrderCompleted =
    crmStatus === "order_completed" ||
    context?.orderInfo?.health === "completed" ||
    context?.orderInfo?.hasCompletedOrder === true;

  const payStatus = getCustomerPaymentStatus(customer, context?.ledgerSummary);
  const isPaymentPending =
    payStatus === "payment_pending" ||
    payStatus === "part_payment_received" ||
    (context?.ledgerSummary ? context.ledgerSummary.balance > 0 : false);

  // Tier 2: Customers who still need to pay
  if (isPaymentPending) {
    return 2;
  }

  // Push "Closed · Not Interested" and cleanly cancelled orders (with zero pending payments) to the very end of the directory
  if (crmStatus === "do_not_contact" || isCancelled) {
    return 99;
  }

  // Tier 10: The customers whose order is completed AND the amount is fully paid.
  // Put them back to the list at a place according to the customer's number (separate from pending orders and pending payments).
  const isFullyPaid =
    payStatus === "full_payment_received" ||
    (!isPaymentPending && (payStatus === "no_dues" || payStatus === "payment_received")) ||
    (context?.ledgerSummary
      ? context.ledgerSummary.balance <= 0 && context.ledgerSummary.totalDebit > 0
      : false);

  if (isOrderCompleted && isFullyPaid) {
    return 10;
  }

  // Tier 3: Active leads, walk-ins, discussions, quotes in progress
  return 3;
}

export function compareCustomersForDirectory(
  a: CustomerRow,
  b: CustomerRow,
  contextMap?: {
    getOrderInfo?: (customerId: string) => CustomerRankingContext["orderInfo"];
    getLedgerSummary?: (customerId: string) => CustomerRankingContext["ledgerSummary"];
  },
): number {
  const rankA = getCustomerDirectoryRank(a, {
    orderInfo: contextMap?.getOrderInfo?.(a.id),
    ledgerSummary: contextMap?.getLedgerSummary?.(a.id),
  });
  const rankB = getCustomerDirectoryRank(b, {
    orderInfo: contextMap?.getOrderInfo?.(b.id),
    ledgerSummary: contextMap?.getLedgerSummary?.(b.id),
  });

  if (rankA !== rankB) return rankA - rankB;

  // Within each tier: sort by allotted serial number descending (OG numbers: 41, 40, 39...)
  const serialA = extractCustomerSerialNumber(a.customer_code);
  const serialB = extractCustomerSerialNumber(b.customer_code);

  if (serialA !== null && serialB !== null && serialA !== serialB) {
    return serialB - serialA;
  }
  if (serialA !== null && serialB === null) return -1;
  if (serialA === null && serialB !== null) return 1;

  // Fallback: newest creation time, then customer code
  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (timeB !== timeA) return timeB - timeA;
  return (b.customer_code ?? "").localeCompare(a.customer_code ?? "");
}

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
  if (!customer) return "no_dues";

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
    if (totalDebit === 0 && totalCredit === 0) {
      return "no_dues";
    }
  }

  return "no_dues";
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
