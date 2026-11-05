/**
 * Vendor Ledger reader & statement engine.
 *
 * Provides a unified financial ledger for each supplying partner across:
 * 1. `vendor_ledger_entries` (material receipts / GRN, debit notes, credit notes, manual entries)
 * 2. `purchase_invoices` (bills received from the supplier)
 * 3. `vendor_payments` (payments made to the supplier)
 *
 * Computes chronological running balance and summary statistics so every supplier's
 * financial standing, bill history, and payment trail is 100% visible and shareable.
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

export interface VendorLedgerVendorSummary extends VendorLedgerSummary {
  vendorId: string;
}

interface RawPurchaseInvoice {
  id: string;
  vendor_id: string;
  invoice_no: string;
  vendor_invoice_no: string | null;
  invoice_date: string;
  total_amount: number;
  notes: string | null;
  status: string;
  created_at: string;
}

interface RawVendorPayment {
  id: string;
  vendor_id: string;
  payment_no: string;
  paid_at: string;
  amount: number;
  method: string | null;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateVendorLedgerEntryInput {
  vendor_id: string;
  entry_date: string;
  source_type:
    | "opening_balance"
    | "purchase_invoice"
    | "vendor_payment"
    | "vendor_debit_note"
    | "vendor_credit_note"
    | "adjustment"
    | string;
  ref_no?: string;
  description?: string;
  debit?: number;
  credit?: number;
  notes?: string;
}

/**
 * Creates a manual ledger entry (e.g. Opening Balance, adjustment, bill, or payment record).
 */
export async function createVendorLedgerEntry(
  input: CreateVendorLedgerEntryInput,
): Promise<VendorLedgerRow> {
  const debit = Math.max(0, Number(input.debit) || 0);
  const credit = Math.max(0, Number(input.credit) || 0);

  const payload = {
    vendor_id: input.vendor_id,
    entry_date: input.entry_date || new Date().toISOString().slice(0, 10),
    source_type: input.source_type,
    source_id: null,
    ref_no: input.ref_no?.trim() || null,
    description: input.description?.trim() || input.notes?.trim() || "Manual Ledger Entry",
    debit,
    credit,
    currency_code: "INR",
    status: "posted",
    route: null,
    metadata: input.notes ? { notes: input.notes } : {},
  };

  const { data, error } = await supabase
    .from("vendor_ledger_entries")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));
  return normaliseRow(data);
}

/**
 * Lists the complete unified chronological ledger for a specific supplier.
 * Synthesizes stored entries, purchase invoices, and vendor payments.
 */
