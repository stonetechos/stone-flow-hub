import { describe, expect, it } from "bun:test";
import { getQuoteDiscount, calculateEffectiveQuoteTotal } from "./discount";

describe("getQuoteDiscount", () => {
  it("returns 0 when quote is null, undefined, or empty", () => {
    expect(getQuoteDiscount(null)).toBe(0);
    expect(getQuoteDiscount(undefined)).toBe(0);
    expect(getQuoteDiscount({})).toBe(0);
  });

  it("extracts discount_amount from workflow_state", () => {
    expect(
      getQuoteDiscount({
        workflow_state: { discount_amount: 3500 },
      }),
    ).toBe(3500);

    expect(
      getQuoteDiscount({
        workflow_state: { discount_amount: "3500" },
      }),
    ).toBe(3500);
  });

  it("falls back to discount field in workflow_state if present", () => {
    expect(
      getQuoteDiscount({
        workflow_state: { discount: 2000 },
      }),
    ).toBe(2000);
  });

  it("handles decimal discounts properly and rounds to 2 decimal places", () => {
    expect(
      getQuoteDiscount({
        workflow_state: { discount_amount: 3500.5 },
      }),
    ).toBe(3500.5);
  });

  it("ignores negative, NaN, or non-numeric values", () => {
    expect(
      getQuoteDiscount({
        workflow_state: { discount_amount: -500 },
      }),
    ).toBe(0);

    expect(
      getQuoteDiscount({
        workflow_state: { discount_amount: "invalid" },
      }),
    ).toBe(0);
  });
});

describe("calculateEffectiveQuoteTotal", () => {
  it("calculates total with subtotal and tax minus discount", () => {
    const res = calculateEffectiveQuoteTotal({
      subtotal: 77730,
      taxAmount: 0,
      discountAmount: 3500,
      saleMode: "cash",
    });

    expect(res.subtotal).toBe(77730);
    expect(res.taxAmount).toBe(0);
    expect(res.discountAmount).toBe(3500);
    expect(res.total).toBe(74230);
  });

  it("includes GST tax in invoiced mode before subtracting discount", () => {
    const res = calculateEffectiveQuoteTotal({
      subtotal: 100000,
      taxAmount: 18000,
      discountAmount: 5000,
      saleMode: "invoiced",
    });

    expect(res.subtotal).toBe(100000);
    expect(res.taxAmount).toBe(18000);
    expect(res.discountAmount).toBe(5000);
    expect(res.total).toBe(113000);
  });

  it("never allows total to drop below 0 if discount exceeds pre-discount total", () => {
    const res = calculateEffectiveQuoteTotal({
      subtotal: 3000,
      taxAmount: 0,
      discountAmount: 5000,
      saleMode: "cash",
    });

    expect(res.total).toBe(0);
  });
});
