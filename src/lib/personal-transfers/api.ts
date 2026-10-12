import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import {
  personalTransferInputSchema,
  type PersonalTransferInput,
  type PersonalTransferRow,
} from "./schema";

const PERSONAL_TRANSFERS_FALLBACK_KEY = "finance.personal_transfers";
const LOCAL_STORAGE_KEY = "stos_personal_transfers_cache";

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
    msg.includes("personal_transfers") ||
    msg.includes("could not find the table") ||
    msg.includes("relation")
  );
}

// In-memory / local storage fallback cache
function getLocalFallback(): PersonalTransferRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersonalTransferRow[];
  } catch {
    return [];
  }
}

function saveLocalFallback(items: PersonalTransferRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * List all personal and internal transfers.
 */
export async function listPersonalTransfers(options?: {
  fromDate?: string;
  toDate?: string;
}): Promise<PersonalTransferRow[]> {
  try {
    let query = getDb()
      .from("personal_transfers" as never)
      .select("*")
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (options?.fromDate) {
      query = query.gte("transfer_date", options.fromDate);
    }
    if (options?.toDate) {
      query = query.lte("transfer_date", options.toDate);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[personal-transfers.api] Table personal_transfers not yet created, using app_settings / local cache.",
        );
        return await listFromFallbackStorage(options);
      }
      throw new AppError(mapDbError(error));
    }

    const rows = (data as unknown as PersonalTransferRow[]) || [];
    // Sync to local fallback for seamless offline reading
    saveLocalFallback(rows);
    return rows;
  } catch (err) {
    if (isMissingTableError(err)) {
      return await listFromFallbackStorage(options);
    }
    console.warn("[personal-transfers.api] Error reading transfers, using fallback:", err);
    return await listFromFallbackStorage(options);
  }
}

async function listFromFallbackStorage(options?: {
  fromDate?: string;
  toDate?: string;
}): Promise<PersonalTransferRow[]> {
  // 1. Try reading from app_settings
  try {
    const { data } = await getDb()
      .from("app_settings" as never)
      .select("value")
      .eq("key" as never, PERSONAL_TRANSFERS_FALLBACK_KEY as never)
      .maybeSingle();

    if (data && (data as { value?: unknown }).value) {
      const items = (data as { value: unknown }).value as PersonalTransferRow[];
      if (Array.isArray(items)) {
        let filtered = items;
        if (options?.fromDate) {
          filtered = filtered.filter((r) => r.transfer_date >= options.fromDate!);
        }
        if (options?.toDate) {
          filtered = filtered.filter((r) => r.transfer_date <= options.toDate!);
        }
        saveLocalFallback(items);
        return filtered.sort((a, b) => b.transfer_date.localeCompare(a.transfer_date));
      }
    }
  } catch {
    // Continue to local storage
  }

  // 2. Read from local storage
  const localItems = getLocalFallback();
  let filtered = localItems;
  if (options?.fromDate) {
    filtered = filtered.filter((r) => r.transfer_date >= options.fromDate!);
  }
  if (options?.toDate) {
    filtered = filtered.filter((r) => r.transfer_date <= options.toDate!);
  }
  return filtered.sort((a, b) => b.transfer_date.localeCompare(a.transfer_date));
}

/**
 * Record a new personal or internal transfer.
 */
export async function createPersonalTransfer(
  rawInput: PersonalTransferInput,
): Promise<PersonalTransferRow> {
  const parsed = personalTransferInputSchema.parse(rawInput);

  try {
    const { data, error } = await getDb()
      .from("personal_transfers" as never)
      .insert({
        transfer_date: parsed.transfer_date,
        from_account: parsed.from_account,
        from_account_custom: parsed.from_account_custom || null,
        to_account: parsed.to_account,
        to_account_custom: parsed.to_account_custom || null,
        amount: parsed.amount,
        category: parsed.category,
        reference_no: parsed.reference_no || "",
        remarks: parsed.remarks,
        receipt_url: parsed.receipt_url || null,
      } as never)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return await createInFallbackStorage(parsed);
      }
      throw new AppError(mapDbError(error));
    }

    const created = data as unknown as PersonalTransferRow;
    const currentLocal = getLocalFallback();
    saveLocalFallback([created, ...currentLocal]);
    return created;
  } catch (err) {
    if (isMissingTableError(err)) {
      return await createInFallbackStorage(parsed);
    }
    throw err;
  }
}

