import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import {
  cashbookEntryInputSchema,
  type CashbookEntryInput,
  type CashbookEntryRow,
  type CashbookOpeningBalance,
} from "./schema";

const CASHBOOK_SETTINGS_KEY = "finance.ramans_cashbook";
export const CASHBOOK_OPENING_KEY = "finance.ramans_cashbook.opening_balance";

export function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  let msg = "";
  let code = "";
  if (typeof error === "string") {
    msg = error.toLowerCase();
  } else if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    code = String(e.code ?? "");
    msg =
      `${String(e.message ?? "")} ${String(e.details ?? "")} ${String(e.hint ?? "")} ${String(e.name ?? "")}`.toLowerCase();
    if (e.cause && typeof e.cause === "object") {
      const c = e.cause as Record<string, unknown>;
      msg += ` ${String(c.message ?? "")} ${String(c.details ?? "")}`;
    }
  }
  return (
    code === "PGRST205" ||
    code === "PGRST200" ||
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("ramans_cashbook") ||
    msg.includes("could not find the table") ||
    msg.includes("relation")
  );
}

export async function getCashbookOpeningBalance(): Promise<CashbookOpeningBalance> {
  try {
    const { data, error } = await getDb()
      .from("app_settings" as never)
      .select("value")
      .eq("key" as never, CASHBOOK_OPENING_KEY as never)
      .maybeSingle();

    if (error) {
      console.warn("[cashbook.api] Error reading opening balance from app_settings:", error);
    } else {
      const val = (data as { value?: unknown } | null)?.value as CashbookOpeningBalance | null;
      if (val && typeof val.amount === "number") {
        return val;
      }
    }
  } catch (err) {
    console.warn("[cashbook.api] Exception reading opening balance:", err);
  }

  // Fallback: Check if stored in finance.ramans_cashbook envelope
  try {
    const { data: legacyData } = await getDb()
      .from("app_settings" as never)
      .select("value")
      .eq("key" as never, CASHBOOK_SETTINGS_KEY as never)
      .maybeSingle();

    const legVal = (legacyData as { value?: unknown } | null)?.value as {
      opening_balance?: number;
    } | null;
    if (legVal && typeof legVal.opening_balance === "number") {
      return { amount: legVal.opening_balance };
    }
  } catch {
    /* ignore fallback error */
  }

  return { amount: 0, as_of_date: new Date().toISOString().slice(0, 10) };
}

export async function setCashbookOpeningBalance(
  amount: number,
  as_of_date?: string,
  notes?: string,
): Promise<CashbookOpeningBalance> {
  const payload: CashbookOpeningBalance = {
    amount: Number(amount) || 0,
    as_of_date: as_of_date || new Date().toISOString().slice(0, 10),
    notes: (notes || "").trim(),
    updated_at: new Date().toISOString(),
  };

  // 1. Try server function (authenticated super admin)
  try {
    const { setOpeningBalanceServerFn } = await import("./cashbook.functions");
    const res = await setOpeningBalanceServerFn({ data: payload });
    if (res) return res as CashbookOpeningBalance;
  } catch (err) {
    console.warn(
      "[cashbook.api] Server function for opening balance failed, falling back to direct upsert:",
      err,
    );
  }

  // 2. Fallback: Direct upsert in app_settings
  const { error } = await getDb()
    .from("app_settings" as never)
    .upsert(
      {
        key: CASHBOOK_OPENING_KEY,
        value: payload as never,
        description: "Raman's Cashbook initial opening cash balance",
      } as never,
      { onConflict: "key" },
    );

  if (error) throw new AppError(mapDbError(error));
  return payload;
}

async function getCashbookFromAppSettings(): Promise<CashbookEntryRow[]> {
  const { data, error } = await getDb()
    .from("app_settings" as never)
    .select("value")
    .eq("key" as never, CASHBOOK_SETTINGS_KEY as never)
    .maybeSingle();

  if (error) {
    console.warn("[cashbook.api] Error reading app_settings fallback:", error);
    return [];
  }
  const val = (data as { value?: unknown } | null)?.value;
  if (!val) return [];
  if (Array.isArray(val)) return val as CashbookEntryRow[];
  if (Array.isArray((val as { entries?: unknown[] }).entries)) {
    return (val as { entries: CashbookEntryRow[] }).entries;
  }
  return [];
}

