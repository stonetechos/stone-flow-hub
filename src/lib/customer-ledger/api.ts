/** Customer Ledger — unified view over invoices, receipts, credit/debit notes, refunds. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type LedgerEntry = {
  customer_id: string;
  entry_date: string;
  entry_type:
    | "invoice"
    | "receipt"
    | "credit_note"
    | "debit_note"
    | "refund"
    | "delivery_challan"
    | "payment";
  ref_id: string;
  ref_no: string;
  debit: number;
  credit: number;
  status: string;
};

export type LedgerSummary = {
  totalDebit: number;
  totalCredit: number;
  balance: number; // positive => customer owes; negative => credit balance
  unallocatedAdvance: number;
};

export interface RawDispatchForLedger {
  id: string;
  dispatch_no: string;
  dispatch_date: string | null;
  status: string;
  carting_charge: number | null;
  notes: string | null;
  sales_order_id: string | null;
  customer_id: string | null;
  created_at?: string;
  sales_order?: { id: string; quote_id: string | null } | null;
}

export interface RawInvoiceForLedger {
  id: string;
  invoice_no: string;
  quote_id: string | null;
  notes: string | null;
  status: string;
  customer_id?: string | null;
}

export interface RawQuoteForLedger {
  id: string;
  quote_no: string;
  total: number;
  customer_id: string | null;
  status: string;
}

/**
 * Resolves uninvoiced cash delivery challans to be incorporated as debits
 * in customer ledgers. Dispatches linked to already-invoiced orders or quotes
 * are deduplicated so that no amount is counted twice.
 */
