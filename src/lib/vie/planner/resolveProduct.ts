/**
 * Planner resolver — material/product mention -> existing product_id.
 *
 * Read-only, best-effort. Never a blocker: enquiryCreateSchema doesn't
 * require a product reference at all, so an unresolved product just falls
 * back to the raw text in the enquiry's requirement string.
 *
 * Sprint AI-1.6: the search + zero/one/many classification now goes through
 * entityResolution.ts's classifyMatches() — this file uses ONLY that,
 * never the framework's blocker-building helpers, since it deliberately
 * never blocks (see above). The returned shape still has no `blocker` key
 * at all, not even `undefined` — resolveProduct.test.ts asserts that
 * explicitly and is unmodified by this sprint. Behavior is unchanged.
 */
import { listProducts } from "@/lib/products/api";
import { classifyMatches } from "./entityResolution";

export interface ProductResolution {
  productId: string | null;
  productLabel: string | null;
}

export async function resolveProduct(text: string | undefined): Promise<ProductResolution> {
  if (!text || !text.trim()) return { productId: null, productLabel: null };

  const outcome = classifyMatches(await listProducts(text.trim()));
  if (outcome.kind === "one") {
    return { productId: outcome.record.id, productLabel: outcome.record.name };
  }
  // "none" or "many": not confident enough to link automatically. The raw
  // text the employee used is still preserved in the enquiry's requirement
  // string by the caller (planner/index.ts), so nothing is lost.
  return { productId: null, productLabel: null };
}
