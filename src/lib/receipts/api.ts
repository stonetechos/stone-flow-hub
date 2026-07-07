/** Customer Receipts — data access. Supports advance receipts, multi-invoice allocation. */
import { supabase } from "@/integrations/supabase/client";
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

const JOINS =
  "*, customer:customers!receipts_customer_id_fkey(id,name,customer_code)";

export async function listReceipts(query = ""): Promise<ReceiptListItem[]> {
  let q = supabase
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
  const { data, error } = await supabase
    .from("receipts")
    .select(JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as ReceiptListItem | null) ?? null;
}

export async function getReceiptAllocations(receiptId: string) {
  const { data, error } = await supabase
    .from("receipt_allocations")
    .select("*, invoice:invoices!receipt_allocations_invoice_id_fkey(id,invoice_no,total,balance_due,issue_date)")
    .eq("receipt_id", receiptId);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listReceiptsByCustomer(customerId: string) {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("customer_id", customerId)
    .order("received_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/** Outstanding invoices (with balance > 0) for a customer — used in allocation UI. */
export async function listOpenInvoicesForCustomer(customerId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_no, total, balance_due, issue_date, due_date, status")
    .eq("customer_id", customerId)
    .neq("status", "cancelled")
    .gt("balance_due", 0)
    .order("issue_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
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
  const { data: rcpt, error } = await supabase
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
    const { error: aErr } = await supabase.from("receipt_allocations").insert(
      parsed.allocations.map((a) => ({
        receipt_id: rcpt.id,
        invoice_id: a.invoice_id,
        amount: a.amount,
      })),
    );
    if (aErr) throw new AppError(mapDbError(aErr));
  }
  return rcpt;
}

export async function updateReceipt(id: string, input: ReceiptUpdateInput): Promise<ReceiptRow> {
  const parsed = receiptUpdateSchema.parse(input);
  const { data, error } = await supabase
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
  const { error } = await supabase.from("receipts").update({ status: "void" }).eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function replaceAllocations(
  receiptId: string,
  allocations: Array<{ invoice_id: string; amount: number }>,
) {
  await supabase.from("receipt_allocations").delete().eq("receipt_id", receiptId);
  if (!allocations.length) return;
  const { error } = await supabase
    .from("receipt_allocations")
    .insert(allocations.map((a) => ({ receipt_id: receiptId, ...a })));
  if (error) throw new AppError(mapDbError(error));
}
