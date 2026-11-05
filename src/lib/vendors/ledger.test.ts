import { describe, expect, it } from "bun:test";
import { summariseLedger, sourceLabel, routeForLedgerRow, type VendorLedgerRow } from "./ledger";

describe("summariseLedger", () => {
  it("returns zeroed summary when rows array is empty", () => {
    const summary = summariseLedger([]);
    expect(summary).toEqual({
      totalDebit: 0,
      totalCredit: 0,
      outstanding: 0,
      entryCount: 0,
      lastEntryAt: null,
    });
  });

  it("calculates total debit, credit, outstanding balance, and lastEntryAt accurately", () => {
    const rows: VendorLedgerRow[] = [
      {
        id: "entry-1",
        vendor_id: "ven-1",
        entry_date: "2026-09-01",
        source_type: "purchase_invoice",
        source_id: "inv-1",
        ref_no: "PINV-101",
        description: "Granite slabs delivery",
        debit: 120000,
        credit: 0,
        currency_code: "INR",
        status: "posted",
        route: "/purchase-invoices/inv-1",
        metadata: {},
        created_at: "2026-09-01T10:00:00Z",
        running_balance: 120000,
      },
      {
        id: "entry-2",
        vendor_id: "ven-1",
        entry_date: "2026-09-05",
        source_type: "vendor_payment",
        source_id: "pay-1",
        ref_no: "PAY-201",
        description: "RTGS Payment",
        debit: 0,
        credit: 70000,
        currency_code: "INR",
        status: "posted",
        route: "/vendor-payments/pay-1",
        metadata: {},
        created_at: "2026-09-05T12:00:00Z",
        running_balance: 50000,
      },
      {
        id: "entry-3",
        vendor_id: "ven-1",
        entry_date: "2026-09-10",
        source_type: "purchase_invoice",
        source_id: "inv-2",
        ref_no: "PINV-102",
        description: "Sandstone blocks",
        debit: 35000,
        credit: 0,
        currency_code: "INR",
        status: "posted",
        route: "/purchase-invoices/inv-2",
        metadata: {},
        created_at: "2026-09-10T14:00:00Z",
        running_balance: 85000,
      },
    ];

    const summary = summariseLedger(rows);
    expect(summary.totalDebit).toBe(155000);
    expect(summary.totalCredit).toBe(70000);
    expect(summary.outstanding).toBe(85000);
    expect(summary.entryCount).toBe(3);
    expect(summary.lastEntryAt).toBe("2026-09-10");
  });

  it("handles negative outstanding balances (advance payments)", () => {
    const rows: VendorLedgerRow[] = [
      {
        id: "entry-1",
        vendor_id: "ven-2",
        entry_date: "2026-10-01",
        source_type: "vendor_payment",
        source_id: "pay-advance",
        ref_no: "ADV-001",
        description: "Advance deposit",
        debit: 0,
        credit: 50000,
        currency_code: "INR",
        status: "posted",
        route: null,
        metadata: {},
        created_at: "2026-10-01T10:00:00Z",
        running_balance: -50000,
      },
    ];

    const summary = summariseLedger(rows);
    expect(summary.totalDebit).toBe(0);
    expect(summary.totalCredit).toBe(50000);
    expect(summary.outstanding).toBe(-50000);
    expect(summary.entryCount).toBe(1);
    expect(summary.lastEntryAt).toBe("2026-10-01");
  });
});

describe("sourceLabel", () => {
  it("translates recognized source types into clear human labels", () => {
    expect(sourceLabel("purchase_invoice")).toBe("Purchase Invoice / Bill");
    expect(sourceLabel("vendor_payment")).toBe("Supplier Payment");
    expect(sourceLabel("purchase_order")).toBe("Purchase Order");
    expect(sourceLabel("grn")).toBe("Material Received");
    expect(sourceLabel("vendor_debit_note")).toBe("Debit Note");
    expect(sourceLabel("vendor_credit_note")).toBe("Credit Note");
    expect(sourceLabel("opening_balance")).toBe("Opening Balance");
  });

  it("falls back to uppercase source_type if unknown", () => {
    expect(sourceLabel("custom_settlement")).toBe("custom_settlement");
  });
});

describe("routeForLedgerRow", () => {
  it("uses row.route if explicitly provided", () => {
    const row = {
      id: "1",
      vendor_id: "v1",
      entry_date: "2026-01-01",
      source_type: "custom",
      source_id: "123",
      ref_no: "REF",
      description: null,
      debit: 10,
      credit: 0,
      currency_code: "INR",
      status: "posted",
      route: "/custom-path/123",
      metadata: {},
      created_at: "2026-01-01T00:00:00Z",
      running_balance: 10,
    };
    expect(routeForLedgerRow(row)).toBe("/custom-path/123");
  });

  it("infers route from known source types when route is not set", () => {
    const baseRow = {
      id: "1",
      vendor_id: "v1",
      entry_date: "2026-01-01",
      ref_no: "REF",
      description: null,
      debit: 0,
      credit: 0,
      currency_code: "INR",
      status: "posted",
      route: null,
      metadata: {},
      created_at: "2026-01-01T00:00:00Z",
      running_balance: 0,
    };

    expect(
      routeForLedgerRow({
        ...baseRow,
        source_type: "purchase_invoice",
        source_id: "inv-99",
      }),
    ).toBe("/purchase-invoices/inv-99");

    expect(
      routeForLedgerRow({
        ...baseRow,
        source_type: "vendor_payment",
        source_id: "pay-88",
      }),
    ).toBe("/vendor-payments/pay-88");

    expect(
      routeForLedgerRow({
        ...baseRow,
        source_type: "purchase_order",
        source_id: "po-77",
      }),
    ).toBe("/purchase-orders");

    expect(
      routeForLedgerRow({
        ...baseRow,
        source_type: "vendor_quote",
        source_id: "quote-66",
      }),
    ).toBe("/rfqs");

    expect(
      routeForLedgerRow({
        ...baseRow,
        source_type: "opening_balance",
        source_id: null,
      }),
    ).toBeNull();
  });
});
