import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import { generateSearchTokens } from "@/lib/search-tokens";
import {
  vendorPaymentCreateSchema,
  vendorPaymentUpdateSchema,
  type VendorPaymentCreateInput,
  type VendorPaymentUpdateInput,
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
    .limit(300);

  const tokens = generateSearchTokens(query);

  if (tokens.length > 0) {
    // 1. Resolve vendors matching any of the search tokens/variants
    const vendorOrClauses = tokens.flatMap((tok) => [
      `company_name.ilike.%${tok}%`,
      `contact_person.ilike.%${tok}%`,
      `vendor_code.ilike.%${tok}%`,
      `mobile_number.ilike.%${tok}%`,
    ]);

    let matchedVendorIds: string[] = [];
    if (vendorOrClauses.length > 0) {
      try {
        const { data: vendorMatches } = await supabase
          .from("vendors" as never)
          .select("id")
          .or(vendorOrClauses.join(","))
          .limit(50);
        if (vendorMatches && Array.isArray(vendorMatches)) {
          matchedVendorIds = (vendorMatches as { id: string }[]).map((v) => v.id);
        }
      } catch (err) {
        console.warn("[listVendorPayments] vendor search note:", err);
      }
    }

    // 2. Build payment search filter across payment number, ref #, notes, and matched vendors
    const paymentOrClauses: string[] = tokens.flatMap((tok) => [
      `payment_no.ilike.%${tok}%`,
      `reference_no.ilike.%${tok}%`,
      `notes.ilike.%${tok}%`,
    ]);

    if (matchedVendorIds.length > 0) {
      paymentOrClauses.push(`vendor_id.in.(${matchedVendorIds.join(",")})`);
    }

    if (paymentOrClauses.length > 0) {
      q = q.or(paymentOrClauses.join(","));
    }
  }

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as VendorPaymentListItem[];
}

export async function getVendorPayment(idOrNo: string): Promise<VendorPaymentListItem | null> {
  const trimmed = idOrNo.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  let query = supabase.from("vendor_payments" as never).select(SELECT);
  if (isUuid) {
    query = query.eq("id", trimmed);
  } else {
    query = query.eq("payment_no", trimmed);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as VendorPaymentListItem | null) ?? null;
}

export async function createVendorPayment(
  input: VendorPaymentCreateInput,
): Promise<VendorPaymentRow> {
  const p = vendorPaymentCreateSchema.parse(input);
  try {
    const { createVendorPaymentServerFn } = await import("./vendor-payments.functions");
    return await createVendorPaymentServerFn({ data: { data: p } });
  } catch (serverErr) {
    console.warn(
      "[createVendorPayment] server function failed, falling back to client:",
      serverErr,
    );
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
}

export async function updateVendorPayment(
  id: string,
  input: VendorPaymentUpdateInput,
): Promise<VendorPaymentRow> {
  const p = vendorPaymentUpdateSchema.parse(input);
  try {
    const { updateVendorPaymentServerFn } = await import("./vendor-payments.functions");
    return await updateVendorPaymentServerFn({ data: { id, data: p } });
  } catch (serverErr) {
    console.warn(
      "[updateVendorPayment] server function failed, falling back to client:",
      serverErr,
    );
    const { data, error } = await supabase
      .from("vendor_payments" as never)
      .update({
        vendor_id: p.vendor_id,
        purchase_order_id: p.purchase_order_id ?? null,
        grn_id: p.grn_id ?? null,
        project_id: p.project_id ?? null,
        payment_type: p.payment_type,
        amount: p.amount,
        currency_code: p.currency_code ?? "INR",
        method: p.method ?? null,
        reference_no: p.reference_no ?? null,
        paid_at: p.paid_at,
        notes: p.notes ?? null,
      } as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(mapDbError(error));
    return data as unknown as VendorPaymentRow;
  }
}

export async function deleteVendorPayment(id: string): Promise<void> {
  try {
    const { deleteVendorPaymentServerFn } = await import("./vendor-payments.functions");
    await deleteVendorPaymentServerFn({ data: { id } });
  } catch (serverErr) {
    console.warn(
      "[deleteVendorPayment] server function failed, falling back to client:",
      serverErr,
    );
    const { error } = await supabase
      .from("vendor_payments" as never)
      .delete()
      .eq("id", id);
    if (error) throw new AppError(mapDbError(error));
  }
}
