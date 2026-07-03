import { supabase } from "@/integrations/supabase/client";
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
  quote: { id: string; quote_no: string; status: DbTable<"quotes">["status"] } | null;
};

const SELECT =
  "*, customer:customers!sales_orders_customer_id_fkey(id,name,customer_code), project:projects!sales_orders_project_id_fkey(id,name,project_code), quote:quotes!sales_orders_quote_id_fkey(id,quote_no,status)";

export async function listSalesOrders(query = "", status = ""): Promise<SalesOrderListItem[]> {
  let q = supabase
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
  const { data, error } = await supabase
    .from("sales_orders")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as SalesOrderListItem | null) ?? null;
}

export async function createSalesOrder(input: SalesOrderCreateInput): Promise<SalesOrderRow> {
  const p = salesOrderCreateSchema.parse(input);
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { error } = await supabase.from("sales_orders").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function listSalesOrdersForPicker(): Promise<
  Array<Pick<SalesOrderRow, "id" | "so_no">>
> {
  const { data, error } = await supabase
    .from("sales_orders")
    .select("id,so_no")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
