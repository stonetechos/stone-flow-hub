import { describe, expect, it } from "bun:test";
import { renderDocWhatsAppText, type BuiltDocument } from "./engine";

describe("renderDocWhatsAppText", () => {
  it("includes Current Customer Balance when balance is 0 (fully paid)", () => {
    const built: BuiltDocument = {
      doc: {
        kind: "receipt",
        title: "Payment Receipt",
        number: "RCT-000015",
        date: "2026-10-16",
        to: { name: "Designnbuy Webtoprint Private Ltd" },
        balanceDue: 0,
        meta: [
          { label: "Method", value: "Bank Transfer" },
          { label: "Allocated", value: "₹27,567" },
        ],
        totals: [
          { label: "Amount received", value: "₹27,567" },
          { label: "Net amount", value: "₹27,567" },
          { label: "Current Balance", value: "₹0 (Fully Paid)" },
        ],
        lines: [
          {
            label: "Applied to invoice INV-000003",
            qty: 1,
            unit: "",
            rate: "₹27,567",
            amount: "₹27,567",
          },
        ],
        notes: "Received with thanks. Please retain this acknowledgment for your records.",
      },
      meta: {
        toName: "Designnbuy Webtoprint Private Ltd",
        toEmail: null,
        toPhone: "9876543210",
        docNumber: "RCT-000015",
        customerId: "cust-1",
        vendorId: null,
        projectId: null,
      },
    };

    const text = renderDocWhatsAppText(built);

    expect(text).toContain("*Payment Receipt — RCT-000015*");
    expect(text).toContain("Dear Designnbuy Webtoprint Private Ltd,");
    expect(text).toContain("• Method: Bank Transfer");
    expect(text).toContain("• Amount received: *₹27,567*");
    expect(text).toContain("*Invoices Settled:*");
    expect(text).toContain("• Applied to invoice INV-000003: ₹27,567");
    expect(text).toContain("*Current Customer Balance:* *₹0 (Fully Paid)*");
    // Ensure "Current Balance" was not listed as a bullet in receipt details
    expect(text).not.toContain("• Current Balance:");
  });

  it("includes remaining balance due when customer has an outstanding balance", () => {
    const built: BuiltDocument = {
      doc: {
        kind: "receipt",
        title: "Payment Receipt",
        number: "RCT-000016",
        date: "2026-10-16",
        to: { name: "Acme Corp" },
        balanceDue: 15000,
        totals: [
          { label: "Amount received", value: "₹10,000" },
          { label: "Net amount", value: "₹10,000" },
          { label: "Current Balance", value: "₹15,000" },
        ],
      },
      meta: {
        toName: "Acme Corp",
        toEmail: null,
        toPhone: "9876543210",
        docNumber: "RCT-000016",
        customerId: "cust-2",
        vendorId: null,
        projectId: null,
      },
    };

    const text = renderDocWhatsAppText(built);
    expect(text).toContain("*Current Customer Balance:* *₹15,000*");
  });

  it("handles advance credit when balance is negative", () => {
    const built: BuiltDocument = {
      doc: {
        kind: "receipt",
        title: "Payment Receipt",
        number: "RCT-000017",
        date: "2026-10-16",
        to: { name: "Advance Payer" },
        balanceDue: -5000,
        totals: [
          { label: "Amount received", value: "₹20,000" },
          { label: "Net amount", value: "₹20,000" },
          { label: "Current Balance", value: "₹5,000 (Advance Credit)" },
        ],
      },
      meta: {
        toName: "Advance Payer",
        toEmail: null,
        toPhone: "9876543210",
        docNumber: "RCT-000017",
        customerId: "cust-3",
        vendorId: null,
        projectId: null,
      },
    };

    const text = renderDocWhatsAppText(built);
    expect(text).toContain("*Current Customer Balance:* *₹5,000 (Advance Credit)*");
  });
});
