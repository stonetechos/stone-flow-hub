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

export interface SyncProductPayload {
  id: string; // ST-WC-xxx or custom
  name: string;
  price: number;
  unit?: string;
  mrp?: number;
  category?: string;
  stoneType?: string;
  description?: string;
  thickness?: string;
  image?: string;
}

export const syncWebsiteProductToErpServerFn = createServerFn({ method: "POST" })
  .validator((data: SyncProductPayload) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Standardize unit
    let unit: "sqft" | "sqm" | "nos" | "running_ft" | "tonne" | "kg" | "brass" = "sqft";
    const u = (data.unit || "").toLowerCase();
    if (u.includes("sq.m") || u.includes("sqm")) unit = "sqm";
    else if (u.includes("piece") || u.includes("tile") || u.includes("box") || u.includes("nos"))
      unit = "nos";
    else if (u.includes("run") || u.includes("rft")) unit = "running_ft";

    // Standardize stone type
    let stoneType: string | null = null;
    const st = (data.stoneType || "").toLowerCase();
    if (st.includes("marble")) stoneType = "marble";
    else if (st.includes("granite")) stoneType = "granite";
    else if (st.includes("sandstone")) stoneType = "sandstone";
    else if (st.includes("quartzite")) stoneType = "quartzite";
    else if (st.includes("limestone")) stoneType = "limestone";
    else if (st.includes("slate")) stoneType = "slate";
    else if (st.includes("basalt")) stoneType = "basalt";
    else if (st.includes("travertine")) stoneType = "travertine";
    else if (st.includes("onyx")) stoneType = "onyx";
    else stoneType = "other";

    // Standardize code
    const code = data.id.startsWith("ST-") ? data.id : `ST-${data.id}`;

    // 1. Check if product already exists by product_code or exact name
    const { data: existing } = await supabaseAdmin
      .from("products" as never)
      .select("id, name, product_code" as never)
      .or(`product_code.eq.${code},name.ilike.%${data.name.trim()}%` as never)
      .maybeSingle();

    if (existing && (existing as { id?: string }).id) {
      const existingId = (existing as { id: string }).id;
      // Update name, prices, and specs in Supabase products table
      const { error: updErr } = await supabaseAdmin
        .from("products" as never)
        .update({
          name: data.name.trim(),
          last_selling_price_inr: data.price,
          market_price_inr: data.mrp || Math.round(data.price * 1.25),
          default_unit: unit,
          stone_type: stoneType,
          description: data.description || `${data.name} - ${data.category || "Wall Cladding"}`,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id" as never, existingId as never);

      if (updErr) {
        console.warn("[syncWebsiteProductToErp] update error:", updErr);
        throw new Error(updErr.message);
      }

      return {
        success: true,
        action: "updated",
        productId: existingId,
        productCode: (existing as { product_code?: string }).product_code || code,
      };
    } else {
      // 2. Insert new product
      const { data: created, error: insErr } = await supabaseAdmin
        .from("products" as never)
        .insert({
          product_code: code,
          name: data.name.trim(),
          stone_type: stoneType,
          default_unit: unit,
          last_selling_price_inr: data.price,
          market_price_inr: data.mrp || Math.round(data.price * 1.25),
          description: data.description || `${data.name} - ${data.category || "Wall Cladding"}`,
          is_active: true,
          hsn_code: "68022190",
        } as never)
        .select("id, product_code" as never)
        .maybeSingle();

      if (insErr) {
        console.warn("[syncWebsiteProductToErp] insert error:", insErr);
        throw new Error(insErr.message);
      }

      return {
        success: true,
        action: "created",
        productId: (created as unknown as { id?: string })?.id,
        productCode: code,
      };
    }
  });
