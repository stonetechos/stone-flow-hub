import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { cashbookEntryInputSchema, type CashbookEntryInput, type CashbookEntryRow } from "./schema";

/**
 * Lists Raman's cashbook entries with computed running balances,
 * latest entries first.
 */
export async function listCashbookEntries(range?: { from?: string; to?: string }): Promise<{
  rows: CashbookEntryRow[];
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}> {
  // Query chronologically (oldest first) to compute running balances correctly
  const q = getDb()
    .from("ramans_cashbook" as never)
    .select("*")
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));

  const allRaw = (data ?? []) as unknown as CashbookEntryRow[];

  let running = 0;
  let allDebit = 0;
  let allCredit = 0;

  const withBalances: CashbookEntryRow[] = allRaw.map((entry) => {
    const isDebit = entry.entry_type === "debit";
    const debit = isDebit ? Number(entry.amount) : 0;
    const credit = !isDebit ? Number(entry.amount) : 0;
    allDebit += debit;
    allCredit += credit;
    running += debit - credit;

    return {
      ...entry,
      amount: Number(entry.amount),
      debit,
      credit,
      running_balance: running,
    };
  });

  const currentBalance = running;

  // Apply date range filter on computed list if specified
  let filtered = withBalances;
  if (range?.from) {
    filtered = filtered.filter((r) => r.entry_date >= range.from!);
  }
  if (range?.to) {
    filtered = filtered.filter((r) => r.entry_date <= range.to!);
  }

  // Reverse so newest entries appear at the top in the UI
  const rows = [...filtered].reverse();

  return {
    rows,
    totalDebit: allDebit,
    totalCredit: allCredit,
    currentBalance,
  };
}

export async function createCashbookEntry(input: CashbookEntryInput): Promise<CashbookEntryRow> {
  const parsed = cashbookEntryInputSchema.parse(input);

  // 1. Primary path: Server function (authenticated & verified super-admin privilege)
  try {
    const { saveCashbookEntryServerFn } = await import("./cashbook.functions");
    const res = await saveCashbookEntryServerFn({ data: { data: parsed } });
    if (res) return res as unknown as CashbookEntryRow;
  } catch (serverErr) {
    console.warn(
      "[cashbook.api] Server function failed, attempting direct insert fallback:",
      serverErr,
    );
  }

  // 2. Fallback: Direct DB query
  const payload = {
    entry_date: parsed.entry_date,
    entry_type: parsed.entry_type,
    amount: Number(parsed.amount),
    remarks: parsed.remarks.trim(),
  };

  const { data, error } = await getDb()
    .from("ramans_cashbook" as never)
    .insert(payload as never)
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CashbookEntryRow;
}

export async function updateCashbookEntry(
  id: string,
  input: CashbookEntryInput,
): Promise<CashbookEntryRow> {
  const parsed = cashbookEntryInputSchema.parse(input);

  try {
    const { saveCashbookEntryServerFn } = await import("./cashbook.functions");
    const res = await saveCashbookEntryServerFn({ data: { id, data: parsed } });
    if (res) return res as unknown as CashbookEntryRow;
  } catch (serverErr) {
    console.warn(
      "[cashbook.api] Server function update failed, falling back to direct update:",
      serverErr,
    );
  }

  const payload = {
    entry_date: parsed.entry_date,
    entry_type: parsed.entry_type,
    amount: Number(parsed.amount),
    remarks: parsed.remarks.trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getDb()
    .from("ramans_cashbook" as never)
    .update(payload as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CashbookEntryRow;
}

export async function deleteCashbookEntry(id: string): Promise<void> {
  try {
    const { deleteCashbookEntryServerFn } = await import("./cashbook.functions");
    await deleteCashbookEntryServerFn({ data: { id } });
    return;
  } catch (serverErr) {
    console.warn(
      "[cashbook.api] Server function delete failed, falling back to direct delete:",
      serverErr,
    );
  }

  const { error } = await getDb()
    .from("ramans_cashbook" as never)
    .delete()
    .eq("id" as never, id as never);

  if (error) throw new AppError(mapDbError(error));
}
