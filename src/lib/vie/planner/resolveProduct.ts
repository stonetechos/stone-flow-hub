/**
 * Planner resolver — material/product mention -> existing product_id.
 *
 * Read-only, best-effort. Never a blocker: enquiryCreateSchema doesn't
 * require a product reference at all, so an unresolved product just falls
 * back to the raw text in the enquiry's requirement string.
 */
import { listProducts } from "@/lib/products/api";

export interface ProductResolution {
  productId: string | null;
  productLabel: string | null;
}

export async function resolveProduct(text: string | undefined): Promise<ProductResolution> {
  if (!text || !text.trim()) return { productId: null, productLabel: null };

  const matches = await listProducts(text.trim());
  if (matches.length === 1) {
    return { productId: matches[0].id, productLabel: matches[0].name };
  }
  // 0 or >1 matches: not confident enough to link automatically. The raw
  // text the employee used is still preserved in the enquiry's requirement
  // string by the caller (planner/index.ts), so nothing is lost.
  return { productId: null, productLabel: null };
}
