import { describe, expect, it } from "bun:test";
import {
  compareQuoteAndDispatchItems,
  normalizeItemName,
  getItemKey,
  type LineItemRef,
} from "./variance";

describe("Quote vs Delivery Challan Product Variance Engine", () => {
  it("detects no variance when products and quantities match exactly", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: "p1", description: "White Statuario 20mm", quantity: 500, unit: "sqft" },
      { product_id: "p2", description: "Black Marquina 18mm", quantity: 200, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: "p1", product_name: "White Statuario 20mm", quantity: 500, unit: "sqft" },
      { product_id: "p2", product_name: "Black Marquina 18mm", quantity: 200, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(false);
    expect(result.varianceCount).toBe(0);
    expect(result.variances).toHaveLength(0);
    expect(result.summaryText).toContain("100% verified");
  });

  it("detects short supply quantity mismatch on challan", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: "p1", description: "White Statuario 20mm", quantity: 500, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: "p1", product_name: "White Statuario 20mm", quantity: 450, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(true);
    expect(result.varianceCount).toBe(1);
    expect(result.variances[0].type).toBe("quantity_mismatch");
    expect(result.variances[0].difference).toBe(-50);
    expect(result.variances[0].message).toContain("Short supply");
  });

  it("detects excess supply quantity on challan", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: "p1", description: "White Statuario 20mm", quantity: 500, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: "p1", product_name: "White Statuario 20mm", quantity: 560, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(true);
    expect(result.variances[0].type).toBe("quantity_mismatch");
    expect(result.variances[0].difference).toBe(60);
    expect(result.variances[0].message).toContain("Excess quantity");
  });

  it("detects omitted quote items missing from delivery challan", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: "p1", description: "White Statuario 20mm", quantity: 500, unit: "sqft" },
      { product_id: "p2", description: "Black Marquina 18mm", quantity: 200, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: "p1", product_name: "White Statuario 20mm", quantity: 500, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(true);
    expect(result.variances[0].type).toBe("item_omitted");
    expect(result.variances[0].productName).toBe("Black Marquina 18mm");
    expect(result.variances[0].severity).toBe("critical");
  });

  it("detects unquoted items added to delivery challan", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: "p1", description: "White Statuario 20mm", quantity: 500, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: "p1", product_name: "White Statuario 20mm", quantity: 500, unit: "sqft" },
      { product_id: null, product_name: "Grey Armani 20mm", quantity: 80, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(true);
    expect(result.variances[0].type).toBe("item_added");
    expect(result.variances[0].productName).toBe("Grey Armani 20mm");
    expect(result.variances[0].severity).toBe("critical");
  });

  it("matches items by normalized description when product_id is absent", () => {
    const quoteItems: LineItemRef[] = [
      { product_id: null, description: "  Travertine Beige 18mm  ", quantity: 150, unit: "sqft" },
    ];
    const dispatchItems: LineItemRef[] = [
      { product_id: null, product_name: "travertine beige 18mm", quantity: 150, unit: "sqft" },
    ];

    const result = compareQuoteAndDispatchItems(quoteItems, dispatchItems);
    expect(result.hasVariance).toBe(false);
  });
});
