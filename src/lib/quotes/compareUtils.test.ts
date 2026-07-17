/**
 * Quote Comparison pure-logic tests. Run with `bun test`. Not run in
 * this environment (no `bun` binary available here — consistent with
 * every other `.test.ts` file in this project, which discloses the
 * same); written and reviewed by hand against the logic in
 * `compareUtils.ts`.
 */
import { describe, expect, test } from "bun:test";
import {
  buildLineItemComparison,
  lineItemKey,
  normalizeDescription,
  valuesDiffer,
  type ComparedQuote,
} from "./compareUtils";
import type { QuoteItemRow, QuoteListItem } from "./api";

function quote(id: string, overrides: Partial<QuoteListItem> = {}): QuoteListItem {
  return {
    id,
    quote_no: `Q-${id}`,
    status: "sent",
    total: 1000,
    subtotal: 1000,
    tax_amount: 0,
    issue_date: "2026-01-01",
    valid_until: null,
    customer_id: "cust-1",
    project_id: "proj-1",
    customer: { id: "cust-1", name: "Acme", customer_code: "C-1" },
    project: { id: "proj-1", name: "Acme HQ", project_code: "P-1" },
    ...overrides,
  } as unknown as QuoteListItem;
}

function item(overrides: Partial<QuoteItemRow>): QuoteItemRow {
  return {
    id: Math.random().toString(36),
    quote_id: "q1",
    product_id: null,
    description: "Granite slab",
    quantity: 10,
    unit: "sqft",
    unit_price: 100,
    line_total: 1000,
    tax_pct: 18,
    sort_order: 0,
    ...overrides,
  } as unknown as QuoteItemRow;
}

describe("normalizeDescription", () => {
  test("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeDescription("  Monsoon   Black  Crazy ")).toBe("monsoon black crazy");
  });
});

describe("lineItemKey", () => {
  test("keys by product_id when present", () => {
    expect(lineItemKey({ product_id: "abc", description: "whatever" })).toBe("p:abc");
  });

  test("falls back to normalized description when product_id is null", () => {
    expect(lineItemKey({ product_id: null, description: "  Tile  6mm " })).toBe("d:tile 6mm");
  });
});

describe("buildLineItemComparison", () => {
  test("matches the same product across quotes into one row", () => {
    const q1 = quote("q1");
    const q2 = quote("q2");
    const quotes: ComparedQuote[] = [
      {
        quote: q1,
        items: [item({ quote_id: "q1", product_id: "prod-1", description: "typed differently" })],
      },
      {
        quote: q2,
        items: [
          item({
            quote_id: "q2",
            product_id: "prod-1",
            description: "also different",
            unit_price: 120,
          }),
        ],
      },
    ];
    const rows = buildLineItemComparison(quotes, new Map([["prod-1", "Real Product Name"]]));
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Real Product Name");
    expect(rows[0].values[0]?.unitPrice).toBe(100);
    expect(rows[0].values[1]?.unitPrice).toBe(120);
  });

  test("falls back to description matching when product_id is null", () => {
    const q1 = quote("q1");
    const q2 = quote("q2");
    const quotes: ComparedQuote[] = [
      { quote: q1, items: [item({ quote_id: "q1", description: "Granite Slab" })] },
      { quote: q2, items: [item({ quote_id: "q2", description: "  granite   slab  " })] },
    ];
    const rows = buildLineItemComparison(quotes, new Map());
    expect(rows).toHaveLength(1);
  });

  test("a line present on only one quote shows null for the others", () => {
    const q1 = quote("q1");
    const q2 = quote("q2");
    const quotes: ComparedQuote[] = [
      { quote: q1, items: [item({ quote_id: "q1", description: "Only on q1" })] },
      { quote: q2, items: [] },
    ];
    const rows = buildLineItemComparison(quotes, new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0].values[0]).not.toBeNull();
    expect(rows[0].values[1]).toBeNull();
  });

  test("preserves first-appearance order across quotes", () => {
    const q1 = quote("q1");
    const q2 = quote("q2");
    const quotes: ComparedQuote[] = [
      {
        quote: q1,
        items: [
          item({ quote_id: "q1", description: "First" }),
          item({ quote_id: "q1", description: "Second" }),
        ],
      },
      { quote: q2, items: [item({ quote_id: "q2", description: "Third" })] },
    ];
    const rows = buildLineItemComparison(quotes, new Map());
    expect(rows.map((r) => r.label)).toEqual(["First", "Second", "Third"]);
  });
});

describe("valuesDiffer", () => {
  test("false when fewer than 2 present values", () => {
    expect(valuesDiffer([])).toBe(false);
    expect(valuesDiffer([5])).toBe(false);
    expect(valuesDiffer([5, null])).toBe(false);
  });

  test("false when all present values are equal", () => {
    expect(valuesDiffer([5, 5, 5])).toBe(false);
  });

  test("true when at least one present value differs", () => {
    expect(valuesDiffer([5, 6])).toBe(true);
    expect(valuesDiffer([5, null, 6])).toBe(true);
  });

  test("compares via the given selector", () => {
    expect(valuesDiffer([{ n: 1 }, { n: 1 }], (v) => v.n)).toBe(false);
    expect(valuesDiffer([{ n: 1 }, { n: 2 }], (v) => v.n)).toBe(true);
  });
});
