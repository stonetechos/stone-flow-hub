/**
 * Vendor Ledger reader.
 *
 * Reads the `vendor_ledger` view (running balance computed server-side over
 * `vendor_ledger_entries`). This is the single source of truth for the
 * vendor's financial history — later adapters (GRN, vendor payments, DN/CN)
 * simply INSERT into `vendor_ledger_entries` and their rows appear here
 * with correct running balance automatically.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface VendorLedgerRow {
  id: string;
  vendor_id: string;
  entry_date: string;
  source_type: string;
  source_id: string | null;
  ref_no: string | null;
  description: string | null;
  debit: number;
  credit: number;
  currency_code: string;
  status: string | null;
  route: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  running_balance: number;
}

export interface VendorLedgerSummary {
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  entryCount: number;
  lastEntryAt: string | null;
}

export async function listVendorLedger(vendorId: string): Promise<VendorLedgerRow[]> {
  const { data, error } = await supabase
    .from("vendor_ledger" as never)
    .select("*")
    .eq("vendor_id" as never, vendorId as never)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return ((data ?? []) as unknown as VendorLedgerRow[]).map((r) => ({
    ...r,
    debit: Number(r.debit),
    credit: Number(r.credit),
    running_balance: Number(r.running_balance),
    metadata: r.metadata ?? {},
  }));
}

export function summariseLedger(rows: VendorLedgerRow[]): VendorLedgerSummary {
  let totalDebit = 0;
  let totalCredit = 0;
  let lastEntryAt: string | null = null;
  for (const r of rows) {
    totalDebit += r.debit;
    totalCredit += r.credit;
    if (!lastEntryAt || r.entry_date > lastEntryAt) lastEntryAt = r.entry_date;
  }
  return {
    totalDebit,
    totalCredit,
    outstanding: totalDebit - totalCredit,
    entryCount: rows.length,
    lastEntryAt,
  };
}

/** Deep-link for a ledger row when the source document has a UI surface. */
export function routeForLedgerRow(row: VendorLedgerRow): string | null {
  if (row.route) return row.route;
  if (row.source_type === "purchase_order" && row.source_id) return "/purchase-orders";
  if (row.source_type === "vendor_quote" && row.source_id) return "/rfqs";
  return null;
}

const SOURCE_LABELS: Record<string, string> = {
  purchase_order:    "Purchase Order",
  vendor_quote:      "Vendor Quote",
  grn:               "Material Received",
  vendor_payment:    "Payment",
  vendor_debit_note: "Debit Note",
  vendor_credit_note:"Credit Note",
  opening_balance:   "Opening Balance",
  adjustment:        "Adjustment",
};

export function sourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}
