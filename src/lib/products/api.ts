/** Products data access. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { productCreateSchema, type ProductCreateInput } from "./schema";

export type ProductRow = DbTable<"products">;
export type ProductCategoryRow = DbTable<"product_categories">;
export type ProductImageRow = DbTable<"product_images">;

export async function listProducts(query = ""): Promise<ProductRow[]> {
  let q = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`name.ilike.%${s}%,product_code.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listProductCategories(): Promise<ProductCategoryRow[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listProductImages(productId: string): Promise<ProductImageRow[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createProduct(input: ProductCreateInput): Promise<ProductRow> {
  const parsed = productCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("products")
    .insert({
      product_code: "",
      name: parsed.name,
      stone_type: parsed.stone_type,
      default_unit: parsed.default_unit,
      finish: parsed.finish ?? null,
      category_id: parsed.category_id ?? null,
      thickness_mm: parsed.thickness_mm ?? null,
      origin_country: parsed.origin_country ?? null,
      hsn_code: parsed.hsn_code ?? null,
      description: parsed.description ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateProduct(id: string, input: ProductCreateInput): Promise<ProductRow> {
  const parsed = productCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("products")
    .update({
      name: parsed.name,
      stone_type: parsed.stone_type,
      default_unit: parsed.default_unit,
      finish: parsed.finish ?? null,
      category_id: parsed.category_id ?? null,
      thickness_mm: parsed.thickness_mm ?? null,
      origin_country: parsed.origin_country ?? null,
      hsn_code: parsed.hsn_code ?? null,
      description: parsed.description ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
