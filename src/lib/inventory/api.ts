import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { inventoryCreateSchema, type InventoryCreateInput } from "./schema";

export type InventoryRow = DbTable<"inventory_items">;
export type InventoryListItem = InventoryRow & {
  product: { id: string; name: string; product_code: string } | null;
};

const SELECT = "*, product:products!inventory_items_product_id_fkey(id,name,product_code)";

export async function listInventory(query = ""): Promise<InventoryListItem[]> {
  let q = getDb()
    .from("inventory_items")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`stock_code.ilike.%${s}%,location.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InventoryListItem[];
}

export async function getInventoryItem(id: string): Promise<InventoryListItem | null> {
  const { data, error } = await getDb()
    .from("inventory_items")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as InventoryListItem | null) ?? null;
}

export async function createInventoryItem(input: InventoryCreateInput): Promise<InventoryRow> {
  const p = inventoryCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("inventory_items")
    .insert({
      stock_code: "",
      product_id: p.product_id ?? null,
      location: p.location ?? null,
      unit: p.unit ?? null,
      quantity_on_hand: p.quantity_on_hand,
      reorder_level: p.reorder_level,
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateInventoryItem(
  id: string,
  input: InventoryCreateInput,
): Promise<InventoryRow> {
  const p = inventoryCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("inventory_items")
    .update({
      product_id: p.product_id ?? null,
      location: p.location ?? null,
      unit: p.unit ?? null,
      quantity_on_hand: p.quantity_on_hand,
      reorder_level: p.reorder_level,
      notes: p.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await getDb().from("inventory_items").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
