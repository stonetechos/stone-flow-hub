import { describe, expect, it } from "bun:test";
import {
  calculateMatchScore,
  correlateDispatchesToQuotes,
  findBestQuoteForCustomer,
  type DispatchMatchCandidate,
  type QuoteMatchCandidate,
} from "./matching";

describe("Quotation & Delivery Challan Correlation Engine", () => {
  const stallonQuotes: QuoteMatchCandidate[] = [
    {
      id: "quote-stallion-13",
      quote_no: "QUO-000013",
      customer_id: "cust-stallion",
      project_id: "proj-stallion",
      total: 56700,
      created_at: "2026-10-26T10:00:00Z",
      status: "accepted",
    },
    {
      id: "quote-stallion-10",
      quote_no: "QUO-000010",
      customer_id: "cust-stallion",
      project_id: "proj-stallion",
      total: 50259,
      created_at: "2026-10-10T10:00:00Z",
      status: "accepted",
    },
  ];

  const stallionDispatch: DispatchMatchCandidate = {
    id: "disp-stallion-6",
    dispatch_no: "DSP-000006",
    customer_id: "cust-stallion",
    project_id: "proj-stallion",
    dispatch_date: "2026-10-26",
    carting_charge: 3750,
    status: "delivered",
    created_at: "2026-10-26T12:00:00Z",
    notes: "Delivery to site by Ashish Ji (Self)",
  };

  it("reliably links Stallion Realities dispatch DSP-000006 to QUO-000013 by customer and date proximity", () => {
    const correlation = correlateDispatchesToQuotes(stallonQuotes, [stallionDispatch]);

    expect(correlation["quote-stallion-13"]).toBeDefined();
    expect(correlation["quote-stallion-13"].length).toBe(1);
    expect(correlation["quote-stallion-13"][0].dispatch_no).toBe("DSP-000006");
    // Since DSP-000006 matched QUO-000013, QUO-000010 remains empty or pending
    expect(correlation["quote-stallion-10"].length).toBe(0);
  });

  it("prioritizes explicit quote_id over customer-level matching", () => {
    const explicitDispatch: DispatchMatchCandidate = {
      id: "disp-explicit",
      dispatch_no: "DSP-000099",
      quote_id: "quote-stallion-10",
      customer_id: "cust-stallion",
      status: "planned",
    };

    const correlation = correlateDispatchesToQuotes(stallonQuotes, [explicitDispatch]);
    expect(correlation["quote-stallion-10"].length).toBe(1);
    expect(correlation["quote-stallion-10"][0].dispatch_no).toBe("DSP-000099");
  });

  it("prioritizes document_lineage links", () => {
    const lineageDispatch: DispatchMatchCandidate = {
      id: "disp-lin",
      dispatch_no: "DSP-000088",
      customer_id: "cust-stallion",
      status: "in_transit",
    };

    const correlation = correlateDispatchesToQuotes(stallonQuotes, [lineageDispatch], {
      lineage: [
        {
          source_id: "quote-stallion-10",
          target_id: "disp-lin",
          source_type: "quote",
          target_type: "dispatch",
        },
      ],
    });

    expect(correlation["quote-stallion-10"].length).toBe(1);
    expect(correlation["quote-stallion-10"][0].dispatch_no).toBe("DSP-000088");
  });

  it("matches dispatches when notes mention Quote number", () => {
    const notesDispatch: DispatchMatchCandidate = {
      id: "disp-notes",
      dispatch_no: "DSP-000077",
      notes: "Delivery challan for Quote #QUO-000010 on urgent basis",
      status: "delivered",
    };

    const correlation = correlateDispatchesToQuotes(stallonQuotes, [notesDispatch]);
    expect(correlation["quote-stallion-10"].length).toBe(1);
    expect(correlation["quote-stallion-10"][0].dispatch_no).toBe("DSP-000077");
  });

  it("finds best matching quote for customer when creating a new delivery challan", () => {
    const best = findBestQuoteForCustomer("cust-stallion", stallonQuotes, "proj-stallion");
    expect(best).not.toBeNull();
    // Most recent accepted quote is QUO-000013
    expect(best?.quote_no).toBe("QUO-000013");
  });

  it("ignores cancelled dispatches from being linked to active invoices", () => {
    const cancelledDispatch: DispatchMatchCandidate = {
      id: "disp-canc",
      dispatch_no: "DSP-000000",
      quote_id: "quote-stallion-13",
      status: "cancelled",
    };

    const correlation = correlateDispatchesToQuotes(stallonQuotes, [cancelledDispatch]);
    expect(correlation["quote-stallion-13"].length).toBe(0);
  });
});
