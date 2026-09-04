/**
 * Purchase Transportation — inbound-from-vendor shipment tracking, keyed to
 * Purchase Order. Purchase-side mirror of src/lib/dispatch/api.ts. See the
 * migration's header comment (20260904160000_purchase_transportation.sql)
 * for why this has no "remaining to transport" quantity calculation the
 * way Dispatch has for sales orders — Purchase Orders have no line-item
 * table of their own to compute a remaining balance against.
 *
 * New tables, not yet in the generated Database type — same `as never`
 * cast pattern used by src/lib/purchase-invoices/api.ts and
 * src/lib/grns/api.ts (every `.from()`, `.eq()`, `.insert()`, `.update()`
 * needs its own cast once the table isn't a known relation, or `tsc`
 * fails with "not assignable to type 'never'"), combined with getDb()
 * (request-scoped, auth-context-safe client) per the current
 * best-practice pattern.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import {
  purchaseTransportCreateSchema,
  purchaseTransportItemInputSchema,
  type PurchaseTransportCreateInput,
  type PurchaseTransportItemInput,
  type PurchaseTransportStatus,
} from "./schema";

export type PurchaseTransportRow = {
  id: string;
  transport_no: string;
  purchase_order_id: string | null;
  vendor_id: string | null;
  project_id: string | null;
  carting_agency_id: string | null;
  status: PurchaseTransportStatus;
  transport_date: string;
  vehicle_no: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  lr_no: string | null;
  delivered_by: string | null;
  received_by: string | null;
  freight_amount: number;
  amount_paid: number;
  balance_due: number;
  remarks: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseTransportListItem = PurchaseTransportRow & {
  purchase_order: { id: string; po_no: string } | null;
  vendor: { id: string; company_name: string } | null;
  project: { id: string; name: string } | null;
  carting_agency: { id: string; name: string } | null;
};

export type PurchaseTransportItemRow = {
  id: string;
  purchase_transportation_id: string;
  product_id: string | null;
  product_name: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  sort_order: number;
  created_at: string;
};

export type CartingAgencyRow = {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  vehicle_type: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

const SELECT =
  "*, purchase_order:purchase_orders!purchase_transportation_purchase_order_id_fkey(id,po_no), vendor:vendors!purchase_transportation_vendor_id_fkey(id,company_name), project:projects!purchase_transportation_project_id_fkey(id,name), carting_agency:carting_agencies!purchase_transportation_carting_agency_id_fkey(id,name)";

function toPayload(p: PurchaseTransportCreateInput) {
  return {
    purchase_order_id: p.purchase_order_id ?? null,
    vendor_id: p.vendor_id ?? null,
    project_id: p.project_id ?? null,
    carting_agency_id: p.carting_agency_id ?? null,
    status: p.status,
    transport_date: p.transport_date,
    vehicle_no: p.vehicle_no ?? null,
    driver_name: p.driver_name ?? null,
    driver_phone: p.driver_phone ?? null,
    lr_no: p.lr_no ?? null,
    delivered_by: p.delivered_by ?? null,
    received_by: p.received_by ?? null,
    freight_amount: Number(p.freight_amount ?? 0),
    amount_paid: Number(p.amount_paid ?? 0),
    remarks: p.remarks ?? null,
    notes: p.notes ?? null,
  };
}

export async function listPurchaseTransportation(
  query = "",
  status = "",
): Promise<PurchaseTransportListItem[]> {
  let q = getDb()
    .from("purchase_transportation" as never)
    .select(SELECT)
    .order("transport_date", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s)
    q = q.or(
      `transport_no.ilike.%${s}%,vehicle_no.ilike.%${s}%,lr_no.ilike.%${s}%,notes.ilike.%${s}%,remarks.ilike.%${s}%`,
    );
  if (status) q = q.eq("status" as never, status as PurchaseTransportStatus as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseTransportListItem[];
}

export async function listPurchaseTransportationByPO(
  poId: string,
): Promise<PurchaseTransportListItem[]> {
  const { data, error } = await getDb()
    .from("purchase_transportation" as never)
    .select(SELECT)
    .eq("purchase_order_id" as never, poId as never)
    .order("transport_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseTransportListItem[];
}

export async function listPurchaseTransportationByVendor(
  vendorId: string,
): Promise<PurchaseTransportListItem[]> {
  const { data, error } = await getDb()
    .from("purchase_transportation" as never)
    .select(SELECT)
    .eq("vendor_id" as never, vendorId as never)
    .order("transport_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseTransportListItem[];
}

export async function getPurchaseTransportation(
  id: string,
): Promise<PurchaseTransportListItem | null> {
  const { data, error } = await getDb()
    .from("purchase_transportation" as never)
    .select(SELECT)
    .eq("id" as never, id as never)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as unknown as PurchaseTransportListItem | null) ?? null;
}

export async function createPurchaseTransportation(
  input: PurchaseTransportCreateInput,
): Promise<PurchaseTransportRow> {
  const p = purchaseTransportCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("purchase_transportation" as never)
    .insert({ transport_no: "", ...toPayload(p) } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as PurchaseTransportRow;
}

export async function updatePurchaseTransportation(
  id: string,
  input: PurchaseTransportCreateInput,
): Promise<PurchaseTransportRow> {
  const p = purchaseTransportCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("purchase_transportation" as never)
    .update(toPayload(p) as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as PurchaseTransportRow;
}

export async function deletePurchaseTransportation(id: string): Promise<void> {
  const { error } = await getDb()
    .from("purchase_transportation" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}

export async function listPurchaseTransportationItems(
  transportId: string,
): Promise<PurchaseTransportItemRow[]> {
  const { data, error } = await getDb()
    .from("purchase_transportation_items" as never)
    .select("*")
    .eq("purchase_transportation_id" as never, transportId as never)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PurchaseTransportItemRow[];
}

/** Replace-all: deletes existing rows for this shipment, then inserts the given set. */
export async function replacePurchaseTransportationItems(
  transportId: string,
  items: PurchaseTransportItemInput[],
): Promise<void> {
  const parsed = items.map((it) => purchaseTransportItemInputSchema.parse(it));
  const db = getDb();
  const { error: delErr } = await db
    .from("purchase_transportation_items" as never)
    .delete()
    .eq("purchase_transportation_id" as never, transportId as never);
  if (delErr) throw new AppError(mapDbError(delErr));
  if (parsed.length === 0) return;
  const { error: insErr } = await db.from("purchase_transportation_items" as never).insert(
    parsed.map((it, idx) => ({
      purchase_transportation_id: transportId,
      product_id: it.product_id ?? null,
      product_name: it.product_name ?? null,
      description: it.description,
      unit: it.unit ?? null,
      quantity: Number(it.quantity ?? 0),
      sort_order: it.sort_order ?? idx,
    })) as never,
  );
  if (insErr) throw new AppError(mapDbError(insErr));
}