async function createInFallbackStorage(
  parsed: PersonalTransferInput,
): Promise<PersonalTransferRow> {
  const newRow: PersonalTransferRow = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pt_${Date.now()}`,
    transfer_date: parsed.transfer_date,
    from_account: parsed.from_account,
    from_account_custom: parsed.from_account_custom || null,
    to_account: parsed.to_account,
    to_account_custom: parsed.to_account_custom || null,
    amount: parsed.amount,
    category: parsed.category,
    reference_no: parsed.reference_no || "",
    remarks: parsed.remarks,
    receipt_url: parsed.receipt_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const existing = await listFromFallbackStorage();
  const updatedList = [newRow, ...existing];
  saveLocalFallback(updatedList);

  try {
    await getDb()
      .from("app_settings" as never)
      .upsert({
        key: PERSONAL_TRANSFERS_FALLBACK_KEY,
        value: updatedList,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    // ignore
  }

  return newRow;
}

/**
 * Update an existing personal transfer.
 */
export async function updatePersonalTransfer(
  id: string,
  rawInput: PersonalTransferInput,
): Promise<PersonalTransferRow> {
  const parsed = personalTransferInputSchema.parse(rawInput);

  try {
    const { data, error } = await getDb()
      .from("personal_transfers" as never)
      .update({
        transfer_date: parsed.transfer_date,
        from_account: parsed.from_account,
        from_account_custom: parsed.from_account_custom || null,
        to_account: parsed.to_account,
        to_account_custom: parsed.to_account_custom || null,
        amount: parsed.amount,
        category: parsed.category,
        reference_no: parsed.reference_no || "",
        remarks: parsed.remarks,
        receipt_url: parsed.receipt_url || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, id as never)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return await updateInFallbackStorage(id, parsed);
      }
      throw new AppError(mapDbError(error));
    }

    const updated = data as unknown as PersonalTransferRow;
    const currentLocal = getLocalFallback();
    saveLocalFallback(currentLocal.map((r) => (r.id === id ? updated : r)));
    return updated;
  } catch (err) {
    if (isMissingTableError(err)) {
      return await updateInFallbackStorage(id, parsed);
    }
    throw err;
  }
}

async function updateInFallbackStorage(
  id: string,
  parsed: PersonalTransferInput,
): Promise<PersonalTransferRow> {
  const existing = await listFromFallbackStorage();
  const found = existing.find((r) => r.id === id);
  const updatedRow: PersonalTransferRow = {
    ...(found || {
      id,
      created_at: new Date().toISOString(),
    }),
    transfer_date: parsed.transfer_date,
    from_account: parsed.from_account,
    from_account_custom: parsed.from_account_custom || null,
    to_account: parsed.to_account,
    to_account_custom: parsed.to_account_custom || null,
    amount: parsed.amount,
    category: parsed.category,
    reference_no: parsed.reference_no || "",
    remarks: parsed.remarks,
    receipt_url: parsed.receipt_url || null,
    updated_at: new Date().toISOString(),
  };

  const updatedList = existing.map((r) => (r.id === id ? updatedRow : r));
  saveLocalFallback(updatedList);

  try {
    await getDb()
      .from("app_settings" as never)
      .upsert({
        key: PERSONAL_TRANSFERS_FALLBACK_KEY,
        value: updatedList,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    // ignore
  }

  return updatedRow;
}

/**
 * Delete a personal transfer entry.
 */
export async function deletePersonalTransfer(id: string): Promise<void> {
  try {
    const { error } = await getDb()
      .from("personal_transfers" as never)
      .delete()
      .eq("id" as never, id as never);

    if (error && !isMissingTableError(error)) {
      throw new AppError(mapDbError(error));
    }
  } catch (err) {
    if (!isMissingTableError(err)) {
      console.warn("[personal-transfers.api] Could not delete from DB table:", err);
    }
  }

  // Update fallback stores
  const existing = await listFromFallbackStorage();
  const updatedList = existing.filter((r) => r.id !== id);
  saveLocalFallback(updatedList);

  try {
    await getDb()
      .from("app_settings" as never)
      .upsert({
        key: PERSONAL_TRANSFERS_FALLBACK_KEY,
        value: updatedList,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    // ignore
  }
}
