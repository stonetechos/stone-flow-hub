export type SaleMode = "invoiced" | "cash" | "hybrid";

export interface SaleModeConfig {
  value: SaleMode;
  label: string;
  shortLabel: string;
  badgeTone: string;
  dotColor: string;
  description: string;
  documentType: "bill" | "challan" | "hybrid";
}

export const SALE_MODE_CONFIG: Record<SaleMode, SaleModeConfig> = {
  invoiced: {
    value: "invoiced",
    label: "GST Deal (Tax Bill)",
    shortLabel: "GST Deal",
    badgeTone: "bg-[#e0f1f5] text-[#015474] border-[#006788]/30 font-medium",
    dotColor: "bg-[#006788]",
    description: "Standard GST deal: Official Tax Invoice is generated when order is confirmed.",
    documentType: "bill",
  },
  cash: {
    value: "cash",
    label: "Cash Deal (Challan Only)",
    shortLabel: "Cash Deal",
    badgeTone: "bg-cyan-50 text-[#00597b] border-cyan-200 font-medium",
    dotColor: "bg-[#00597b]",
    description: "Cash deal: Delivery Challan issued directly without GST tax invoice.",
    documentType: "challan",
  },
  hybrid: {
    value: "hybrid",
    label: "Hybrid Deal (GST Bill + Cash)",
    shortLabel: "Hybrid Deal",
    badgeTone: "bg-sky-50 text-[#015474] border-sky-200 font-medium",
    dotColor: "bg-[#015474]",
    description: "Split deal: Part GST Tax Invoice, part Cash Delivery Challan.",
    documentType: "hybrid",
  },
};

export function getQuoteSaleMode(
  quote?: { workflow_state?: unknown; notes?: string | null; sale_mode?: string | null } | null,
): SaleMode {
  if (!quote) return "invoiced";
  const directMode = (quote as Record<string, unknown>).sale_mode;
  if (directMode === "cash" || directMode === "hybrid" || directMode === "invoiced") {
    return directMode as SaleMode;
  }
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  if (wf.sale_mode === "cash" || wf.sale_mode === "hybrid" || wf.sale_mode === "invoiced") {
    return wf.sale_mode as SaleMode;
  }
  // Check fallback in notes
  const notesLower = (quote.notes || "").toLowerCase();
  if (
    quote.notes?.includes("[CASH_SALE]") ||
    notesLower.includes("cash deal") ||
    notesLower.includes("cash sale")
  ) {
    return "cash";
  }
  if (
    quote.notes?.includes("[HYBRID_SALE]") ||
    notesLower.includes("hybrid deal") ||
    notesLower.includes("hybrid sale")
  ) {
    return "hybrid";
  }
  return "invoiced";
}

export function getQuoteHybridSplit(quote?: { workflow_state?: unknown } | null): {
  cashAmount: number;
  invoicedAmount: number;
} {
  if (!quote) return { cashAmount: 0, invoicedAmount: 0 };
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  return {
    cashAmount: Number(wf.hybrid_cash_amount ?? 0),
    invoicedAmount: Number(wf.hybrid_invoiced_amount ?? 0),
  };
}

export { getQuoteDiscount, calculateEffectiveQuoteTotal } from "./discount";
