import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/integrations/supabase/server-context";
import { listAttachments } from "@/lib/attachments/api";
import { FILES_BUCKET } from "@/lib/constants";
import rawCatalogData from "@/data/wall-cladding-catalog.json";
import type { QuoteItemRow, QuoteListItem } from "./api";

export interface ResolvedQuoteImage {
  itemId?: string;
  label: string;
  url: string;
  source: "line_item" | "wall_estimate" | "master_product" | "attachment" | "catalog";
}

export type ResolvableQuote = {
  id?: string;
  quote_no?: string;
  workflow_state?: unknown;
  wall_estimate?: unknown;
};

export type ResolvableQuoteItem = {
  id?: string;
  product_id?: string | null;
  description?: string | null;
};

export type ResolvableInvoice = {
  id?: string;
  invoice_no?: string;
  quote_id?: string | null;
  sales_order_id?: string | null;
  workflow_state?: unknown;
};

export type ResolvableInvoiceItem = {
  id?: string;
  product_id?: string | null;
  description?: string | null;
};

/**
 * Extracts all product images associated with a quotation and its line items.
 * Checks:
 * 1. workflow_state.line_item_images & workflow_state.line_item_multi_images
 * 2. wall_estimate.products[].imageDataUrl
 * 3. Master product catalog images (product_images table) for items with product_id
 * 4. Stone Tech official catalog matching by product name or code
 * 5. File attachments on the quote with image/* mime types
 */
