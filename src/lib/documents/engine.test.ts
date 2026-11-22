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
    expect(text).toContain("• Date: 16 Oct 2026");
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

  it("sanitizes leaked quotation promotional terms on invoice documents", () => {
    const rawInvTerms =
      "1. Delivery Timeline: 15 days.\n2. Payment Terms: 80% advance taken upon order booking, 20% balance.\n3. Pre-make 100% payment to avail 5% discount + complimentary certified Shree Yantra worth ₹14,999.";
    const hasQuotationText =
      rawInvTerms.length > 35 ||
      rawInvTerms.includes("\n") ||
      /advance taken upon|shree yantra|delivery timeline|order booking|complimentary certified|natural variation/i.test(
        rawInvTerms,
      );
    const cleanTerms = hasQuotationText ? undefined : rawInvTerms || undefined;

    expect(cleanTerms).toBeUndefined();

    const legitimateConciseTerm = "Net 15";
    const hasQuotationText2 =
      legitimateConciseTerm.length > 35 ||
      legitimateConciseTerm.includes("\n") ||
      /advance taken upon|shree yantra|delivery timeline|order booking|complimentary certified|natural variation/i.test(
        legitimateConciseTerm,
      );
    const cleanTerms2 = hasQuotationText2 ? undefined : legitimateConciseTerm || undefined;

    expect(cleanTerms2).toBe("Net 15");
  });

  it("suppresses HSN codes in cash deal documents and formats wall details with product codes", () => {
    const isCashDeal = true;
    const walls = [
      { id: "w1", name: "Suresh Bhai's Bedroom Wall", height: 5, length: 4, unit: "ft", sqft: 20 },
      { id: "w2", name: "Living Area Wall", height: 14, length: 7, unit: "ft", sqft: 98 },
      { id: "w3", name: "Compound Wall", height: 20, length: 10, unit: "ft", sqft: 200 },
    ];
    const prods = [
      { id: "p1", wallId: "w1", productName: "Natural Stone Mosaics", wastagePct: 10 },
      { id: "p2", wallId: "w2", productName: "Natural Stone Mosaics 3x3", wastagePct: 5 },
      {
        id: "p3",
        wallId: "w3",
        productName: "Teakwood Sandstone Veined Ashlar Modular Cladding",
        wastagePct: 5,
      },
    ];

    const rawItems = [
      {
        id: "i1",
        description: "Natural Stone Mosaics (Suresh Bhai's Bedroom Wall)",
        quantity: 22,
        unit: "sq.ft",
        unit_price: 275,
        hsn_sac: "68022190",
        notes: null,
      },
      {
        id: "i2",
        description: "Natural Stone Mosaics 3x3 (Living Area Wall)",
        quantity: 103,
        unit: "sq.ft",
        unit_price: 340,
        hsn_sac: "68022190",
        notes: null,
      },
      {
        id: "i3",
        description: "Teakwood Sandstone Veined Ashlar Modular Cladding (Compound Wall)",
        quantity: 210,
        unit: "sq.ft",
        unit_price: 185,
        hsn_sac: "68022190",
        notes: "Wall: Compound Wall · 20x10 ft (200 sq.ft) · Wastage: 5%\nCatalog Code: ST-WC-080",
      },
      {
        id: "i4",
        description: "Standard Cementitious Stone Adhesive Grey",
        quantity: 8,
        unit: "bag",
        unit_price: 800,
        hsn_sac: "32141000",
        notes: null,
      },
    ];

    const matchedWallIds = new Set<string>();
    const lines = rawItems.map((it) => {
      let label = it.description;
      let notes = it.notes ?? undefined;
      const hsn = isCashDeal ? undefined : (it.hsn_sac ?? undefined);

      const matchedWall = walls.find((w) => {
        if (matchedWallIds.has(w.id)) return false;
        const wn = w.name.toLowerCase();
        const d = (it.description || "").toLowerCase();
        const n = (notes || "").toLowerCase();
        return d.includes(`(${wn})`) || n.includes(`wall: ${wn}`);
      });

      if (matchedWall) {
        matchedWallIds.add(matchedWall.id);
        const matchedProd = prods.find((p) => p.wallId === matchedWall!.id);
        const waste = matchedProd?.wastagePct ?? 5;
        const wallNote = `Wall: ${matchedWall.name} · ${matchedWall.height}×${matchedWall.length} ${matchedWall.unit} (${matchedWall.sqft} sq.ft) · Wastage: ${waste}%`;

        if (!notes || !notes.toLowerCase().includes("wall:")) {
          notes = notes ? `${notes}\n${wallNote}` : wallNote;
        }

        const codeMatch = notes?.match(/Catalog Code:\s*(ST-WC-[A-Za-z0-9_-]+)/i);
        if (codeMatch) {
          label = codeMatch[1];
          notes = notes
            ?.replace(new RegExp(`Catalog Code:\\s*${codeMatch[1]}`, "gi"), "")
            .replace(/\n\s*\n/g, "\n")
            .trim();
        } else {
          label = label.replace(new RegExp(`\\s*\\(${matchedWall.name}\\)\\s*`, "i"), "").trim();
        }
      }

      return { label, notes, hsn, qty: it.quantity };
    });

    // In cash deal, no HSN codes are exposed
    expect(lines.every((l) => l.hsn === undefined)).toBe(true);

    // Wall 1 and 2 now have Wall details populated
    expect(lines[0].notes).toContain(
      "Wall: Suresh Bhai's Bedroom Wall · 5×4 ft (20 sq.ft) · Wastage: 10%",
    );
    expect(lines[1].notes).toContain("Wall: Living Area Wall · 14×7 ft (98 sq.ft) · Wastage: 5%");

    // Wall 3 uses the catalog code as the product title
    expect(lines[2].label).toBe("ST-WC-080");
    expect(lines[2].notes).toBe("Wall: Compound Wall · 20x10 ft (200 sq.ft) · Wastage: 5%");
  });

  it("suppresses tax from WhatsApp totals and includes statutory GST clause in cash deals", () => {
    const cashBuiltDoc: BuiltDocument = {
      doc: {
        kind: "quotation",
        title: "Quotation",
        number: "QUO-000003",
        date: "2026-11-22",
        from: { name: "Stone Tech", address: "Ahmedabad" },
        to: { name: "Suresh Bhai" },
        isCashDeal: true,
        saleMode: "cash",
        lines: [{ label: "ST-WC-080", qty: 210, unit: "sq.ft", rate: "₹185", amount: "₹38,850" }],
        totals: [
          { label: "Subtotal", value: "₹38,850" },
          { label: "Tax", value: "₹0" },
          { label: "Total", value: "₹38,850" },
        ],
        terms:
          "1. Delivery Timeline: 15 days.\n\n2. Taxes: GST will be applicable once the invoice is processed.",
      },
      meta: {
        toName: "Suresh Bhai",
        toEmail: null,
        toPhone: "9876543210",
        docNumber: "QUO-000003",
        customerId: "c1",
        vendorId: null,
        projectId: null,
      },
    };

    const text = renderDocWhatsAppText(cashBuiltDoc);
    expect(text).not.toContain("Tax:");
    expect(text).not.toContain("₹0");
    expect(text).not.toContain("Subtotal: *₹38,850*");
    expect(text).toContain("Total: *₹38,850*");
    expect(text).toContain("GST will be applicable once the invoice is processed");
  });
});
