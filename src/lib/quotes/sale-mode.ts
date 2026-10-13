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
    label: "Invoiced Sale (GST Bill)",
    shortLabel: "Invoiced",
    badgeTone: "bg-blue-50 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
    description: "Standard GST invoice; official tax bill generated.",
    documentType: "bill",
  },
  cash: {
    value: "cash",
    label: "Cash Sale (Challan Only)",
    shortLabel: "Cash Sale",
    badgeTone: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
    dotColor: "bg-emerald-500",
    description: "0% GST; Delivery Challan issued directly without tax bill.",
    documentType: "challan",
  },
  hybrid: {
    value: "hybrid",
    label: "Hybrid (Part Invoiced / Part Cash)",
    shortLabel: "Hybrid",
    badgeTone: "bg-purple-50 text-purple-800 border-purple-200 font-semibold",
    dotColor: "bg-purple-500",
    description: "Partly invoiced with GST, partly cash delivery challan.",
    documentType: "hybrid",
  },
};

export function getQuoteSaleMode(
  quote?: { workflow_state?: unknown; notes?: string | null } | null,
): SaleMode {
  if (!quote) return "invoiced";
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  if (wf.sale_mode === "cash" || wf.sale_mode === "hybrid" || wf.sale_mode === "invoiced") {
    return wf.sale_mode as SaleMode;
  }
  // Check fallback in notes
  if (quote.notes?.includes("[CASH_SALE]") || quote.notes?.toLowerCase().includes("cash deal")) {
    return "cash";
  }
  if (
    quote.notes?.includes("[HYBRID_SALE]") ||
    quote.notes?.toLowerCase().includes("hybrid deal")
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
