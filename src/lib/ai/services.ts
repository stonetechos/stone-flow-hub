/**
 * AI Service interfaces (Module 4 hooks).
 *
 * These are the clean extension points every future AI feature will implement.
 * They are deliberately implementation-free — swap the stub with a Lovable AI
 * Gateway call (or any provider) without touching the callers.
 *
 * Every consumer should import from here — never call a model provider directly.
 */

export interface HsnSuggestion { hsn: string; confidence: number; reason?: string }
export interface GstSuggestion { gst_pct: number; confidence: number; reason?: string }
export interface VendorSuggestion { vendor_id: string; score: number; reason: string }
export interface CostBreakdown { material: number; labour: number; overhead: number; margin: number; total: number }
export interface MarginPrediction { predicted_margin_pct: number; confidence: number; drivers: string[] }
export interface StoneMatch { stone_type_id: string; colour_id?: string; confidence: number }
export interface ImageRecognitionResult { labels: string[]; suggested_family_id?: string; confidence: number }
export interface QuoteAssistDraft { line_items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string }

export interface AiServices {
  suggestHsn(input: { product_name: string; family?: string; description?: string }): Promise<HsnSuggestion | null>;
  suggestGst(input: { hsn?: string; family?: string }): Promise<GstSuggestion | null>;
  recognizeImage(input: { image_url: string }): Promise<ImageRecognitionResult | null>;
  matchStone(input: { image_url?: string; description?: string }): Promise<StoneMatch[]>;
  recommendVendors(input: { product_id?: string; rfq_id?: string }): Promise<VendorSuggestion[]>;
  draftQuotation(input: { enquiry_id: string }): Promise<QuoteAssistDraft | null>;
  estimateCost(input: { product_id: string; quantity: number }): Promise<CostBreakdown | null>;
  predictMargin(input: { quote_id: string }): Promise<MarginPrediction | null>;
}

/** Default stub. Replace with a Lovable AI Gateway implementation in Module 4. */
export const aiServices: AiServices = {
  async suggestHsn() { return null; },
  async suggestGst() { return null; },
  async recognizeImage() { return null; },
  async matchStone() { return []; },
  async recommendVendors() { return []; },
  async draftQuotation() { return null; },
  async estimateCost() { return null; },
  async predictMargin() { return null; },
};

/** Utility used by the product configurator today to seed sensible defaults
 * without an AI round-trip. Replace with `aiServices.suggestHsn` when live. */
export function heuristicHsn(family?: string): HsnSuggestion {
  const f = (family ?? "").toLowerCase();
  if (f.includes("mosaic") || f.includes("panel") || f.includes("cladding")) return { hsn: "68022190", confidence: 0.6, reason: "Worked marble/stone articles" };
  if (f.includes("veneer")) return { hsn: "68029900", confidence: 0.6, reason: "Flexible / worked stone" };
  if (f.includes("artwork") || f.includes("mural") || f.includes("inlay") || f.includes("sculpture")) return { hsn: "97030090", confidence: 0.5, reason: "Original sculptures / art" };
  return { hsn: "68022390", confidence: 0.4, reason: "Generic worked granite/stone" };
}

export function heuristicGst(hsn?: string): GstSuggestion {
  const h = hsn ?? "";
  if (h.startsWith("9703")) return { gst_pct: 12, confidence: 0.6 };
  return { gst_pct: 18, confidence: 0.7, reason: "Standard rate for worked stone articles" };
}
