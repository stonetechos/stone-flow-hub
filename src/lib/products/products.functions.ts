/**
 * Server functions for Products management.
 *
 * Runs on the server with supabaseAdmin (service role) to guarantee that
 * natural stone products can be seeded and managed without client-side RLS
 * or sequence permission issues.
 */
import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_NATURAL_STONE_PRODUCTS } from "./default-catalog";

export const seedDefaultProductsServerFn = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Ensure categories exist in product_categories
  const catMap = new Map<string, string>();
  for (const cat of DEFAULT_PRODUCT_CATEGORIES) {
    const { data: existing } = await supabaseAdmin
      .from("product_categories" as never)
      .select("id, slug" as never)
      .eq("slug" as never, cat.slug as never)
      .maybeSingle();

    if (existing && (existing as { id?: string }).id) {
      catMap.set(cat.slug, (existing as { id: string }).id);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("product_categories" as never)
        .insert({
          name: cat.name,
          slug: cat.slug,
          sort_order: cat.sort_order,
          is_active: true,
        } as never)
        .select("id, slug" as never)
        .maybeSingle();

      if (!error && created && (created as { id?: string }).id) {
        catMap.set(cat.slug, (created as { id: string }).id);
      }
    }
  }

  // 2. Fetch existing products
  const { data: existingProducts } = await supabaseAdmin
    .from("products" as never)
    .select("id, name, product_code" as never);

  const existingNames = new Set(
    ((existingProducts as Array<{ name?: string }>) ?? []).map((p) =>
      (p.name || "").trim().toLowerCase(),
    ),
  );

  let seeded = 0;
  for (let i = 0; i < DEFAULT_NATURAL_STONE_PRODUCTS.length; i++) {
    const item = DEFAULT_NATURAL_STONE_PRODUCTS[i];
    if (existingNames.has(item.name.toLowerCase())) continue;

    const categoryId = catMap.get(item.categorySlug) ?? null;
    const code = `PRD-${String(i + 1).padStart(4, "0")}`;

    const { error } = await supabaseAdmin.from("products" as never).insert({
      product_code: code,
      name: item.name,
      category_id: categoryId,
      stone_type: item.stoneType,
      finish: item.finish,
      thickness_mm: item.thicknessMm,
      default_unit: item.defaultUnit,
      hsn_code: item.hsnCode,
      description: item.description,
      is_active: true,
    } as never);

    if (!error) {
      seeded++;
      existingNames.add(item.name.toLowerCase());
    }
  }

  const { count } = await supabaseAdmin
    .from("products" as never)
    .select("*" as never, { count: "exact", head: true } as never);

  return {
    seeded,
    total: count ?? existingNames.size,
  };
});
