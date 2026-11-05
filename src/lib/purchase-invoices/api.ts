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
import { generateSearchTokens } from "@/lib/search-tokens";
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

  const tokens = generateSearchTokens(query);

  if (tokens.length > 0) {
    // 1. Resolve vendors matching search tokens/variants
    const vendorOrClauses = tokens.flatMap((tok) => [
      `company_name.ilike.%${tok}%`,
      `contact_person.ilike.%${tok}%`,
      `vendor_code.ilike.%${tok}%`,
      `mobile_number.ilike.%${tok}%`,
    ]);

    let matchedVendorIds: string[] = [];
    if (vendorOrClauses.length > 0) {
      try {
        const { data: vendorMatches } = await getDb()
          .from("vendors" as never)
          .select("id")
          .or(vendorOrClauses.join(","))
          .limit(50);
        if (vendorMatches && Array.isArray(vendorMatches)) {
          matchedVendorIds = (vendorMatches as { id: string }[]).map((v) => v.id);
        }
      } catch (err) {
        console.warn("[listPurchaseInvoices] vendor search note:", err);
      }
    }

    // 2. Build invoice search filter across invoice numbers, notes, and matched vendors
    const invoiceOrClauses: string[] = tokens.flatMap((tok) => [
      `invoice_no.ilike.%${tok}%`,
      `vendor_invoice_no.ilike.%${tok}%`,
      `notes.ilike.%${tok}%`,
    ]);

    if (matchedVendorIds.length > 0) {
      invoiceOrClauses.push(`vendor_id.in.(${matchedVendorIds.join(",")})`);
    }

    if (invoiceOrClauses.length > 0) {
      q = q.or(invoiceOrClauses.join(","));
    }
  }

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

export async function getPurchaseInvoice(idOrNo: string): Promise<PurchaseInvoiceListItem | null> {
  const trimmed = idOrNo.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  let query = getDb()
    .from("purchase_invoices" as never)
    .select(SELECT);
  if (isUuid) {
    query = query.eq("id" as never, trimmed as never);
  } else {
    query = query.or(`invoice_no.eq.${trimmed},vendor_invoice_no.eq.${trimmed}` as never);
  }
  const { data, error } = await query.maybeSingle();
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
