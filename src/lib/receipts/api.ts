/** Customer Receipts — data access. Supports advance receipts, multi-invoice allocation. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import {
  receiptCreateSchema,
  receiptUpdateSchema,
  type ReceiptCreateInput,
  type ReceiptUpdateInput,
} from "./schema";

export type ReceiptRow = DbTable<"receipts">;
export type ReceiptAllocationRow = DbTable<"receipt_allocations">;

export type ReceiptListItem = ReceiptRow & {
  customer: { id: string; name: string; customer_code: string } | null;
};

const JOINS = "*, customer:customers!receipts_customer_id_fkey(id,name,customer_code)";

export async function listReceipts(query = ""): Promise<ReceiptListItem[]> {
  let q = getDb()
    .from("receipts")
    .select(JOINS)
    .order("received_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`receipt_no.ilike.%${s}%,reference_no.ilike.%${s}%,cheque_no.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ReceiptListItem[];
}

export async function getReceipt(id: string): Promise<ReceiptListItem | null> {
  const { data, error } = await getDb().from("receipts").select(JOINS).eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as ReceiptListItem | null) ?? null;
}

export async function getReceiptAllocations(receiptId: string) {
  const { data, error } = await getDb()
    .from("receipt_allocations")
    .select(
      "*, invoice:invoices!receipt_allocations_invoice_id_fkey(id,invoice_no,total,balance_due,issue_date)",
    )
    .eq("receipt_id", receiptId);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listReceiptsByCustomer(customerId: string) {
  const { data, error } = await getDb()
    .from("receipts")
    .select("*")
    .eq("customer_id", customerId)
    .order("received_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/** Outstanding invoices (with balance > 0) for a customer — used in allocation UI. */
export async function listOpenInvoicesForCustomer(customerId: string) {
  const { data, error } = await getDb()
    .from("invoices")
    .select("id, invoice_no, total, balance_due, issue_date, due_date, status")
    .eq("customer_id", customerId)
    .neq("status", "cancelled")
    .gt("balance_due", 0)
    .order("issue_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/**
 * Guard against allocating more to an invoice than it still owes. The DB
 * happily accepts it and `recalc_invoice_with_receipts` then writes a
 * negative `balance_due`, which silently corrupts the customer ledger and
 * every collections KPI derived from it.
 */
async function assertAllocationsFitInvoices(
  allocations: Array<{ invoice_id: string; amount: number }>,
  /** Allocations already stored for this receipt are not "new" money. */
  excludeReceiptId?: string,
): Promise<void> {
  if (!allocations.length) return;
  const ids = [...new Set(allocations.map((a) => a.invoice_id))];
  const { data, error } = await getDb()
    .from("invoices")
    .select("id, invoice_no, balance_due")
    .in("id", ids);
  if (error) throw new AppError(mapDbError(error));

  let existing: Record<string, number> = {};
  if (excludeReceiptId) {
    const { data: prev, error: pErr } = await getDb()
      .from("receipt_allocations")
      .select("invoice_id, amount")
      .eq("receipt_id", excludeReceiptId);
    if (pErr) throw new AppError(mapDbError(pErr));
    existing = (prev ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.invoice_id] = (acc[r.invoice_id] ?? 0) + Number(r.amount);
      return acc;
    }, {});
  }

  for (const inv of data ?? []) {
    const requested = allocations
      .filter((a) => a.invoice_id === inv.id)
      .reduce((s, a) => s + a.amount, 0);
    const available = Number(inv.balance_due ?? 0) + (existing[inv.id] ?? 0);
    if (requested > available + 0.01) {
      throw new AppError(
        `Cannot allocate ${requested.toFixed(2)} to invoice ${inv.invoice_no} — only ${available.toFixed(2)} is outstanding.`,
        "BAD_REQUEST",
        400,
      );
    }
  }
}

