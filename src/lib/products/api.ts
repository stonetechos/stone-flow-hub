/** Products data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { productCreateSchema, type ProductCreateInput } from "./schema";

export type ProductRow = DbTable<"products">;
export type ProductCategoryRow = DbTable<"product_categories">;
export type ProductImageRow = DbTable<"product_images">;

export async function listProducts(query = ""): Promise<ProductRow[]> {
  let q = getDb().from("products").select("*").order("created_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) {
    q = q.or(
      [
        `name.ilike.%${s}%`,
        `product_code.ilike.%${s}%`,
        `hsn_code.ilike.%${s}%`,
        `stone_type.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));

  // Auto-seed: If the table is completely empty on initial load, auto-seed via server function
  if (!s && (!data || data.length === 0)) {
    try {
      const { seedDefaultProductsServerFn } = await import("./products.functions");
      const res = await seedDefaultProductsServerFn();
      if (res && res.seeded > 0) {
        const { data: refetched } = await getDb()
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        return refetched ?? [];
      }
    } catch (e) {
      console.warn("[products.api] auto-seed notice:", e);
    }
  }

  return data ?? [];
}

export async function listProductCategories(): Promise<ProductCategoryRow[]> {
  const { data, error } = await getDb()
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const { data, error } = await getDb().from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

/** Bulk name lookup for a set of product ids — used by Quote Comparison
 *  to label a product-linked line item by its real product name rather
 *  than whatever free-text description happened to be typed on that
 *  particular quote. */
export async function getProductsByIds(ids: string[]): Promise<Pick<ProductRow, "id" | "name">[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getDb().from("products").select("id, name").in("id", ids);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listProductImages(productId: string): Promise<ProductImageRow[]> {
  const { data, error } = await getDb()
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createProduct(input: ProductCreateInput): Promise<ProductRow> {
  const parsed = productCreateSchema.parse(input);
  const { data, error } = await getDb()
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
  const { data, error } = await getDb()
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
  const { error } = await getDb().from("products").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/** Seeds the 29 standard architectural natural stone products if missing. */
export async function seedDefaultProducts(): Promise<{ seeded: number }> {
  try {
    const { seedDefaultProductsServerFn } = await import("./products.functions");
    const res = await seedDefaultProductsServerFn();
    if (res && typeof res.seeded === "number") {
      return { seeded: res.seeded };
    }
  } catch (serverErr) {
    console.warn("[products.api] seed server function failed, falling back to client:", serverErr);
  }

  const { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_NATURAL_STONE_PRODUCTS } =
    await import("./default-catalog");
  const db = getDb();

  // 1. Ensure categories exist
  const catMap = new Map<string, string>();
  for (const cat of DEFAULT_PRODUCT_CATEGORIES) {
    const { data: existing } = await db
      .from("product_categories")
      .select("id, slug")
      .eq("slug", cat.slug)
      .maybeSingle();

    if (existing?.id) {
      catMap.set(cat.slug, existing.id);
    } else {
      const { data: created, error } = await db
        .from("product_categories")
        .insert({
          name: cat.name,
          slug: cat.slug,
          sort_order: cat.sort_order,
          is_active: true,
        })
        .select("id, slug")
        .maybeSingle();
      if (!error && created?.id) {
        catMap.set(cat.slug, created.id);
      }
    }
  }

  // 2. Fetch existing product names to avoid duplicates
  const { data: existingProducts } = await db.from("products").select("name");
  const existingNames = new Set(
    (existingProducts ?? []).map((p) => (p.name || "").trim().toLowerCase()),
  );

  let seeded = 0;
  for (const item of DEFAULT_NATURAL_STONE_PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase())) continue;

    const categoryId = catMap.get(item.categorySlug) ?? null;
    const { error } = await db.from("products").insert({
      product_code: "", // Database trigger assigns PRD-XXXX
      name: item.name,
      category_id: categoryId,
      stone_type: item.stoneType,
      finish: item.finish,
      thickness_mm: item.thicknessMm,
      default_unit: item.defaultUnit,
      hsn_code: item.hsnCode,
      description: item.description,
      is_active: true,
    });

    if (!error) {
      seeded++;
    }
  }

  return { seeded };
}
