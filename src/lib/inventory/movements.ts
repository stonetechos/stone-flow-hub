import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { z } from "zod";

export const MOVEMENT_TYPES = [
  "opening",
  "purchase_receipt",
  "production_consumption",
  "transfer",
  "adjustment",
  "return",
  "dispatch",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type InventoryMovementRow = {
  id: string;
  inventory_item_id: string | null;
  product_id: string | null;
  movement_type: MovementType;
  direction: "in" | "out";
  quantity: number;
  unit: string | null;
  from_location: string | null;
  to_location: string | null;
  source_type: string | null;
  source_id: string | null;
  ref_no: string | null;
  notes: string | null;
  moved_at: string;
  created_at: string;
};

export type InventoryMovementListItem = InventoryMovementRow & {
  product: { id: string; name: string; product_code: string } | null;
};

export const movementCreateSchema = z.object({
  inventory_item_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  movement_type: z.enum(MOVEMENT_TYPES),
  direction: z.enum(["in", "out"]),
  quantity: z.number().positive(),
  unit: z.string().nullable().optional(),
  from_location: z.string().nullable().optional(),
  to_location: z.string().nullable().optional(),
  ref_no: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type MovementCreateInput = z.infer<typeof movementCreateSchema>;

export async function listMovements(
  params: {
    productId?: string | null;
    inventoryItemId?: string | null;
    limit?: number;
  } = {},
): Promise<InventoryMovementListItem[]> {
  let q = supabase
    .from("inventory_movements" as never)
    .select("*, product:products!inventory_movements_product_id_fkey(id,name,product_code)")
    .order("moved_at", { ascending: false })
    .limit(params.limit ?? 200);
  if (params.productId) q = q.eq("product_id", params.productId);
  if (params.inventoryItemId) q = q.eq("inventory_item_id", params.inventoryItemId);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InventoryMovementListItem[];
}

export async function createManualMovement(
  input: MovementCreateInput,
): Promise<InventoryMovementRow> {
  const p = movementCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("inventory_movements" as never)
    .insert({
      ...p,
      source_type: "manual",
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InventoryMovementRow;
}

export type StockLedgerRow = {
  product_id: string | null;
  inventory_item_id: string | null;
  on_hand: number;
  last_moved_at: string | null;
};

export async function stockOnHandByProduct(): Promise<StockLedgerRow[]> {
  const { data, error } = await supabase
    .from("inventory_stock_ledger" as never)
    .select("*")
    .order("last_moved_at", { ascending: false })
    .limit(500);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as StockLedgerRow[];
}
