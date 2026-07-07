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
  balance: number;   // positive => customer owes; negative => credit balance
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