export function resolveUninvoicedDeliveryChallans(params: {
  dispatches: RawDispatchForLedger[];
  invoices: RawInvoiceForLedger[];
  quotes: RawQuoteForLedger[];
  targetCustomerId?: string;
}): LedgerEntry[] {
  const { dispatches, invoices, quotes, targetCustomerId } = params;

  // Active invoices
  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
  const invoicedQuoteIds = new Set<string>();
  const invoicedDispatchNos = new Set<string>();

  for (const inv of activeInvoices) {
    if (inv.quote_id) invoicedQuoteIds.add(inv.quote_id);
    if (inv.notes) {
      for (const q of quotes) {
        if (inv.notes.includes(q.quote_no)) invoicedQuoteIds.add(q.id);
      }
      for (const d of dispatches) {
        if (inv.notes.includes(d.dispatch_no)) invoicedDispatchNos.add(d.dispatch_no);
      }
    }
  }

  // Active quotes
  const activeQuotes = quotes.filter((q) => q.status !== "rejected");
  const quotesById = new Map<string, RawQuoteForLedger>();
  const quotesByCustomer = new Map<string, RawQuoteForLedger[]>();

  for (const q of activeQuotes) {
    quotesById.set(q.id, q);
    if (q.customer_id) {
      const list = quotesByCustomer.get(q.customer_id) ?? [];
      list.push(q);
      quotesByCustomer.set(q.customer_id, list);
    }
  }

  // Active dispatches
  let activeDispatches = dispatches.filter(
    (d) => d.status !== "cancelled" && (!targetCustomerId || d.customer_id === targetCustomerId),
  );

  // Sort chronologically ascending
  activeDispatches = [...activeDispatches].sort((a, b) => {
    const da = a.dispatch_date || a.created_at || "";
    const db = b.dispatch_date || b.created_at || "";
    return da.localeCompare(db);
  });

  const usedQuoteIds = new Set<string>();
  const result: LedgerEntry[] = [];

  for (const d of activeDispatches) {
    if (!d.customer_id) continue;
    if (invoicedDispatchNos.has(d.dispatch_no)) continue;

    // Find matched quote:
    // 1. Direct link through sales_order.quote_id
    let matchedQuote: RawQuoteForLedger | undefined;
    if (d.sales_order?.quote_id && quotesById.has(d.sales_order.quote_id)) {
      matchedQuote = quotesById.get(d.sales_order.quote_id);
    } else {
      const customerQuotes = quotesByCustomer.get(d.customer_id) ?? [];
      // 2. Mentioned quote number in notes (e.g. "Delivery challan for Quote #QT-...")
      if (d.notes) {
        matchedQuote = customerQuotes.find((q) => d.notes?.includes(q.quote_no));
      }
      // 3. Fallback: match available uninvoiced quote for this customer
      if (!matchedQuote && customerQuotes.length > 0) {
        matchedQuote =
          customerQuotes.find((q) => !invoicedQuoteIds.has(q.id) && !usedQuoteIds.has(q.id)) ||
          customerQuotes[0];
      }
    }

    // If the quote is invoiced, its total is already in the ledger as an invoice debit.
    if (matchedQuote && invoicedQuoteIds.has(matchedQuote.id)) {
      continue;
    }

    let quoteDebit = 0;
    if (matchedQuote && !usedQuoteIds.has(matchedQuote.id)) {
      quoteDebit = Number(matchedQuote.total) || 0;
      usedQuoteIds.add(matchedQuote.id);
    }

    const cartingDebit = Number(d.carting_charge) || 0;
    const totalDebit = quoteDebit + cartingDebit;

    if (totalDebit > 0) {
      result.push({
        customer_id: d.customer_id,
        entry_date:
          d.dispatch_date ||
          (d.created_at ? d.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        entry_type: "delivery_challan",
        ref_id: d.id,
        ref_no: d.dispatch_no,
        debit: totalDebit,
        credit: 0,
        status: d.status,
      });
    }
  }

  return result;
}

export async function getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("customer_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .order("entry_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  const ledgerEntries = (data ?? []) as LedgerEntry[];

  // Defensively augment with any active credit_notes not in customer_ledger view
  const existingCnIds = new Set(
    ledgerEntries.filter((r) => r.entry_type === "credit_note").map((r) => r.ref_id),
  );

  // Augment with uninvoiced delivery challans & missing credit notes
  const [dispRes, invRes, quoteRes, cnRes] = await Promise.all([
    supabase
      .from("dispatches")
      .select(
        "id, dispatch_no, dispatch_date, status, carting_charge, notes, sales_order_id, customer_id, created_at, sales_order:sales_orders!dispatches_sales_order_id_fkey(id, quote_id)",
      )
      .eq("customer_id", customerId)
      .neq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("id, invoice_no, quote_id, notes, status, customer_id")
      .eq("customer_id", customerId)
      .neq("status", "cancelled"),
    supabase
      .from("quotes")
      .select("id, quote_no, total, status, customer_id")
      .eq("customer_id", customerId)
      .neq("status", "rejected"),
    supabase
      .from("credit_notes")
      .select("id, cn_no, amount, issued_at, status, customer_id")
      .eq("customer_id", customerId)
      .neq("status", "cancelled"),
  ]);

  const missingCreditNotes: LedgerEntry[] = (cnRes.data ?? [])
    .filter((cn) => !existingCnIds.has(cn.id))
    .map((cn) => ({
      customer_id: cn.customer_id,
      entry_date: cn.issued_at || new Date().toISOString().slice(0, 10),
      entry_type: "credit_note" as const,
      ref_id: cn.id,
      ref_no: cn.cn_no || "CN-RECORD",
      debit: 0,
      credit: Number(cn.amount) || 0,
      status: cn.status,
    }));

  const challanEntries = resolveUninvoicedDeliveryChallans({
    dispatches: (dispRes.data ?? []) as unknown as RawDispatchForLedger[],
    invoices: (invRes.data ?? []) as unknown as RawInvoiceForLedger[],
    quotes: (quoteRes.data ?? []) as unknown as RawQuoteForLedger[],
    targetCustomerId: customerId,
  });

  if (challanEntries.length === 0 && missingCreditNotes.length === 0) return ledgerEntries;

  const combined = [...ledgerEntries, ...missingCreditNotes, ...challanEntries];
  combined.sort((a, b) => (a.entry_date || "").localeCompare(b.entry_date || ""));
  return combined;
}

export async function getCustomerLedgerSummary(customerId: string): Promise<LedgerSummary> {
  const [ledger, adv] = await Promise.all([
    getCustomerLedger(customerId),
    supabase
      .from("receipts")
      .select("unallocated_amount")
      .eq("customer_id", customerId)
      .eq("status", "active"),
  ]);
  if (adv.error) throw new AppError(mapDbError(adv.error));
  const totalDebit = ledger.reduce((s, r) => s + Number(r.debit ?? 0), 0);
  const totalCredit = ledger.reduce((s, r) => s + Number(r.credit ?? 0), 0);
  const unallocated = (adv.data ?? []).reduce(
    (s, r) => s + Number((r as { unallocated_amount: number }).unallocated_amount ?? 0),
    0,
  );
  return {
    totalDebit,
    totalCredit,
    balance: totalDebit - totalCredit,
    unallocatedAdvance: unallocated,
  };
}

export interface CustomerLedgerOverviewItem {
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entryCount: number;
  lastEntryAt: string | null;
}

export async function listCustomerLedgerSummaries(): Promise<
  Map<string, CustomerLedgerOverviewItem>
> {
  const [ledgerRes, dispRes, invRes, quoteRes, cnRes] = await Promise.all([
    supabase.from("customer_ledger").select("*").order("entry_date", { ascending: true }),
    supabase
      .from("dispatches")
      .select(
        "id, dispatch_no, dispatch_date, status, carting_charge, notes, sales_order_id, customer_id, created_at, sales_order:sales_orders!dispatches_sales_order_id_fkey(id, quote_id)",
      )
      .neq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("id, invoice_no, quote_id, notes, status, customer_id")
      .neq("status", "cancelled"),
    supabase
      .from("quotes")
      .select("id, quote_no, total, status, customer_id")
      .neq("status", "rejected"),
    supabase
      .from("credit_notes")
      .select("id, amount, customer_id, issued_at, status")
      .neq("status", "cancelled"),
  ]);

  if (ledgerRes.error) throw new AppError(mapDbError(ledgerRes.error));
  const data = ledgerRes.data ?? [];
  const map = new Map<string, CustomerLedgerOverviewItem>();

  const existingCnIds = new Set<string>();
  for (const r of data) {
    if (r.entry_type === "credit_note" && r.ref_id) {
      existingCnIds.add(r.ref_id);
    }
    if (!r.customer_id) continue;
    let s = map.get(r.customer_id);
    if (!s) {
      s = { totalDebit: 0, totalCredit: 0, balance: 0, entryCount: 0, lastEntryAt: null };
      map.set(r.customer_id, s);
    }
    s.totalDebit += Number(r.debit ?? 0);
    s.totalCredit += Number(r.credit ?? 0);
    s.balance = s.totalDebit - s.totalCredit;
    s.entryCount += 1;
    s.lastEntryAt = r.entry_date;
  }

  // Augment with missing credit_notes if not already in customer_ledger view
  for (const cn of cnRes.data ?? []) {
    if (!cn.customer_id || existingCnIds.has(cn.id)) continue;
    let s = map.get(cn.customer_id);
    if (!s) {
      s = { totalDebit: 0, totalCredit: 0, balance: 0, entryCount: 0, lastEntryAt: null };
      map.set(cn.customer_id, s);
    }
    const amt = Number(cn.amount) || 0;
    s.totalCredit += amt;
    s.balance = s.totalDebit - s.totalCredit;
    s.entryCount += 1;
    if (!s.lastEntryAt || (cn.issued_at && cn.issued_at > s.lastEntryAt)) {
      s.lastEntryAt = cn.issued_at;
    }
  }

  // If customer_ledger already has delivery_challan, we're done
  if (data.some((r) => r.entry_type === "delivery_challan")) {
    return map;
  }

  // Augment with uninvoiced delivery challan debits
  const challanEntries = resolveUninvoicedDeliveryChallans({
    dispatches: (dispRes.data ?? []) as unknown as RawDispatchForLedger[],
    invoices: (invRes.data ?? []) as unknown as RawInvoiceForLedger[],
    quotes: (quoteRes.data ?? []) as unknown as RawQuoteForLedger[],
  });

  for (const entry of challanEntries) {
    if (!entry.customer_id) continue;
    let s = map.get(entry.customer_id);
    if (!s) {
      s = { totalDebit: 0, totalCredit: 0, balance: 0, entryCount: 0, lastEntryAt: null };
      map.set(entry.customer_id, s);
    }
    s.totalDebit += Number(entry.debit ?? 0);
    s.balance = s.totalDebit - s.totalCredit;
    s.entryCount += 1;
    if (!s.lastEntryAt || entry.entry_date > s.lastEntryAt) {
      s.lastEntryAt = entry.entry_date;
    }
  }

  return map;
}