export async function listVendorLedger(vendorId: string): Promise<VendorLedgerRow[]> {
  const [entriesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("vendor_ledger_entries")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("entry_date", { ascending: true }),
    supabase
      .from("purchase_invoices" as never)
      .select(
        "id, vendor_id, invoice_no, vendor_invoice_no, invoice_date, total_amount, notes, status, created_at",
      )
      .eq("vendor_id" as never, vendorId as never)
      .neq("status" as never, "cancelled" as never),
    supabase
      .from("vendor_payments" as never)
      .select("id, vendor_id, payment_no, paid_at, amount, method, reference_no, notes, created_at")
      .eq("vendor_id" as never, vendorId as never),
  ]);

  if (entriesRes.error) {
    console.warn("[vendor-ledger] entries error:", entriesRes.error);
  }

  const rawEntries: VendorLedgerRow[] = normaliseRows(entriesRes.data ?? []);
  const existingSourceKeys = new Set<string>();

  for (const entry of rawEntries) {
    if (entry.source_type && entry.source_id) {
      existingSourceKeys.add(`${entry.source_type}:${entry.source_id}`);
    }
  }

  // Synthesize purchase invoices (Bills from supplier = Debits to payables)
  const syntheticRows: VendorLedgerRow[] = [];
  if (invoicesRes.data && Array.isArray(invoicesRes.data)) {
    for (const inv of invoicesRes.data as unknown as RawPurchaseInvoice[]) {
      const key = `purchase_invoice:${inv.id}`;
      if (existingSourceKeys.has(key)) continue;

      syntheticRows.push({
        id: `synth-inv-${inv.id}`,
        vendor_id: inv.vendor_id,
        entry_date:
          inv.invoice_date || inv.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        source_type: "purchase_invoice",
        source_id: inv.id,
        ref_no: inv.vendor_invoice_no || inv.invoice_no,
        description: inv.notes ? `Bill: ${inv.notes}` : `Purchase Invoice ${inv.invoice_no}`,
        debit: Number(inv.total_amount) || 0,
        credit: 0,
        currency_code: "INR",
        status: inv.status || "recorded",
        route: `/purchase-invoices/${inv.id}`,
        metadata: { invoice_no: inv.invoice_no },
        created_at: inv.created_at || new Date().toISOString(),
        running_balance: 0,
      });
    }
  }

  // Synthesize vendor payments (Payments to supplier = Credits against payables)
  if (paymentsRes.data && Array.isArray(paymentsRes.data)) {
    for (const p of paymentsRes.data as unknown as RawVendorPayment[]) {
      const key = `vendor_payment:${p.id}`;
      if (existingSourceKeys.has(key)) continue;

      const methodSuffix = p.method ? ` (${p.method.toUpperCase()})` : "";
      syntheticRows.push({
        id: `synth-pay-${p.id}`,
        vendor_id: p.vendor_id,
        entry_date:
          p.paid_at || p.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        source_type: "vendor_payment",
        source_id: p.id,
        ref_no: p.payment_no || p.reference_no || "PAY",
        description: p.notes
          ? `Payment: ${p.notes}`
          : `Supplier Payment ${p.payment_no}${methodSuffix}`,
        debit: 0,
        credit: Number(p.amount) || 0,
        currency_code: "INR",
        status: "posted",
        route: `/vendor-payments/${p.id}`,
        metadata: { payment_no: p.payment_no, method: p.method },
        created_at: p.created_at || new Date().toISOString(),
        running_balance: 0,
      });
    }
  }

  // Merge and sort chronologically: entry_date ASC, created_at ASC
  const allRows = [...rawEntries, ...syntheticRows].sort((a, b) => {
    if (a.entry_date !== b.entry_date) {
      return a.entry_date.localeCompare(b.entry_date);
    }
    return (a.created_at || "").localeCompare(b.created_at || "");
  });

  // Calculate sequential running balance
  let running = 0;
  for (const row of allRows) {
    running += row.debit - row.credit;
    row.running_balance = running;
  }

  return allRows;
}

/**
 * Computes summaries across all vendors in parallel.
 * Feeds the main Suppliers Ledger overview table (`/purchase-ledger`).
 */
