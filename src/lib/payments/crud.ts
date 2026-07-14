import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { paymentCreateSchema, type PaymentCreateInput } from "./schema";

export type PaymentRow = DbTable<"payments">;
export type PaymentListItem = PaymentRow & {
  invoice: { id: string; invoice_no: string } | null;
};

/**
 * A row from `public.payment_register` (Phase G.9A.2) -- the view unioning
 * `receipts` (the complete, ledger-integrated system) with legacy
 * `payments` rows, so the Payments page can show every real transaction
 * without a second write path. `source` tells the UI which detail route to
 * link to: "receipt" rows only ever exist in `receipts` (open via
 * `/receipts/$receiptId`); "payment" rows are legacy direct entries (open
 * via the existing `/payments/$id`).
 */
export interface PaymentRegisterRow {
  id: string;
  source: "receipt" | "payment";
  doc_no: string;
  customer_id: string | null;
  customer_name: string | null;
  invoice_id: string | null;
  invoice_no: string | null;
  amount: number;
  method: string;
  reference_no: string | null;
  notes: string | null;
  paid_at: string;
  status: string;
  created_at: string;
}

const SELECT = "*, invoice:invoices!payments_invoice_id_fkey(id,invoice_no)";

/** @deprecated Reads only the legacy `payments` table -- use
 *  `listPaymentRegister` for the Payments page so receipts are included.
 *  Kept for the payment detail/edit routes, which still operate on a real
 *  `payments` row. */
export async function listPayments(query = ""): Promise<PaymentListItem[]> {
  let q = supabase
    .from("payments")
    .select(SELECT)
    .order("paid_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`payment_no.ilike.%${s}%,reference_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as PaymentListItem[];
}

/** The Payments page's real data source (Phase G.9A.2) -- every active
 *  receipt plus every legacy payment, newest first. */
export async function listPaymentRegister(query = ""): Promise<PaymentRegisterRow[]> {
  let q = supabase
    .from("payment_register" as never)
    .select("*")
    .order("paid_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`doc_no.ilike.%${s}%,reference_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PaymentRegisterRow[];
}

export async function getPayment(id: string): Promise<PaymentListItem | null> {
  const { data, error } = await supabase.from("payments").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as PaymentListItem | null) ?? null;
}

export async function createPayment(input: PaymentCreateInput): Promise<PaymentRow> {
  const p = paymentCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("payments")
    .insert({
      // Phase G.9A.2 fix: was `PAY-${Date.now()}`, which bypassed the
      // assign_payment_code trigger entirely (it only assigns a code when
      // payment_no is empty) -- every payment created here got a
      // non-sequential PAY-<timestamp> number instead of the real
      // PAY-000123 sequence. An empty string lets the trigger do its job,
      // same as recordManualPayment already does in lib/invoices/api.ts.
      payment_no: "",
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
