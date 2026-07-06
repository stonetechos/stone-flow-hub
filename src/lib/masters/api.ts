/**
 * Stone-industry master data — Stone Types, Surface Finishes, Edge Finishes,
 * Product Families, Manufacturing Stages.
 *
 * Every fetcher supports a text search (used by EntityPicker) and returns
 * rows sorted by (sort_order, name). Writes are staff-gated at the DB.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StoneType = Database["public"]["Tables"]["stone_types"]["Row"];
export type SurfaceFinish = Database["public"]["Tables"]["surface_finishes"]["Row"];
export type EdgeFinish = Database["public"]["Tables"]["edge_finishes"]["Row"];
export type ProductFamily = Database["public"]["Tables"]["product_families"]["Row"];
export type ManufacturingStage = Database["public"]["Tables"]["manufacturing_stages"]["Row"];

type MasterTable =
  | "stone_types"
  | "surface_finishes"
  | "edge_finishes"
  | "product_families"
  | "manufacturing_stages";

async function listMaster<T>(
  table: MasterTable,
  q: string,
  extraCols = "*",
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select(extraCols)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  if (q.trim()) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

async function getMaster<T>(table: MasterTable, id: string): Promise<T | null> {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as T | null;
}

// Stone types
export const listStoneTypes = (q = "") => listMaster<StoneType>("stone_types", q);
export const getStoneType = (id: string) => getMaster<StoneType>("stone_types", id);

// Surface finishes
export const listSurfaceFinishes = (q = "") =>
  listMaster<SurfaceFinish>("surface_finishes", q);
export const getSurfaceFinish = (id: string) =>
  getMaster<SurfaceFinish>("surface_finishes", id);

// Edge finishes
export const listEdgeFinishes = (q = "") => listMaster<EdgeFinish>("edge_finishes", q);
export const getEdgeFinish = (id: string) => getMaster<EdgeFinish>("edge_finishes", id);

// Product families
export const listProductFamilies = (q = "") =>
  listMaster<ProductFamily>("product_families", q);
export const getProductFamily = (id: string) =>
  getMaster<ProductFamily>("product_families", id);

// Manufacturing stages — always returned in workflow order
export async function listManufacturingStages(): Promise<ManufacturingStage[]> {
  const { data, error } = await supabase
    .from("manufacturing_stages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export const getManufacturingStage = (id: string) =>
  getMaster<ManufacturingStage>("manufacturing_stages", id);
