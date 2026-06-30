import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { productCreateSchema, type ProductCreateInput } from "./schema";

export type Product = DbTable<"products">;
export type ProductCategory = DbTable<"product_categories">;
export type ProductWithCategory = Product & { category: Pick<ProductCategory, "id" | "name"> | null };

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listProducts(query?: string): Promise<ProductWithCategory[]> {
  let q = supabase
    .from("products")
    .select("*, category:product_categories(id, name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query && query.trim()) {
    const t = `%${query.trim()}%`;
    q = q.or(`name.ilike.${t},code.ilike.${t},finish.ilike.${t},origin.ilike.${t}`);
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as ProductWithCategory[];
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  const parsed = productCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: parsed.name,
      category_id: parsed.category_id,
      unit: parsed.unit,
      finish: parsed.finish ?? null,
      thickness_mm: parsed.thickness_mm ?? null,
      origin: parsed.origin ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
