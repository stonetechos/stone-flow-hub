import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/integrations/supabase/server-context";
import { listAttachments } from "@/lib/attachments/api";
import { FILES_BUCKET } from "@/lib/constants";
import type { QuoteItemRow, QuoteListItem } from "./api";

export interface ResolvedQuoteImage {
  itemId?: string;
  label: string;
  url: string;
  source: "line_item" | "wall_estimate" | "master_product" | "attachment";
}

/**
 * Extracts all product images associated with a quotation and its line items.
 * Checks:
 * 1. workflow_state.line_item_images
 * 2. wall_estimate.products[].imageDataUrl
 * 3. Master product catalog images (product_images table) for items with product_id
 * 4. File attachments on the quote with image/* mime types
 */
export async function resolveAllQuoteImages(
  quote: QuoteListItem | null | undefined,
  items: QuoteItemRow[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>(); // itemId or description -> image url/dataUrl
  if (!quote) return imageMap;

  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  const lineItemImages = (wf.line_item_images as Record<string, string> | null) ?? {};

  // 1. Explicit line item images stored in workflow_state
  for (const [key, url] of Object.entries(lineItemImages)) {
    if (url) {
      imageMap.set(key, url);
    }
  }

  // 2. Wall estimate worksheet photos (from Wall Cladding Calculator / Estimate Studio)
  const we = (quote.wall_estimate as Record<string, unknown> | null) ?? {};
  const products = Array.isArray(we.products)
    ? (we.products as Array<{ productName?: string; imageDataUrl?: string; id?: string }>)
    : [];

  for (const p of products) {
    if (p.imageDataUrl) {
      if (p.productName) {
        imageMap.set(p.productName.trim().toLowerCase(), p.imageDataUrl);
      }
      if (p.id) {
        imageMap.set(p.id, p.imageDataUrl);
      }
    }
  }

  // 3. Master product catalog images (product_images table)
  const productIds = items.map((it) => it.product_id).filter(Boolean) as string[];
  if (productIds.length > 0) {
    try {
      const { data: prodImgs } = await getDb()
        .from("product_images")
        .select("product_id, url, is_primary")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false });

      if (prodImgs) {
        for (const pi of prodImgs) {
          if (pi.url && !imageMap.has(pi.product_id)) {
            imageMap.set(pi.product_id, pi.url);
          }
        }
      }
    } catch {
      // Safe fallback if product_images query fails
    }
  }

  // 4. Quote image attachments
  try {
    const attachments = await listAttachments("quote", quote.id);
    const imageAttachments = attachments.filter((f) => f.mime_type?.startsWith("image/"));
    for (const att of imageAttachments) {
      let url: string | null = null;
      try {
        const { data: signed } = await supabase.storage
          .from(att.bucket || FILES_BUCKET)
          .createSignedUrl(att.object_path, 3600 * 24);
        url = signed?.signedUrl ?? null;
      } catch {
        // Fallback to public URL
        const { data } = supabase.storage
          .from(att.bucket || FILES_BUCKET)
          .getPublicUrl(att.object_path);
        url = data?.publicUrl ?? null;
      }

      if (url) {
        imageMap.set(`att_${att.id}`, url);
        if (att.file_name) {
          imageMap.set(`file_${att.file_name.toLowerCase()}`, url);
        }
      }
    }
  } catch {
    // Safe fallback if attachments query fails
  }

  return imageMap;
}

export interface QuoteGalleryImage {
  id: string;
  url: string;
  label: string;
  source: string;
}

export function getQuoteGalleryImages(
  items: QuoteItemRow[],
  imageMap: Map<string, string>,
): QuoteGalleryImage[] {
  const seenUrls = new Set<string>();
  const gallery: QuoteGalleryImage[] = [];

  for (const it of items) {
    const url = getLineItemImage(it, imageMap);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      gallery.push({
        id: it.id,
        url,
        label: it.description,
        source: "Line Item",
      });
    }
  }

  for (const [key, url] of imageMap.entries()) {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      gallery.push({
        id: key,
        url,
        label: key.startsWith("att_") || key.startsWith("file_") ? "Attached Spec / Sample" : key,
        source: "Visuals",
      });
    }
  }

  return gallery;
}

/**
 * Resolves the best available image URL or dataUrl for a specific quote item
 */
export function getLineItemImage(
  item: QuoteItemRow | { id?: string; description?: string; product_id?: string | null },
  imageMap: Map<string, string>,
): string | null {
  if (item.id) {
    if (imageMap.has(item.id)) return imageMap.get(item.id)!;
    if (imageMap.has(item.id.toLowerCase())) return imageMap.get(item.id.toLowerCase())!;
  }

  if (item.product_id) {
    if (imageMap.has(item.product_id)) return imageMap.get(item.product_id)!;
    if (imageMap.has(item.product_id.toLowerCase()))
      return imageMap.get(item.product_id.toLowerCase())!;
  }

  if (item.description) {
    const descLower = item.description.trim().toLowerCase();
    if (imageMap.has(descLower)) {
      return imageMap.get(descLower)!;
    }
    // Partial search for product names in description (e.g. "Mint Sandstone" inside "Natural Stone Interlocking Panels — Mint Sandstone (Wall 1)")
    for (const [key, url] of imageMap.entries()) {
      if (!key.startsWith("att_") && !key.startsWith("file_") && key.length > 3) {
        if (descLower.includes(key) || key.includes(descLower)) {
          return url;
        }
      }
    }
  }

  return null;
}
