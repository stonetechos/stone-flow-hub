import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { paymentCreateSchema, type PaymentCreateInput } from "./schema";

export type PaymentRow = DbTable<"payments">;
export type PaymentListItem = PaymentRow & {
  invoice: { id: string; invoice_no: string } | null;
};

const SELECT = "*, invoice:invoices!payments_invoice_id_fkey(id,invoice_no)";

export async function listPayments(query = ""): Promise<PaymentListItem[]> {
  let q = supabase.from("payments").select(SELECT).order("paid_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`payment_no.ilike.%${s}%,reference_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as PaymentListItem[];
}

export async function getPayment(id: string): Promise<PaymentListItem | null> {
  const { data, error } = await supabase.from("payments").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as PaymentListItem | null) ?? null;
}

export async function createPayment(input: PaymentCreateInput): Promise<PaymentRow> {
  const p = paymentCreateSchema.parse(input);
  const nextNo = `PAY-${Date.now()}`;
  const { data, error } = await supabase
    .from("payments")
    .insert({
      payment_no: nextNo,
      invoice_id: p.invoice_id,
      amount: p.amount,
      method: p.method,
      paid_at: p.paid_at,
      reference_no: p.reference_no ?? null,
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updatePayment(id: string, input: PaymentCreateInput): Promise<PaymentRow> {
  const p = paymentCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("payments")
    .update({
      invoice_id: p.invoice_id,
      amount: p.amount,
      method: p.method,
      paid_at: p.paid_at,
      reference_no: p.reference_no ?? null,
      notes: p.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