export async function listVendorLedgerSummaries(): Promise<Map<string, VendorLedgerVendorSummary>> {
  const [entriesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from("vendor_ledger_entries").select("*").order("entry_date", { ascending: true }),
    supabase
      .from("purchase_invoices" as never)
      .select("id, vendor_id, total_amount, invoice_date, created_at, status")
      .neq("status" as never, "cancelled" as never),
    supabase.from("vendor_payments" as never).select("id, vendor_id, amount, paid_at, created_at"),
  ]);

  const byVendor = new Map<
    string,
    { debit: number; credit: number; lastEntryAt: string | null; count: number }
  >();

  const getOrCreate = (vid: string) => {
    let item = byVendor.get(vid);
    if (!item) {
      item = { debit: 0, credit: 0, lastEntryAt: null, count: 0 };
      byVendor.set(vid, item);
    }
    return item;
  };

  const existingSourceKeys = new Set<string>();

  // 1. Process stored entries
  const rawEntries = normaliseRows(entriesRes.data ?? []);
  for (const r of rawEntries) {
    if (!r.vendor_id) continue;
    if (r.source_type && r.source_id) {
      existingSourceKeys.add(`${r.source_type}:${r.source_id}`);
    }
    const acc = getOrCreate(r.vendor_id);
    acc.debit += r.debit;
    acc.credit += r.credit;
    acc.count += 1;
    if (!acc.lastEntryAt || r.entry_date > acc.lastEntryAt) {
      acc.lastEntryAt = r.entry_date;
    }
  }

  // 2. Process purchase invoices
  if (invoicesRes.data && Array.isArray(invoicesRes.data)) {
    for (const inv of invoicesRes.data as unknown as RawPurchaseInvoice[]) {
      if (!inv.vendor_id) continue;
      const key = `purchase_invoice:${inv.id}`;
      if (existingSourceKeys.has(key)) continue;

      const acc = getOrCreate(inv.vendor_id);
      const amount = Number(inv.total_amount) || 0;
      acc.debit += amount;
      acc.count += 1;
      const date = inv.invoice_date || inv.created_at?.slice(0, 10);
      if (date && (!acc.lastEntryAt || date > acc.lastEntryAt)) {
        acc.lastEntryAt = date;
      }
    }
  }

  // 3. Process vendor payments
  if (paymentsRes.data && Array.isArray(paymentsRes.data)) {
    for (const p of paymentsRes.data as unknown as RawVendorPayment[]) {
      if (!p.vendor_id) continue;
      const key = `vendor_payment:${p.id}`;
      if (existingSourceKeys.has(key)) continue;

      const acc = getOrCreate(p.vendor_id);
      const amount = Number(p.amount) || 0;
      acc.credit += amount;
      acc.count += 1;
      const date = p.paid_at || p.created_at?.slice(0, 10);
      if (date && (!acc.lastEntryAt || date > acc.lastEntryAt)) {
        acc.lastEntryAt = date;
      }
    }
  }

  const summaries = new Map<string, VendorLedgerVendorSummary>();
  for (const [vendorId, acc] of byVendor) {
    summaries.set(vendorId, {
      vendorId,
      totalDebit: acc.debit,
      totalCredit: acc.credit,
      outstanding: acc.debit - acc.credit,
      entryCount: acc.count,
      lastEntryAt: acc.lastEntryAt,
    });
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

function normaliseRow(r: unknown): VendorLedgerRow {
  const item = r as Record<string, unknown>;
  const rawRoute = item.route ? String(item.route).trim() : null;
  // Legacy DB triggers stored category keywords like "payment" or "grn" instead of actual URLs.
  // Only accept paths that begin with a valid leading slash.
  const cleanRoute =
    rawRoute &&
    rawRoute.startsWith("/") &&
    !rawRoute.includes("undefined") &&
    rawRoute !== "/payment" &&
    rawRoute !== "/grn"
      ? rawRoute
      : null;

  return {
    id: String(item.id ?? ""),
    vendor_id: String(item.vendor_id ?? ""),
    entry_date: String(item.entry_date ?? ""),
    source_type: String(item.source_type ?? ""),
    source_id: item.source_id ? String(item.source_id) : null,
    ref_no: item.ref_no ? String(item.ref_no) : null,
    description: item.description ? String(item.description) : null,
    debit: Number(item.debit) || 0,
    credit: Number(item.credit) || 0,
    currency_code: String(item.currency_code ?? "INR"),
    status: item.status ? String(item.status) : null,
    route: cleanRoute,
    metadata: (item.metadata as Record<string, unknown>) ?? {},
    created_at: String(item.created_at ?? ""),
    running_balance: Number(item.running_balance) || 0,
  };
}

function normaliseRows(data: unknown): VendorLedgerRow[] {
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normaliseRow);
}

/** Deep-link for a ledger row when the source document has a UI surface. */
export function routeForLedgerRow(row: VendorLedgerRow): string | null {
  if (
    row.route &&
    row.route.startsWith("/") &&
    !row.route.includes("undefined") &&
    row.route !== "/payment" &&
    row.route !== "/grn"
  ) {
    return row.route;
  }

  if (row.source_type === "vendor_payment") {
    if (row.source_id) return `/vendor-payments/${row.source_id}`;
    if (row.ref_no) return `/vendor-payments/${encodeURIComponent(row.ref_no)}`;
    return `/vendor-payments`;
  }

  if (row.source_type === "purchase_invoice") {
    if (row.source_id) return `/purchase-invoices/${row.source_id}`;
    if (row.ref_no) return `/purchase-invoices/${encodeURIComponent(row.ref_no)}`;
    return `/purchase-invoices`;
  }

  if (row.source_type === "purchase_order") {
    return row.source_id ? `/purchase-orders/${row.source_id}` : `/purchase-orders`;
  }

  if (row.source_type === "vendor_quote") {
    return row.source_id ? `/rfqs/${row.source_id}` : `/rfqs`;
  }

  if (row.source_type === "grn" || row.source_type === "grn_item") {
    return `/purchase-orders`;
  }

  return null;
}

const SOURCE_LABELS: Record<string, string> = {
  purchase_invoice: "Purchase Invoice / Bill",
  vendor_payment: "Supplier Payment",
  purchase_order: "Purchase Order",
  vendor_quote: "Vendor Quote",
  grn: "Material Received",
  vendor_debit_note: "Debit Note",
  vendor_credit_note: "Credit Note",
  opening_balance: "Opening Balance",
  adjustment: "Adjustment",
};

export function sourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}
