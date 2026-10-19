import { describe, expect, it } from "bun:test";
import { nextGuidedStep, type GuidedContext } from "./steps";
import { downstreamQueryKey } from "./downstream";

describe("Guided Workflow Steps Engine", () => {
  it("returns null when entityId is empty or whitespace", () => {
    expect(nextGuidedStep("customer", "")).toBeNull();
    expect(nextGuidedStep("customer", "   ")).toBeNull();
  });

  it("recommends quotation for customer and cleans search params", () => {
    const step = nextGuidedStep("customer", "cust-123");
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/quotes/new");
    expect(step?.search).toEqual({ customer: "cust-123" });
    expect(step?.skipKey).toBe("gwa:customer:cust-123:quote");
    expect(step?.ctaLabel).toContain("New quotation");
  });

  it("recommends quotation for enquiry with parent customer context", () => {
    const ctx: GuidedContext = { customer_id: "cust-456" };
    const step = nextGuidedStep("enquiry", "enq-789", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/quotes/new");
    expect(step?.search).toEqual({
      customer: "cust-456",
      enquiry: "enq-789",
    });
    expect(step?.skipKey).toBe("gwa:enquiry:enq-789:quote");
  });

  it("recommends quotation for project with project and customer context", () => {
    const ctx: GuidedContext = { customer_id: "cust-456" };
    const step = nextGuidedStep("project", "proj-101", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/quotes/new");
    expect(step?.search).toEqual({
      project: "proj-101",
      customer: "cust-456",
    });
  });

  it("recommends invoice for quote with quote_id and customer_id", () => {
    const ctx: GuidedContext = { customer_id: "cust-123" };
    const step = nextGuidedStep("quote", "quote-555", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/invoices/new");
    expect(step?.search).toEqual({
      quote: "quote-555",
      customer: "cust-123",
    });
    expect(step?.skipKey).toBe("gwa:quote:quote-555:invoice");
  });

  it("recommends dispatch for invoice with customer_id and invoice_id", () => {
    const ctx: GuidedContext = { customer_id: "cust-123" };
    const step = nextGuidedStep("invoice", "inv-888", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/dispatch/new");
    expect(step?.search).toEqual({
      customer: "cust-123",
      invoice: "inv-888",
    });
  });

  it("intelligently does not ask to create a dispatch if delivery challan is already created", () => {
    // When delivery challan is already made and balance is due: recommends recording customer payment
    const ctxWithChallan: GuidedContext = {
      customer_id: "cust-123",
      has_dispatch: true,
      balance_due: 32320,
    };
    const step = nextGuidedStep("invoice", "inv-888", ctxWithChallan);
    expect(step).not.toBeNull();
    expect(step?.title).toBe("Record customer payment");
    expect(step?.href).toBe("/receipts/new");
    expect(step?.ctaLabel).toContain("Record payment");
    expect(step?.search).toEqual({
      customer: "cust-123",
      invoice: "inv-888",
    });

    // When delivery challan is already made and invoice is fully paid: returns null
    const ctxPaid: GuidedContext = {
      customer_id: "cust-123",
      has_dispatch: true,
      balance_due: 0,
    };
    expect(nextGuidedStep("invoice", "inv-888", ctxPaid)).toBeNull();
  });

  it("recommends customer payment for dispatch with invoice context", () => {
    const ctx: GuidedContext = { customer_id: "cust-123", invoice_id: "inv-888" };
    const step = nextGuidedStep("dispatch", "disp-999", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/receipts/new");
    expect(step?.search).toEqual({
      customer: "cust-123",
      invoice: "inv-888",
    });
    expect(step?.skipKey).toBe("gwa:dispatch:disp-999:receipt");
  });

  it("recommends purchase invoice for purchase_order with vendor context", () => {
    const ctx: GuidedContext = { vendor_id: "vend-222" };
    const step = nextGuidedStep("purchase_order", "po-333", ctx);
    expect(step).not.toBeNull();
    expect(step?.href).toBe("/purchase-invoices/new");
    expect(step?.search).toEqual({
      vendor: "vend-222",
    });
  });

  it("returns null for terminal receipt entity", () => {
    expect(nextGuidedStep("receipt", "rec-001")).toBeNull();
  });

  it("generates correct downstream query keys", () => {
    const key = downstreamQueryKey("customer", "c-1");
    expect(key).toEqual(["guided-downstream", "customer", "c-1"]);
  });
});