async function saveCashbookToAppSettings(entries: CashbookEntryRow[]): Promise<void> {
  const { error } = await getDb()
    .from("app_settings" as never)
    .upsert(
      {
        key: CASHBOOK_SETTINGS_KEY,
        value: { entries } as never,
        description: "Raman's Cashbook ledger fallback store",
      } as never,
      { onConflict: "key" },
    );
  if (error) throw new AppError(mapDbError(error));
}

/**
 * Lists Raman's cashbook entries with computed running balances starting
 * from the configured Opening Cash Balance.
 * Formula:
 *   Current Balance = Opening Balance + Total Credit (In) - Total Debit (Out)
 */
export async function listCashbookEntries(range?: { from?: string; to?: string }): Promise<{
  rows: CashbookEntryRow[];
  openingBalance: number;
  openingDate?: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}> {
  let allRaw: CashbookEntryRow[] = [];

  try {
    // Query chronologically (oldest first) to compute running balances correctly
    const q = getDb()
      .from("ramans_cashbook" as never)
      .select("*")
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true });

    const { data, error } = await q;
    if (error) {
      if (isMissingTableError(error)) {
        allRaw = await getCashbookFromAppSettings();
      } else {
        throw new AppError(mapDbError(error));
      }
    } else {
      allRaw = (data ?? []) as unknown as CashbookEntryRow[];
    }
  } catch (err) {
    if (isMissingTableError(err)) {
      allRaw = await getCashbookFromAppSettings();
    } else {
      throw err;
    }
  }

  // Retrieve configured opening cash balance
  const openingObj = await getCashbookOpeningBalance();
  const openingBalance = Number(openingObj.amount) || 0;

  allRaw.sort((a, b) => {
    const d = (a.entry_date || "").localeCompare(b.entry_date || "");
    if (d !== 0) return d;
    return (a.created_at || "").localeCompare(b.created_at || "");
  });

  // Start sequential balance from Opening Balance:
  // Credit = Cash In (+), Debit = Cash Out (-)
  let running = openingBalance;
  let allDebit = 0;
  let allCredit = 0;

  const withBalances: CashbookEntryRow[] = allRaw.map((entry) => {
    const isCredit = entry.entry_type === "credit";
    const credit = isCredit ? Number(entry.amount) : 0;
    const debit = !isCredit ? Number(entry.amount) : 0;
    allCredit += credit;
    allDebit += debit;
    running += credit - debit;

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
    openingBalance,
    openingDate: openingObj.as_of_date || new Date().toISOString().slice(0, 10),
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

  if (error) {
    if (isMissingTableError(error)) {
      const entries = await getCashbookFromAppSettings();
      const now = new Date().toISOString();
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `cash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newRow: CashbookEntryRow = {
        id,
        ...payload,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      entries.push(newRow);
      await saveCashbookToAppSettings(entries);
      return newRow;
    }
    throw new AppError(mapDbError(error));
  }
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

  if (error) {
    if (isMissingTableError(error)) {
      const entries = await getCashbookFromAppSettings();
      const idx = entries.findIndex((e) => e.id === id);
      const now = new Date().toISOString();
      if (idx === -1) {
        const newRow: CashbookEntryRow = {
          id,
          ...payload,
          created_by: null,
          created_at: now,
          updated_at: now,
        };
        entries.push(newRow);
        await saveCashbookToAppSettings(entries);
        return newRow;
      }
      const updatedRow: CashbookEntryRow = {
        ...entries[idx],
        ...payload,
        updated_at: now,
      };
      entries[idx] = updatedRow;
      await saveCashbookToAppSettings(entries);
      return updatedRow;
    }
    throw new AppError(mapDbError(error));
  }
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

  if (error) {
    if (isMissingTableError(error)) {
      const entries = await getCashbookFromAppSettings();
      const filtered = entries.filter((e) => e.id !== id);
      await saveCashbookToAppSettings(filtered);
      return;
    }
    throw new AppError(mapDbError(error));
  }
}
