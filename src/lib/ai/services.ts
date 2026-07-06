/**
 * AI Service interfaces + a live implementation backed by the Lovable AI
 * Gateway server functions. Every AI feature routes through this file so
 * callers never talk to a provider directly.
 */
import { suggestHsnGst, estimateCost as estimateCostFn, marketPrice, recognizeStoneImage } from "@/lib/ai/copilot.functions";

export interface HsnSuggestion { hsn: string; confidence: number; reason?: string }
export interface GstSuggestion { gst_pct: number; confidence: number; reason?: string }
export interface VendorSuggestion { vendor_id: string; score: number; reason: string }
export interface CostBreakdown {
  material: number; processing: number; vendor: number; transport: number;
  packing: number; labour: number; overheads: number; total_cost: number;
  suggested_selling_price: number; gross_margin_pct: number; net_margin_pct: number; notes?: string;
}
export interface MarginPrediction { predicted_margin_pct: number; confidence: number; drivers: string[] }
export interface StoneMatch { stone_type_id: string; colour_id?: string; confidence: number }
export interface ImageRecognitionResult {
  stone_type?: string; colour?: string; finish?: string; pattern?: string;
  suggested_application?: string; suggested_family_id?: string;
  labels?: string[]; confidence: number; notes?: string;
}
export interface MarketPriceResult {
  low: number; average: number; high: number; unit: string;
  confidence: number; last_updated: string; source: string; notes?: string;
}
export interface DrawingAnalysis {
  estimated_area_sqft: number; estimated_quantity: number;
  suggested_products: string[]; estimated_wastage_pct: number;
  suggested_thickness_mm: number; suggested_fixing_method: string;
  suggested_production_route: string; confidence: number; notes?: string;
}
export interface QuoteAssistDraft {
  line_items: Array<{ description: string; quantity: number; unit_price: number }>;
  notes?: string;
}

export interface AiServices {
  suggestHsn(input: { product_name: string; family?: string; description?: string }): Promise<HsnSuggestion | null>;
  suggestGst(input: { hsn?: string; family?: string }): Promise<GstSuggestion | null>;
  suggestHsnGst(input: {
    product_name: string; family?: string; stone_type?: string; finish?: string;
    application?: string; origin?: string; thickness_mm?: number | null; description?: string;
  }): Promise<{ hsn: HsnSuggestion; gst: GstSuggestion } | null>;
  recognizeImage(input: { image_url: string }): Promise<ImageRecognitionResult | null>;
  matchStone(input: { image_url?: string; description?: string }): Promise<StoneMatch[]>;
  recommendVendors(input: { product_id?: string; rfq_id?: string }): Promise<VendorSuggestion[]>;
  draftQuotation(input: { enquiry_id: string }): Promise<QuoteAssistDraft | null>;
  estimateCost(input: {
    product_name: string; stone_type?: string; finish?: string;
    thickness_mm?: number; quantity: number; unit?: string; origin?: string;
  }): Promise<CostBreakdown | null>;
  predictMargin(input: { quote_id: string }): Promise<MarginPrediction | null>;
  marketPrice(input: {
    stone_type: string; colour?: string; finish?: string;
    thickness_mm?: number; origin?: string; unit?: string;
  }): Promise<MarketPriceResult | null>;
  analyzeDrawing(input: { file_url?: string; notes?: string }): Promise<DrawingAnalysis | null>;
}

/** Live implementation — server functions guard LOVABLE_API_KEY. */
export const aiServices: AiServices = {
  async suggestHsn(input) {
    const r = await suggestHsnGst({ data: { product_name: input.product_name, family: input.family, description: input.description } });
    return r.hsn;
  },
  async suggestGst(input) {
    // GST is derived alongside HSN; short-circuit with heuristic when only HSN is known.
    return heuristicGst(input.hsn);
  },
  async suggestHsnGst(input) {
    return suggestHsnGst({
      data: {
        product_name: input.product_name,
        family: input.family,
        stone_type: input.stone_type,
        finish: input.finish,
        application: input.application,
        origin: input.origin,
        thickness_mm: input.thickness_mm ?? undefined,
        description: input.description,
      },
    });
  },
  async recognizeImage(input) {
    return recognizeStoneImage({ data: { image_url: input.image_url } });
  },
  async matchStone() { return []; },
  async recommendVendors() { return []; },
  async draftQuotation() { return null; },
  async estimateCost(input) {
    return estimateCostFn({ data: input });
  },
  async predictMargin() { return null; },
  async marketPrice(input) {
    return marketPrice({
      data: {
        stone_type: input.stone_type,
        colour: input.colour,
        finish: input.finish,
        thickness_mm: input.thickness_mm,
        origin: input.origin,
        unit: input.unit ?? "sqft",
      },
    });
  },
  async analyzeDrawing() {
    // Placeholder — real PDF/CAD parsing lands in a later module. Returns a
    // conservative stub so UI plumbing can be validated end-to-end today.
    return {
      estimated_area_sqft: 0,
      estimated_quantity: 0,
      suggested_products: [],
      estimated_wastage_pct: 8,
      suggested_thickness_mm: 18,
      suggested_fixing_method: "Mechanical anchor with epoxy",
      suggested_production_route: "CNC + hand-finish",
      confidence: 0,
      notes: "Drawing analysis is a placeholder — upload area/quantity manually for now.",
    };
  },
};

/** Utility used by the product configurator today to seed sensible defaults
 * without an AI round-trip. Callers may replace with `aiServices.suggestHsn`
 * when they want an AI-backed answer. */
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
