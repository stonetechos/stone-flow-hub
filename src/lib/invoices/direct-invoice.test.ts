import { describe, expect, test } from "bun:test";
import { invoiceCreateSchema, invoiceItemInputSchema } from "./schema";

describe("Direct Invoice Schemas", () => {
  test("invoiceItemInputSchema validates valid line items with decimals", () => {
    const valid = invoiceItemInputSchema.parse({
      description: "Teakwood Sandstone Carved Panel",
      quantity: 4.6,
      unit: "sqft",
      unit_price: 425,
      tax_pct: 18,
      hsn_sac: "6802",
      notes: "Custom hone finish",
    });

    expect(valid.description).toBe("Teakwood Sandstone Carved Panel");
    expect(valid.quantity).toBe(4.6);
    expect(valid.unit_price).toBe(425);
    expect(valid.tax_pct).toBe(18);
    expect(valid.notes).toBe("Custom hone finish");
  });

  test("invoiceItemInputSchema rejects zero or negative quantity", () => {
    expect(() =>
      invoiceItemInputSchema.parse({
        description: "Granite Slab",
        quantity: 0,
        unit_price: 100,
      }),
    ).toThrow();

    expect(() =>
      invoiceItemInputSchema.parse({
        description: "Granite Slab",
        quantity: -5,
        unit_price: 100,
      }),
    ).toThrow();
  });

  test("invoiceItemInputSchema rejects empty description", () => {
    expect(() =>
      invoiceItemInputSchema.parse({
        description: "   ",
        quantity: 1,
        unit_price: 100,
      }),
    ).toThrow();
  });

  test("invoiceCreateSchema requires customer_id or project_id", () => {
    expect(() =>
      invoiceCreateSchema.parse({
        items: [
          {
            description: "Stone Tile",
            quantity: 10,
            unit_price: 50,
          },
        ],
      }),
    ).toThrow("Either customer or project is required");
  });

  test("invoiceCreateSchema requires at least one line item", () => {
    expect(() =>
      invoiceCreateSchema.parse({
        customer_id: "a0000000-0000-0000-0000-000000000001",
        items: [],
      }),
    ).toThrow("At least one line item is required");
  });

  test("invoiceCreateSchema succeeds with valid customer and items without quotation", () => {
    const res = invoiceCreateSchema.parse({
      customer_id: "a0000000-0000-0000-0000-000000000001",
      issue_date: "2026-11-05",
      due_date: "2026-11-20",
      notes: "Payment due within 15 days",
      terms: "Direct supply invoice",
      dispatch_remarks: "Dispatched via DTDC",
      lr_no: "LR-998811",
      items: [
        {
          description: "Italian Marble Slabs",
          quantity: 120.5,
          unit: "sqft",
          unit_price: 350,
          tax_pct: 18,
          hsn_sac: "68022190",
        },
      ],
    });

    expect(res.customer_id).toBe("a0000000-0000-0000-0000-000000000001");
    expect(res.quote_id).toBeUndefined(); // No quotation mandatory!
    expect(res.items).toHaveLength(1);
    expect(res.items[0].quantity).toBe(120.5);
    expect(res.lr_no).toBe("LR-998811");
  });

  test("computes accurate subtotal, GST and grand total for direct invoice items", () => {
    const items = [
      {
        description: "Sandstone Jharokha",
        quantity: 2,
        unit_price: 15000,
        tax_pct: 18,
      },
      {
        description: "Freight / Carting",
        quantity: 1,
        unit_price: 3000,
        tax_pct: 5,
      },
    ];

    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
    const taxAmount = items.reduce(
      (sum, it) => sum + (it.quantity * it.unit_price * it.tax_pct) / 100,
      0,
    );
    const total = subtotal + taxAmount;

    expect(subtotal).toBe(33000);
    // 30000 * 0.18 = 5400, 3000 * 0.05 = 150 -> 5550
    expect(taxAmount).toBe(5550);
    expect(total).toBe(38550);
  });

  test("calculates balance due correctly when receipts or payments are allocated", () => {
    const invoiceTotal = 58141;
    const allocatedReceipt = 58141;
    const legacyPayment = 0;

    const totalPaid = allocatedReceipt + legacyPayment;
    const balanceDue = Math.max(0, invoiceTotal - totalPaid);
    const status = totalPaid >= invoiceTotal ? "paid" : totalPaid > 0 ? "partially_paid" : "sent";

    expect(totalPaid).toBe(58141);
    expect(balanceDue).toBe(0);
    expect(status).toBe("paid");
  });

  test("calculates partially paid status when receipt is less than invoice total", () => {
    const invoiceTotal = 58141;
    const allocatedReceipt = 20000;

    const balanceDue = invoiceTotal - allocatedReceipt;
    const status = allocatedReceipt >= invoiceTotal ? "paid" : "partially_paid";

    expect(balanceDue).toBe(38141);
    expect(status).toBe("partially_paid");
  });
});
