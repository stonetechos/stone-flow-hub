import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import {
  vendorPaymentCreateSchema,
  type VendorPaymentCreateInput,
  type VendorPaymentType,
  type VendorPaymentMethod,
} from "./schema";

export type VendorPaymentRow = {
  id: string;
  payment_no: string;
  vendor_id: string;
  purchase_order_id: string | null;
  grn_id: string | null;
  project_id: string | null;
  payment_type: VendorPaymentType;
  amount: number;
  currency_code: string;
  method: VendorPaymentMethod | null;
  reference_no: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type VendorPaymentListItem = VendorPaymentRow & {
  vendor: { id: string; company_name: string } | null;
  purchase_order: { id: string; po_no: string } | null;
};

const SELECT =
  "*, vendor:vendors!vendor_payments_vendor_id_fkey(id,company_name), purchase_order:purchase_orders!vendor_payments_purchase_order_id_fkey(id,po_no)";

export async function listVendorPayments(query = ""): Promise<VendorPaymentListItem[]> {
  let q = supabase
    .from("vendor_payments" as never)
    .select(SELECT)
    .order("paid_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`payment_no.ilike.%${s}%,reference_no.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as VendorPaymentListItem[];
}

export async function getVendorPayment(id: string): Promise<VendorPaymentListItem | null> {
  const { data, error } = await supabase
    .from("vendor_payments" as never)
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as VendorPaymentListItem | null) ?? null;
}

export async function createVendorPayment(input: VendorPaymentCreateInput): Promise<VendorPaymentRow> {
  const p = vendorPaymentCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("vendor_payments" as never)
    .insert({
      payment_no: "",
      vendor_id: p.vendor_id,
      purchase_order_id: p.purchase_order_id ?? null,
      grn_id: p.grn_id ?? null,
      project_id: p.project_id ?? null,
      payment_type: p.payment_type,
      amount: p.amount,
      currency_code: p.currency_code,
      method: p.method ?? null,
      reference_no: p.reference_no ?? null,
      paid_at: p.paid_at,
      notes: p.notes ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as VendorPaymentRow;
}

export async function deleteVendorPayment(id: string): Promise<void> {
  const { error } = await supabase.from("vendor_payments" as never).delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
