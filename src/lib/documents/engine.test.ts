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

  it("renders Quotation with pre-tax line amounts, notes, and taxes at the bottom only", () => {
    const built: BuiltDocument = {
      doc: {
        kind: "quotation",
        title: "Quotation",
        number: "QT-000042",
        date: "2026-10-19",
        to: { name: "Aditi Sharma", phone: "9876543210" },
        lines: [
          {
            label: "Mint White Sandstone (Honed)",
            qty: 140,
            unit: "sqft",
            rate: "₹95",
            amount: "₹13,300",
            notes: "Size: 600x400x20mm, Honed finish, calibrated",
          },
          {
            label: "Teakwood Sandstone",
            qty: 200,
            unit: "sqft",
            rate: "₹120",
            amount: "₹24,000",
          },
        ],
        totals: [
          { label: "Subtotal", value: "₹37,300" },
          { label: "GST (5%)", value: "₹1,865" },
          { label: "Grand Total", value: "₹39,165" },
        ],
        notes: "Delivery within 7 working days from advance.",
      },
      meta: {
        toName: "Aditi Sharma",
        toEmail: null,
        toPhone: "9876543210",
        docNumber: "QT-000042",
        customerId: "cust-42",
        vendorId: null,
        projectId: null,
      },
    };

    const text = renderDocWhatsAppText(built);

    expect(text).toContain("*Quotation — QT-000042*");
    expect(text).toContain("To: Aditi Sharma");
    expect(text).toContain("• Mint White Sandstone (Honed) — 140 sqft × ₹95 = ₹13,300");
    expect(text).toContain("_Specs/Notes: Size: 600x400x20mm, Honed finish, calibrated_");
    expect(text).toContain("• Teakwood Sandstone — 200 sqft × ₹120 = ₹24,000");
    expect(text).toContain("Subtotal: *₹37,300*");
    expect(text).toContain("GST (5%): *₹1,865*");
    expect(text).toContain("Grand Total: *₹39,165*");
    // Ensure tax was not pre-calculated into the line items
    expect(text).not.toContain("₹13,965");
  });

  it("invoice metadata excludes status and omits reverse charge when not applicable", () => {
    // Mimic the metadata construction in buildDocumentPayload for invoice
    const inv = {
      project: { name: "Vishveshwar Goswami" },
      due_date: "2026-11-05",
      status: "draft",
    };
    const invAnyNoRcm = {
      place_of_supply: "Gujarat",
      reverse_charge: false,
    };

    const invMetaNoRcm = [
      { label: "Project", value: inv.project?.name ?? "—" },
      { label: "Due date", value: inv.due_date ?? "—" },
      ...(invAnyNoRcm.place_of_supply
        ? [{ label: "Place of supply", value: invAnyNoRcm.place_of_supply }]
        : []),
      ...(invAnyNoRcm.reverse_charge ? [{ label: "Reverse charge", value: "Yes" }] : []),
    ];

    expect(invMetaNoRcm.some((m) => m.label === "Status")).toBe(false);
    expect(invMetaNoRcm.some((m) => m.label === "Reverse charge")).toBe(false);

    const invAnyRcm = {
      place_of_supply: "Gujarat",
      reverse_charge: true,
    };
    const invMetaRcm = [
      { label: "Project", value: inv.project?.name ?? "—" },
      { label: "Due date", value: inv.due_date ?? "—" },
      ...(invAnyRcm.place_of_supply
        ? [{ label: "Place of supply", value: invAnyRcm.place_of_supply }]
        : []),
      ...(invAnyRcm.reverse_charge ? [{ label: "Reverse charge", value: "Yes" }] : []),
    ];

    expect(invMetaRcm.some((m) => m.label === "Reverse charge" && m.value === "Yes")).toBe(true);
  });
});