/* ------------------------------------------------------------------ */
/* Carting Agencies (master data) — small table, plain CRUD, no        */
/* MasterListPage reuse: that shared component's typed .from() call    */
/* only accepts tables already in the generated Database type, and     */
/* carting_agencies is brand new (same reason purchase_invoices etc.   */
/* use the as-never cast pattern above rather than DbTable<...>).      */
/* ------------------------------------------------------------------ */

export async function listCartingAgencies(activeOnly = true): Promise<CartingAgencyRow[]> {
  let q = getDb()
    .from("carting_agencies" as never)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  if (activeOnly) q = q.eq("is_active" as never, true as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as CartingAgencyRow[];
}

export interface CartingAgencyInput {
  code: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export async function createCartingAgency(input: CartingAgencyInput): Promise<CartingAgencyRow> {
  const { data, error } = await getDb()
    .from("carting_agencies" as never)
    .insert({
      code: input.code,
      name: input.name,
      contact_person: input.contact_person ?? null,
      phone: input.phone ?? null,
      vehicle_type: input.vehicle_type ?? null,
      notes: input.notes ?? null,
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 100,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CartingAgencyRow;
}

export async function updateCartingAgency(
  id: string,
  input: CartingAgencyInput,
): Promise<CartingAgencyRow> {
  const { data, error } = await getDb()
    .from("carting_agencies" as never)
    .update({
      code: input.code,
      name: input.name,
      contact_person: input.contact_person ?? null,
      phone: input.phone ?? null,
      vehicle_type: input.vehicle_type ?? null,
      notes: input.notes ?? null,
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 100,
    } as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CartingAgencyRow;
}

export async function deleteCartingAgency(id: string): Promise<void> {
  const { error } = await getDb()
    .from("carting_agencies" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
