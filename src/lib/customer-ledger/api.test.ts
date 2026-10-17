import { describe, expect, it } from "bun:test";
import {
  resolveUninvoicedDeliveryChallans,
  type RawDispatchForLedger,
  type RawInvoiceForLedger,
  type RawQuoteForLedger,
} from "./api";

describe("resolveUninvoicedDeliveryChallans", () => {
  it("incorporates uninvoiced cash delivery challan as a debit (Gagan Bhai scenario)", () => {
    const customerId = "cust-gagan-bhai";
    const quotes: RawQuoteForLedger[] = [
      {
        id: "quote-1",
        quote_no: "QT-000101",
        total: 73700,
        customer_id: customerId,
        status: "approved",
      },
    ];
    const dispatches: RawDispatchForLedger[] = [
      {
        id: "disp-1",
        dispatch_no: "DSP-000001",
        dispatch_date: "2026-04-10",
        status: "delivered",
        carting_charge: 0,
        notes: "Delivery challan for Quote #QT-000101",
        sales_order_id: null,
        customer_id: customerId,
      },
    ];
    const invoices: RawInvoiceForLedger[] = [];

    const entries = resolveUninvoicedDeliveryChallans({
      dispatches,
      invoices,
      quotes,
      targetCustomerId: customerId,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      customer_id: customerId,
      entry_date: "2026-04-10",
      entry_type: "delivery_challan",
      ref_id: "disp-1",
      ref_no: "DSP-000001",
      debit: 73700,
      credit: 0,
      status: "delivered",
    });
  });

  it("skips dispatches when order has already been invoiced to prevent double counting (Designnbuy scenario)", () => {
    const customerId = "cust-designnbuy";
    const quotes: RawQuoteForLedger[] = [
      {
        id: "quote-designnbuy",
        quote_no: "QT-000200",
        total: 64317,
        customer_id: customerId,
        status: "converted",
      },
    ];
    const dispatches: RawDispatchForLedger[] = [
      {
        id: "disp-2",
        dispatch_no: "DSP-000002",
        dispatch_date: "2026-04-05",
        status: "delivered",
        carting_charge: 0,
        notes: "Delivery challan for Quote #QT-000200",
        sales_order_id: null,
        customer_id: customerId,
      },
    ];
    const invoices: RawInvoiceForLedger[] = [
      {
        id: "inv-1",
        invoice_no: "INV-000050",
        quote_id: "quote-designnbuy",
        notes: null,
        status: "issued",
        customer_id: customerId,
      },
    ];

    const entries = resolveUninvoicedDeliveryChallans({
      dispatches,
      invoices,
      quotes,
      targetCustomerId: customerId,
    });

    // Invoiced quote must not produce a delivery_challan debit
    expect(entries).toHaveLength(0);
  });

  it("adds carting charge to quote debit and supports multi-challan quote debit split", () => {
    const customerId = "cust-split";
    const quotes: RawQuoteForLedger[] = [
      {
        id: "quote-split",
        quote_no: "QT-000300",
        total: 50000,
        customer_id: customerId,
        status: "approved",
      },
    ];
    const dispatches: RawDispatchForLedger[] = [
      {
        id: "disp-p1",
        dispatch_no: "DSP-000010",
        dispatch_date: "2026-04-01",
        status: "delivered",
        carting_charge: 1500,
        notes: "Part 1 for QT-000300",
        sales_order_id: null,
        customer_id: customerId,
      },
      {
        id: "disp-p2",
        dispatch_no: "DSP-000011",
        dispatch_date: "2026-04-02",
        status: "delivered",
        carting_charge: 1200,
        notes: "Part 2 for QT-000300",
        sales_order_id: null,
        customer_id: customerId,
      },
    ];
    const invoices: RawInvoiceForLedger[] = [];

    const entries = resolveUninvoicedDeliveryChallans({
      dispatches,
      invoices,
      quotes,
      targetCustomerId: customerId,
    });

    expect(entries).toHaveLength(2);
    // First challan debits quote total (50000) + carting (1500) = 51500
    expect(entries[0].debit).toBe(51500);
    expect(entries[0].ref_no).toBe("DSP-000010");
    // Second challan only debits its own carting charge (1200), not repeating 50000
    expect(entries[1].debit).toBe(1200);
    expect(entries[1].ref_no).toBe("DSP-000011");
  });

  it("ignores cancelled dispatches and invoices that mention dispatch_no", () => {
    const customerId = "cust-cancelled";
    const quotes: RawQuoteForLedger[] = [
      {
        id: "quote-c",
        quote_no: "QT-000400",
        total: 20000,
        customer_id: customerId,
        status: "approved",
      },
    ];
    const dispatches: RawDispatchForLedger[] = [
      {
        id: "disp-cancelled",
        dispatch_no: "DSP-CANCELLED",
        dispatch_date: "2026-04-01",
        status: "cancelled",
        carting_charge: 500,
        notes: "QT-000400",
        sales_order_id: null,
        customer_id: customerId,
      },
      {
        id: "disp-invoiced-by-note",
        dispatch_no: "DSP-INV-NOTE",
        dispatch_date: "2026-04-02",
        status: "delivered",
        carting_charge: 500,
        notes: "Delivery",
        sales_order_id: null,
        customer_id: customerId,
      },
    ];
    const invoices: RawInvoiceForLedger[] = [
      {
        id: "inv-c",
        invoice_no: "INV-C",
        quote_id: null,
        notes: "Billed against DSP-INV-NOTE",
        status: "issued",
        customer_id: customerId,
      },
    ];

    const entries = resolveUninvoicedDeliveryChallans({
      dispatches,
      invoices,
      quotes,
      targetCustomerId: customerId,
    });

    expect(entries).toHaveLength(0);
  });
});
