/**
 * Purchase Invoices data access.
 *
 * `purchase_invoices` is a brand-new table (migration
 * 20260904150000_purchase_invoices.sql) not yet present in the generated
 * `integrations/supabase/types.ts` — same situation `grns/api.ts` was in
 * when GRNs shipped. Follows that file's workaround: `as never` casts on
 * the table name, with the row shape hand-typed below instead of via
 * `DbTable<...>`. Uses `getDb()` (not the raw `supabase` singleton) so
 * this module is authenticated-context-safe if it's ever called from a
 * server function, per docs/authentication.md.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import {
  purchaseInvoiceCreateSchema,
  type PurchaseInvoiceCreateInput,
  type PurchaseInvoiceStatus,
} from "./schema";

export type PurchaseInvoiceRow = {
  id: string;
  invoice_no: string;
  vendor_invoice_no: string | null;
  vendor_id: string;
  purchase_order_id: string | null;
  project_id: string | null;
  status: PurchaseInvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  other_charges: number;
  total_amount: number;
  currency_code: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseInvoiceListItem = PurchaseInvoiceRow & {
  vendor: { id: string; company_name: string; vendor_code: string } | null;
  purchase_order: { id: string; po_no: string } | null;
  project: { id: string; name: string } | null;
};

const SELECT =
  "*, vendor:vendors!purchase_invoices_vendor_id_fkey(id,company_name,vendor_code), purchase_order:purchase_orders!purchase_invoices_purchase_order_id_fkey(id,po_no), project:projects!purchase_invoices_project_id_fkey(id,name)";

export async function listPurchaseInvoices(
  query = "",
  status = "",
): Promise<PurchaseInvoiceListItem[]> {
  let q = getDb()
    .from("purchase_invoices" as never)
    .select(SELECT)
    .order("invoice_date", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`invoice_no.ilike.%${s}%,vendor_invoice_no.ilike.%${s}%,notes.ilike.%${s}%`);
  if (status) q = q.eq("status", status as PurchaseInvoiceStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseInvoiceListItem[];
}

export async function listPurchaseInvoicesForVendor(
  vendorId: string,
): Promise<PurchaseInvoiceListItem[]> {
  const { data, error } = await getDb()
    .from("purchase_invoices" as never)
    .select(SELECT)
    .eq("vendor_id" as never, vendorId as never)
    .order("invoice_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseInvoiceListItem[];
}

export async function getPurchaseInvoice(id: string): Promise<PurchaseInvoiceListItem | null> {
  const { data, error } = await getDb()
    .from("purchase_invoices" as never)
    .select(SELECT)
    .eq("id" as never, id as never)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as unknown as PurchaseInvoiceListItem | null) ?? null;
}

function toFieldPayload(p: ReturnType<typeof purchaseInvoiceCreateSchema.parse>) {
  return {
    vendor_invoice_no: p.vendor_invoice_no ?? null,
    vendor_id: p.vendor_id,
    purchase_order_id: p.purchase_order_id ?? null,
    project_id: p.project_id ?? null,
    status: p.status,
    invoice_date: p.invoice_date,
    due_date: p.due_date ?? null,
    subtotal: p.subtotal,
    tax_amount: p.tax_amount,
    other_charges: p.other_charges,
    total_amount: p.total_amount,
    currency_code: p.currency_code,
    notes: p.notes ?? null,
  };
}

export async function createPurchaseInvoice(
  input: PurchaseInvoiceCreateInput,
): Promise<PurchaseInvoiceRow> {
  const p = purchaseInvoiceCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("purchase_invoices" as never)
    .insert({ invoice_no: "", ...toFieldPayload(p) } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as PurchaseInvoiceRow;
}

export async function updatePurchaseInvoice(
  id: string,
  input: PurchaseInvoiceCreateInput,
): Promise<PurchaseInvoiceRow> {
  const p = purchaseInvoiceCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("purchase_invoices" as never)
    .update(toFieldPayload(p) as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as PurchaseInvoiceRow;
}

export async function deletePurchaseInvoice(id: string): Promise<void> {
  const { error } = await getDb()
    .from("purchase_invoices" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
