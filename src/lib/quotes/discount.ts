export interface QuoteLikeForDiscount {
  subtotal?: number | null;
  tax_amount?: number | null;
  total?: number | null;
  workflow_state?: unknown;
  sale_mode?: string | null;
}

/**
 * Extracts the lumpsum negotiated discount amount from a quotation's workflow_state.
 * Returns 0 if no discount is present or if negative/invalid.
 */
export function getQuoteDiscount(quote?: QuoteLikeForDiscount | null): number {
  if (!quote) return 0;
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  const explicit = wf.discount_amount ?? wf.discount;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const parsed = Number(explicit);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return 0;
}

export interface QuoteTotalBreakdown {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

/**
 * Calculates financial totals for a quotation including lumpsum discount.
 * In cash deals, tax is 0.
 * Total is bounded below by 0: Total = Math.max(0, Subtotal + Tax - Discount).
 */
export function calculateEffectiveQuoteTotal(params: {
  subtotal: number | string | null | undefined;
  taxAmount?: number | string | null | undefined;
  discountAmount?: number | string | null | undefined;
  saleMode?: string | null;
}): QuoteTotalBreakdown {
  const subtotal = Math.max(0, Math.round(Number(params.subtotal || 0) * 100) / 100);
  const isCash = params.saleMode === "cash";
  const taxAmount = isCash ? 0 : Math.max(0, Math.round(Number(params.taxAmount || 0) * 100) / 100);
  const discountAmount = Math.max(0, Math.round(Number(params.discountAmount || 0) * 100) / 100);
  const preDiscount = Math.round((subtotal + taxAmount) * 100) / 100;
  const total = Math.max(0, Math.round((preDiscount - discountAmount) * 100) / 100);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    total,
  };
}
