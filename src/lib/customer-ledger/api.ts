/** Customer Ledger — unified view over invoices, receipts, credit/debit notes, refunds. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type LedgerEntry = {
  customer_id: string;
  entry_date: string;
  entry_type: "invoice" | "receipt" | "credit_note" | "debit_note" | "refund";
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

export async function getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("customer_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .order("entry_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as LedgerEntry[];
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
  const { data, error } = await supabase
    .from("customer_ledger")
    .select("*")
    .order("entry_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  const map = new Map<string, CustomerLedgerOverviewItem>();
  for (const r of data ?? []) {
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
  return map;
}
