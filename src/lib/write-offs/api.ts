/**
 * Customer Write-Offs & Credit Notes API.
 *
 * Implements write-off / concession management when a customer pays less
 * due to quality issues, late delivery, damage, commercial settlement, or bad debt.
 *
 * Backed natively by `public.credit_notes` and incorporated directly into
 * `customer_ledger` as a credit entry, reducing customer balance due.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type WriteOffReason =
  | "quality_issue"
  | "late_delivery"
  | "transit_damage"
  | "rate_dispute"
  | "round_off"
  | "bad_debt"
  | "other";

export const WRITE_OFF_REASONS: Record<
  WriteOffReason,
  { label: string; description: string; badgeClass: string; icon: string }
> = {
  quality_issue: {
    label: "Quality / Shade Issue",
    description: "Slab defect, shade mismatch, polish/finish complaint",
    badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
    icon: "🔴",
  },
  late_delivery: {
    label: "Late Delivery Concession",
    description: "Discount agreed due to delivery schedule delay",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    icon: "🟠",
  },
  transit_damage: {
    label: "Transit Damage",
    description: "Breakage, chipping, or handling crack during carting",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
    icon: "📦",
  },
  rate_dispute: {
    label: "Commercial Settlement",
    description: "Negotiated price dispute, rate adjustment or final lump-sum closure",
    badgeClass:
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
    icon: "⚖️",
  },
  round_off: {
    label: "Round-Off Difference",
    description: "Negligible odd-amount fraction waived for clean account closure",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: "🪙",
  },
  bad_debt: {
    label: "Bad Debt Write-Off",
    description: "Unrecoverable customer balance written off after recovery attempts",
    badgeClass:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    icon: "⚠️",
  },
  other: {
    label: "Other Adjustment",
    description: "Special concession or commercial write-off",
    badgeClass:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200",
    icon: "📝",
  },
};

export interface CreateWriteOffInput {
  customer_id: string;
  invoice_id?: string | null;
  amount: number;
  reason: WriteOffReason;
  remarks?: string | null;
  issued_at?: string;
}

export interface WriteOffRow {
  id: string;
  cn_no: string;
  customer_id: string;
  customer_name?: string;
  customer_code?: string;
  invoice_id: string | null;
  invoice_no?: string | null;
  amount: number;
  reason: WriteOffReason | string | null;
  remarks: string | null;
  status: string;
  issued_at: string;
  created_at: string;
  created_by: string | null;
}

export interface WriteOffSummary {
  totalAmount: number;
  thisMonthAmount: number;
  todayAmount: number;
  count: number;
  byReason: Record<string, { count: number; amount: number; label: string }>;
}

/**
 * Creates a Write-Off / Credit Note for a customer.
 * Instantly posted to `credit_notes` and appears in `customer_ledger` as a credit.
 */
export async function createWriteOff(input: CreateWriteOffInput): Promise<WriteOffRow> {
  const amt = Number(input.amount);
  if (!amt || amt <= 0 || Number.isNaN(amt)) {
    throw new AppError("Write-off amount must be greater than zero.");
  }

  const issuedDate = input.issued_at || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("credit_notes")
    .insert({
      customer_id: input.customer_id,
      invoice_id: input.invoice_id || null,
      amount: amt,
      reason: input.reason,
      remarks: input.remarks || null,
      issued_at: issuedDate,
      status: "active",
    })
    .select(
      `
      id,
      cn_no,
      customer_id,
      invoice_id,
      amount,
      reason,
      remarks,
      status,
      issued_at,
      created_at,
      created_by,
      customer:customers(id, name, customer_code),
      invoice:invoices(id, invoice_no)
    `,
    )
    .single();

  if (error) throw new AppError(mapDbError(error));

  const row = data as unknown as {
    id: string;
    cn_no: string;
    customer_id: string;
    invoice_id: string | null;
    amount: number;
    reason: string | null;
    remarks: string | null;
    status: string;
    issued_at: string;
    created_at: string;
    created_by: string | null;
    customer?: { id: string; name: string; customer_code: string } | null;
    invoice?: { id: string; invoice_no: string } | null;
  };

  return {
    ...row,
    customer_name: row.customer?.name,
    customer_code: row.customer?.customer_code,
    invoice_no: row.invoice?.invoice_no,
  };
}

/**
 * Lists all Write-Offs / Credit Notes.
 */
export async function listWriteOffs(filters?: {
  customerId?: string;
  invoiceId?: string;
  limit?: number;
}): Promise<WriteOffRow[]> {
  let query = supabase
    .from("credit_notes")
    .select(
      `
      id,
      cn_no,
      customer_id,
      invoice_id,
      amount,
      reason,
      remarks,
      status,
      issued_at,
      created_at,
      created_by,
      customer:customers(id, name, customer_code),
      invoice:invoices(id, invoice_no)
    `,
    )
    .neq("status", "cancelled")
    .order("issued_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }
  if (filters?.invoiceId) {
    query = query.eq("invoice_id", filters.invoiceId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new AppError(mapDbError(error));

  return (data ?? []).map((d) => {
    const row = d as unknown as {
      id: string;
      cn_no: string;
      customer_id: string;
      invoice_id: string | null;
      amount: number;
      reason: string | null;
      remarks: string | null;
      status: string;
      issued_at: string;
      created_at: string;
      created_by: string | null;
      customer?: { id: string; name: string; customer_code: string } | null;
      invoice?: { id: string; invoice_no: string } | null;
    };
    return {
      ...row,
      customer_name: row.customer?.name,
      customer_code: row.customer?.customer_code,
      invoice_no: row.invoice?.invoice_no,
    };
  });
}

/**
 * Fetches write-off summary metrics for the Superadmin Dashboard.
 */
export async function getWriteOffSummary(): Promise<WriteOffSummary> {
  const rows = await listWriteOffs();

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

  let totalAmount = 0;
  let thisMonthAmount = 0;
  let todayAmount = 0;
  const byReason: Record<string, { count: number; amount: number; label: string }> = {};

  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    totalAmount += amt;

    const dateStr = (r.issued_at || r.created_at || "").slice(0, 10);
    if (dateStr === todayStr) {
      todayAmount += amt;
    }
    if (dateStr.startsWith(currentMonthStr)) {
      thisMonthAmount += amt;
    }

    const reasonKey = (r.reason as WriteOffReason) || "other";
    const meta = WRITE_OFF_REASONS[reasonKey as WriteOffReason] || WRITE_OFF_REASONS.other;
    if (!byReason[reasonKey]) {
      byReason[reasonKey] = { count: 0, amount: 0, label: meta.label };
    }
    byReason[reasonKey].count += 1;
    byReason[reasonKey].amount += amt;
  }

  return {
    totalAmount,
    thisMonthAmount,
    todayAmount,
    count: rows.length,
    byReason,
  };
}

/**
 * Cancels / deletes a write-off if entered erroneously.
 */
export async function cancelWriteOff(id: string): Promise<void> {
  const { error } = await supabase
    .from("credit_notes")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