export async function createReceipt(input: ReceiptCreateInput): Promise<ReceiptRow> {
  const parsed = receiptCreateSchema.parse(input);
  const totalAlloc = parsed.allocations.reduce((s, a) => s + a.amount, 0);
  const netAvailable = parsed.amount - parsed.tds_amount - parsed.bank_charges;
  if (totalAlloc > netAvailable + 0.01) {
    throw new AppError(
      `Allocated ${totalAlloc.toFixed(2)} exceeds available net receipt amount ${netAvailable.toFixed(2)}.`,
      "BAD_REQUEST",
      400,
    );
  }
  // Validate before inserting the receipt so a rejected allocation never
  // leaves a phantom advance behind.
  await assertAllocationsFitInvoices(parsed.allocations);

  const { data: rcpt, error } = await getDb()
    .from("receipts")
    .insert({
      receipt_no: "",
      customer_id: parsed.customer_id,
      received_at: parsed.received_at,
      amount: parsed.amount,
      method: parsed.method,
      bank_name: parsed.bank_name ?? null,
      account_used: parsed.account_used ?? null,
      reference_no: parsed.reference_no ?? null,
      cheque_no: parsed.cheque_no ?? null,
      cheque_date: parsed.cheque_date ?? null,
      tds_amount: parsed.tds_amount,
      bank_charges: parsed.bank_charges,
      remarks: parsed.remarks ?? null,
      attachment_file_id: parsed.attachment_file_id ?? null,
      provider: parsed.provider ?? null,
      provider_ref: parsed.provider_ref ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (parsed.allocations.length) {
    const { error: aErr } = await getDb()
      .from("receipt_allocations")
      .insert(
        parsed.allocations.map((a) => ({
          receipt_id: rcpt.id,
          invoice_id: a.invoice_id,
          amount: a.amount,
        })),
      );
    if (aErr) {
      // Two round-trips, no transaction: undo the receipt rather than leave
      // an unintended unallocated advance on the customer ledger.
      await getDb().from("receipts").delete().eq("id", rcpt.id);
      throw new AppError(mapDbError(aErr));
    }
  }
  return rcpt;
}

export async function updateReceipt(id: string, input: ReceiptUpdateInput): Promise<ReceiptRow> {
  const parsed = receiptUpdateSchema.parse(input);
  // Editing amount/TDS/charges downwards must not strand allocations above
  // the new net amount — that would over-credit the allocated invoices.
  if (parsed.status !== "void") {
    const { data: allocs, error: aErr } = await getDb()
      .from("receipt_allocations")
      .select("amount")
      .eq("receipt_id", id);
    if (aErr) throw new AppError(mapDbError(aErr));
    const allocated = (allocs ?? []).reduce((s, a) => s + Number(a.amount), 0);
    const net =
      Number(parsed.amount ?? 0) -
      Number(parsed.tds_amount ?? 0) -
      Number(parsed.bank_charges ?? 0);

    if (allocated > net + 0.01) {
      throw new AppError(
        `This receipt already has ${allocated.toFixed(2)} allocated to invoices — the net amount cannot be reduced to ${net.toFixed(2)}. Adjust the allocations first.`,
        "BAD_REQUEST",
        400,
      );
    }
  }
  const { data, error } = await getDb()
    .from("receipts")
    .update({
      received_at: parsed.received_at,
      amount: parsed.amount,
      method: parsed.method,
      bank_name: parsed.bank_name ?? null,
      account_used: parsed.account_used ?? null,
      reference_no: parsed.reference_no ?? null,
      cheque_no: parsed.cheque_no ?? null,
      cheque_date: parsed.cheque_date ?? null,
      tds_amount: parsed.tds_amount,
      bank_charges: parsed.bank_charges,
      remarks: parsed.remarks ?? null,
      status: parsed.status,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function voidReceipt(id: string) {
  const { error } = await getDb().from("receipts").update({ status: "void" }).eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function replaceAllocations(
  receiptId: string,
  allocations: Array<{ invoice_id: string; amount: number }>,
) {
  // Same over-allocation guard as createReceipt; the receipt's own existing
  // allocations are freed by the delete below, so they count as available.
  await assertAllocationsFitInvoices(allocations, receiptId);
  const { error: dErr } = await getDb()
    .from("receipt_allocations")
    .delete()
    .eq("receipt_id", receiptId);
  if (dErr) throw new AppError(mapDbError(dErr));
  if (!allocations.length) return;
  const { error } = await getDb()
    .from("receipt_allocations")
    .insert(allocations.map((a) => ({ receipt_id: receiptId, ...a })));
  if (error) throw new AppError(mapDbError(error));
}
