import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import {
  salesOrderCreateSchema,
  type SalesOrderCreateInput,
  type SalesOrderStatus,
} from "./schema";

export type SalesOrderRow = DbTable<"sales_orders">;
export type SalesOrderListItem = SalesOrderRow & {
  customer: { id: string; name: string; customer_code: string } | null;
  project: { id: string; name: string; project_code: string } | null;
  quote: {
    id: string;
    quote_no: string;
    status: DbTable<"quotes">["status"];
    enquiry_id: string | null;
  } | null;
};

const SELECT =
  "*, customer:customers!sales_orders_customer_id_fkey(id,name,customer_code), project:projects!sales_orders_project_id_fkey(id,name,project_code), quote:quotes!sales_orders_quote_id_fkey(id,quote_no,status,enquiry_id)";

export async function listSalesOrders(query = "", status = ""): Promise<SalesOrderListItem[]> {
  let q = getDb()
    .from("sales_orders")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`so_no.ilike.%${s}%,notes.ilike.%${s}%`);
  if (status) q = q.eq("status", status as SalesOrderStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as SalesOrderListItem[];
}

export async function getSalesOrder(id: string): Promise<SalesOrderListItem | null> {
  const { data, error } = await getDb()
    .from("sales_orders")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as SalesOrderListItem | null) ?? null;
}

export async function createSalesOrder(input: SalesOrderCreateInput): Promise<SalesOrderRow> {
  const p = salesOrderCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("sales_orders")
    .insert({
      so_no: "",
      quote_id: p.quote_id ?? null,
      project_id: p.project_id ?? null,
      customer_id: p.customer_id ?? null,
      status: p.status,
      order_date: p.order_date,
      delivery_date: p.delivery_date ?? null,
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateSalesOrder(
  id: string,
  input: SalesOrderCreateInput,
): Promise<SalesOrderRow> {
  const p = salesOrderCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("sales_orders")
    .update({
      quote_id: p.quote_id ?? null,
      project_id: p.project_id ?? null,
      customer_id: p.customer_id ?? null,
      status: p.status,
      order_date: p.order_date,
      delivery_date: p.delivery_date ?? null,
      notes: p.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteSalesOrder(id: string): Promise<void> {
  const { error } = await getDb().from("sales_orders").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function listSalesOrdersForPicker(): Promise<
  Array<Pick<SalesOrderRow, "id" | "so_no">>
> {
  const { data, error } = await getDb()
    .from("sales_orders")
    .select("id,so_no")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Sales order line items (independent snapshot)                       */
/* ------------------------------------------------------------------ */
export type SalesOrderItemRow = DbTable<"sales_order_items">;

export async function listSalesOrderItems(salesOrderId: string): Promise<SalesOrderItemRow[]> {
  const { data, error } = await getDb()
    .from("sales_order_items")
    .select("*")
    .eq("sales_order_id", salesOrderId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export type SalesOrderItemPatch = Partial<{
  product_id: string | null;
  product_name: string | null;
  description: string;
  category: string | null;
  stone_type: string | null;
  finish: string | null;
  size: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  fulfilment: string | null;
  sort_order: number;
}>;

export async function addSalesOrderItem(
  salesOrderId: string,
  patch: SalesOrderItemPatch & { description: string; quantity: number; unit_price: number },
): Promise<SalesOrderItemRow> {
  const { data: existing, error: exErr } = await getDb()
    .from("sales_order_items")
    .select("sort_order")
    .eq("sales_order_id", salesOrderId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (exErr) throw new AppError(mapDbError(exErr));
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await getDb()
    .from("sales_order_items")
    .insert({
      sales_order_id: salesOrderId,
      sort_order: patch.sort_order ?? nextSort,
      ...patch,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateSalesOrderItem(
  itemId: string,
  patch: SalesOrderItemPatch,
): Promise<SalesOrderItemRow> {
  const { data, error } = await getDb()
    .from("sales_order_items")
    .update(patch as never)
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteSalesOrderItem(itemId: string): Promise<void> {
  const { error } = await getDb().from("sales_order_items").delete().eq("id", itemId);
  if (error) throw new AppError(mapDbError(error));
}