export async function resolveAllQuoteImages(
  quote: ResolvableQuote | QuoteListItem | null | undefined,
  items: ResolvableQuoteItem[] | QuoteItemRow[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>(); // itemId or description -> image url/dataUrl
  if (!quote) return imageMap;

  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  const lineItemImages = (wf.line_item_images as Record<string, string | string[]> | null) ?? {};
  const multiImages = (wf.line_item_multi_images as Record<string, string[]> | null) ?? {};

  // 1. Explicit line item images stored in workflow_state
  for (const [key, val] of Object.entries(lineItemImages)) {
    if (val) {
      if (Array.isArray(val) && val.length > 0) {
        imageMap.set(key, val[0]);
        imageMap.set(`${key}_all`, JSON.stringify(val));
      } else if (typeof val === "string") {
        imageMap.set(key, val);
      }
    }
  }

  for (const [key, arr] of Object.entries(multiImages)) {
    if (Array.isArray(arr) && arr.length > 0) {
      if (!imageMap.has(key)) {
        imageMap.set(key, arr[0]);
      }
      imageMap.set(`${key}_all`, JSON.stringify(arr));
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

  // Support Stone Mural worksheet visual image
  if (typeof we.imageDataUrl === "string" && we.imageDataUrl) {
    imageMap.set("mural", we.imageDataUrl);
  }

  // 3. Match against Stone Tech Catalog Data (wall-cladding-catalog.json)
  for (const it of items) {
    const desc = (it.description || "").toLowerCase().trim();
    if (!desc) continue;

    const matched = rawCatalogData.find(
      (c) =>
        c.id.toLowerCase() === desc ||
        c.name.toLowerCase() === desc ||
        desc.includes(c.name.toLowerCase()) ||
        (c.name.length > 8 && c.name.toLowerCase().includes(desc)),
    );

    if (matched?.image && it.id && !imageMap.has(it.id)) {
      imageMap.set(it.id, matched.image);
    }
  }

  // 4. Master product catalog images (product_images table)
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

  // 5. Quote image attachments
  if (quote.id) {
    try {
      const attachments = await listAttachments("quote", quote.id);
      const imageAttachments = attachments.filter((f) => f.mime_type?.startsWith("image/"));
      await Promise.all(
        imageAttachments.map(async (att) => {
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
        }),
      );
    } catch {
      // Safe fallback if attachments query fails
    }
  }

  return imageMap;
}

/**
 * Extracts all product images associated with an invoice (bill) and its line items.
 * Checks:
 * 1. invoice.workflow_state.line_item_images & multi_images
 * 2. Linked Quotation photos (if invoice was converted from a quote)
 * 3. Master product images from product_images table
 * 4. Stone Tech Catalog items
 * 5. Invoice image attachments
 */
export async function resolveAllInvoiceImages(
  invoice: ResolvableInvoice | null | undefined,
  items: ResolvableInvoiceItem[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  if (!invoice) return imageMap;

  // 1. Explicit line item images in invoice workflow_state
  const wf = (invoice.workflow_state as Record<string, unknown> | null) ?? {};
  const lineItemImages = (wf.line_item_images as Record<string, string | string[]> | null) ?? {};
  const multiImages = (wf.line_item_multi_images as Record<string, string[]> | null) ?? {};

  for (const [key, val] of Object.entries(lineItemImages)) {
    if (val) {
      if (Array.isArray(val) && val.length > 0) {
        imageMap.set(key, val[0]);
        imageMap.set(`${key}_all`, JSON.stringify(val));
      } else if (typeof val === "string") {
        imageMap.set(key, val);
      }
    }
  }

  for (const [key, arr] of Object.entries(multiImages)) {
    if (Array.isArray(arr) && arr.length > 0) {
      if (!imageMap.has(key)) imageMap.set(key, arr[0]);
      imageMap.set(`${key}_all`, JSON.stringify(arr));
    }
  }

  // 2. Check linked Quote (via quote_id or lineage)
  let quoteId = invoice.quote_id;
  if (!quoteId && invoice.id) {
    try {
      const { data: lin } = await getDb()
        .from("document_lineage")
        .select("source_id")
        .eq("target_type", "invoice")
        .eq("target_id", invoice.id)
        .eq("source_type", "quote")
        .maybeSingle();
      if (lin?.source_id) quoteId = lin.source_id;
    } catch {
      /* ignore */
    }
  }

  if (quoteId) {
    try {
      const { data: q } = await getDb()
        .from("quotes")
        .select("id, quote_no, workflow_state, wall_estimate")
        .eq("id", quoteId)
        .maybeSingle();

      if (q) {
        const quoteMap = await resolveAllQuoteImages(q as ResolvableQuote, items);
        for (const [k, v] of quoteMap.entries()) {
          if (!imageMap.has(k)) {
            imageMap.set(k, v);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Match against Stone Tech Catalog Data
  for (const it of items) {
    const desc = (it.description || "").toLowerCase().trim();
    if (!desc) continue;

    const matched = rawCatalogData.find(
      (c) =>
        c.id.toLowerCase() === desc ||
        c.name.toLowerCase() === desc ||
        desc.includes(c.name.toLowerCase()) ||
        (c.name.length > 8 && c.name.toLowerCase().includes(desc)),
    );

    if (matched?.image && it.id && !imageMap.has(it.id)) {
      imageMap.set(it.id, matched.image);
    }
  }

  // 4. Master product catalog images (product_images table)
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
      /* ignore */
    }
  }

  // 5. Invoice image attachments
  if (invoice.id) {
    try {
      const attachments = await listAttachments("invoice", invoice.id);
      const imageAttachments = attachments.filter((f) => f.mime_type?.startsWith("image/"));
      await Promise.all(
        imageAttachments.map(async (att) => {
          let url: string | null = null;
          try {
            const { data: signed } = await supabase.storage
              .from(att.bucket || FILES_BUCKET)
              .createSignedUrl(att.object_path, 3600 * 24);
            url = signed?.signedUrl ?? null;
          } catch {
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
        }),
      );
    } catch {
      /* ignore */
    }
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
  items: ResolvableQuoteItem[] | QuoteItemRow[],
  imageMap: Map<string, string>,
): QuoteGalleryImage[] {
  const seenUrls = new Set<string>();
  const gallery: QuoteGalleryImage[] = [];

  for (const it of items) {
    const url = getLineItemImage(it, imageMap);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      gallery.push({
        id: it.id || "",
        url,
        label: it.description || "Stone Product",
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

export const NO_IMAGE_SENTINEL = "__none__";

/**
 * Resolves the best available image URL or dataUrl for a specific quote item
 */
export function getLineItemImage(
  item: ResolvableQuoteItem | QuoteItemRow,
  imageMap: Map<string, string>,
): string | null {
  // If the item specifically has an image entry in imageMap:
  if (item.id) {
    const direct = imageMap.get(item.id) ?? imageMap.get(item.id.toLowerCase());
    if (direct) {
      if (direct === NO_IMAGE_SENTINEL || direct === "none" || direct === "") return null;
      return direct;
    }
  }

  // Check product_id
  if (item.product_id) {
    const prodImg = imageMap.get(item.product_id) ?? imageMap.get(item.product_id.toLowerCase());
    if (prodImg) {
      if (prodImg === NO_IMAGE_SENTINEL) return null;
      return prodImg;
    }
  }

  // Check description
  if (item.description) {
    const descLower = item.description.trim().toLowerCase();
    const descImg = imageMap.get(descLower);
    if (descImg) {
      if (descImg === NO_IMAGE_SENTINEL) return null;
      return descImg;
    }
    // Partial search for product names in description
    for (const [key, url] of imageMap.entries()) {
      if (url === NO_IMAGE_SENTINEL) continue;
      if (!key.startsWith("att_") && !key.startsWith("file_") && key.length > 3) {
        if (descLower.includes(key) || key.includes(descLower)) {
          return url;
        }
      }
    }
  }

  return null;
}

/**
 * Returns all resolved product images for a line item (primary + secondary photos).
 */
export function getLineItemImages(
  item: ResolvableQuoteItem | QuoteItemRow,
  imageMap: Map<string, string>,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (u: string | null | undefined) => {
    if (!u || u === NO_IMAGE_SENTINEL || u === "none" || seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  // 1. Check if multi-images list was encoded in imageMap
  if (item.id) {
    const multiJson =
      imageMap.get(`${item.id}_all`) ?? imageMap.get(`${item.id.toLowerCase()}_all`);
    if (multiJson) {
      try {
        const parsed = JSON.parse(multiJson);
        if (Array.isArray(parsed)) {
          for (const img of parsed) add(img);
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 2. Primary image
  const primary = getLineItemImage(item, imageMap);
  add(primary);

  return urls;
}

/**
 * Detects whether a quotation item is a natural stone / stone material item.
 * Filters out adhesives, sealers, chemicals, grouts, labour, installation, transport, etc.
 */
export function isStoneMaterialItem(it: {
  product_name?: string | null;
  description?: string | null;
}): boolean {
  const text = `${it.product_name ?? ""} ${it.description ?? ""}`.toLowerCase();
  const nonStoneKeywords = [
    "adhesive",
    "adhesives",
    "sealer",
    "sealers",
    "sealant",
    "sealants",
    "chemical",
    "chemicals",
    "grout",
    "grouts",
    "epoxy",
    "mortar",
    "tenax",
    "impregnator",
    "cleaner",
    "wax",
    "labour",
    "labor",
    "installation",
    "installing",
    "fixing",
    "fitting",
    "laying",
    "application",
    "site visit",
    "measurement",
    "scaffolding",
    "transport",
    "transportation",
    "carting",
    "freight",
    "unloading",
    "loading",
    "tempo",
    "truck",
    "delivery",
    "crane",
    "fabrication charge",
    "cutting charge",
  ];

  for (const kw of nonStoneKeywords) {
    if (text.includes(kw)) {
      return false;
    }
  }
  return true;
}
