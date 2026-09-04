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
  return normaliseRows(data);
}

/** Every vendor_ledger row across every vendor, chronological. Used only to
 *  build the per-vendor summaries below — the Purchase Ledger index page has
 *  no need for row-level detail, that's what each vendor's own
 *  `/vendors/$vendorId/ledger` page is for. */
async function listAllVendorLedgerRows(): Promise<VendorLedgerRow[]> {
  const { data, error } = await supabase
    .from("vendor_ledger" as never)
    .select("*")
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return normaliseRows(data);
}

function normaliseRows(data: unknown): VendorLedgerRow[] {
  return ((data ?? []) as unknown as VendorLedgerRow[]).map((r) => ({
    ...r,
    debit: Number(r.debit),
    credit: Number(r.credit),
    running_balance: Number(r.running_balance),
    metadata: r.metadata ?? {},
  }));
}

export interface VendorLedgerVendorSummary extends VendorLedgerSummary {
  vendorId: string;
}

/** One summary per vendor that has at least one ledger entry, keyed by
 *  vendor_id — feeds the Purchase Ledger index page (§3 of the Purchase
 *  module plan, engineering/purchase-module-and-sidebar-restructure-
 *  plan-2026-09-04.md). A vendor with zero entries simply won't have a key
 *  here; the index page treats that the same as a zero balance. */
export async function listVendorLedgerSummaries(): Promise<Map<string, VendorLedgerVendorSummary>> {
  const rows = await listAllVendorLedgerRows();
  const byVendor = new Map<string, VendorLedgerRow[]>();
  for (const r of rows) {
    if (!r.vendor_id) continue;
    const list = byVendor.get(r.vendor_id);
    if (list) list.push(r);
    else byVendor.set(r.vendor_id, [r]);
  }
  const summaries = new Map<string, VendorLedgerVendorSummary>();
  for (const [vendorId, vendorRows] of byVendor) {
    summaries.set(vendorId, { vendorId, ...summariseLedger(vendorRows) });
  }
  return summaries;
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
  purchase_order: "Purchase Order",
  vendor_quote: "Vendor Quote",
  grn: "Material Received",
  vendor_payment: "Payment",
  vendor_debit_note: "Debit Note",
  vendor_credit_note: "Credit Note",
  opening_balance: "Opening Balance",
  adjustment: "Adjustment",
};

export function sourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}
