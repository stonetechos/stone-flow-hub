/**
 * Business Intent Model tests — pure, no I/O. Run with `bun test`.
 */
import { describe, expect, test } from "bun:test";
import {
  businessIntentSchema,
  BusinessIntentSourceNotImplementedError,
  getBusinessIntentSourceAdapter,
  toCreateCustomerEntities,
  toCreateQuotationEntities,
  toLogEnquiryEntities,
  toNoteFollowupEntities,
  type BusinessIntent,
} from "./businessIntent";

describe("businessIntentSchema", () => {
  test("parses a minimal intent with only the required fields", () => {
    const parsed = businessIntentSchema.parse({
      source: "text",
      rawText: "hello",
      capturedAt: "2026-07-28T00:00:00.000Z",
    });
    expect(parsed.source).toBe("text");
  });

  test("parses a fully-populated intent covering every section", () => {
    const input: BusinessIntent = {
      source: "voice",
      rawText: "Ek customer hai Shantilal Patel Naroda 350 sq ft Mint panels",
      language: "mixed",
      capturedAt: "2026-07-28T00:00:00.000Z",
      confidence: 0.8,
      customer: { name: "Shantilal Patel", city: "Naroda" },
      project: { name: "Naroda site", location: "Naroda" },
      requirements: { summary: "Mint panels for cladding", notes: ["thick strips won't work"] },
      products: [{ name: "Mint panels", quantity: 350, unit: "sq ft" }],
      measurements: [{ raw: "350 sq ft", value: 350, unit: "sq ft" }],
      budget: { amountInr: 500000, isApprox: true },
      timeline: { relativeDays: 14 },
      tasks: [{ title: "Send quote" }],
      followups: [{ note: "Call back after site visit", relativeDays: 2, channel: "call" }],
      documents: [{ fileId: "f1", fileName: "site-photo.jpg" }],
      actions: [{ type: "log_enquiry", confidence: 0.7 }],
    };
    const parsed = businessIntentSchema.parse(input);
    expect(parsed.customer?.name).toBe("Shantilal Patel");
    expect(parsed.products?.[0].quantity).toBe(350);
  });

  test("rejects an unknown source", () => {
    expect(() =>
      businessIntentSchema.parse({
        source: "fax",
        rawText: "x",
        capturedAt: "2026-07-28T00:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("source adapters", () => {
  test("text adapter is implemented and is a pure pass-through", async () => {
    const adapter = getBusinessIntentSourceAdapter("text");
    expect(adapter?.implemented).toBe(true);
    const result = await adapter!.normalize({
      text: "hello world",
      capturedAt: "2026-07-28T00:00:00.000Z",
    });
    expect(result.rawText).toBe("hello world");
    expect(result.source).toBe("text");
  });

  test("voice/whatsapp/email/ocr adapters are registered but throw — no extraction implemented yet", async () => {
    for (const source of ["voice", "whatsapp", "email", "ocr"] as const) {
      const adapter = getBusinessIntentSourceAdapter(source);
      expect(adapter?.implemented).toBe(false);
      await expect(adapter!.normalize({} as never)).rejects.toBeInstanceOf(
        BusinessIntentSourceNotImplementedError,
      );
    }
  });
});

describe("mapping to VIE's existing per-intent entity shapes", () => {
  const base: BusinessIntent = {
    source: "text",
    rawText: "x",
    capturedAt: "2026-07-28T00:00:00.000Z",
  };

  test("toCreateCustomerEntities maps every customer field", () => {
    const result = toCreateCustomerEntities({
      ...base,
      customer: {
        name: "Ramesh Patel",
        mobile: "9998887777",
        email: "ramesh@example.com",
        address: "123 Main St",
        city: "Ahmedabad",
        customerType: "builder",
      },
    });
    expect(result).toEqual({
      customerName: "Ramesh Patel",
      mobile: "9998887777",
      email: "ramesh@example.com",
      address: "123 Main St",
      city: "Ahmedabad",
      customerType: "builder",
    });
  });

  test("toCreateCustomerEntities returns an empty object when there's no customer section", () => {
    expect(toCreateCustomerEntities(base)).toEqual({});
  });

  test("toLogEnquiryEntities maps the first product plus budget/timeline/requirements", () => {
    const result = toLogEnquiryEntities({
      ...base,
      customer: { name: "Shiv Solanki" },
      products: [
        { name: "Kandla Grey", quantity: 100, unit: "sq ft", unitPrice: 120 },
        { name: "Mint", quantity: 50, unit: "sq ft" },
      ],
      budget: { amountInr: 50000 },
      timeline: { relativeDays: 7 },
      requirements: { summary: "Needs polished finish" },
    });
    expect(result.customerName).toBe("Shiv Solanki");
    expect(result.productText).toBe("Kandla Grey");
    expect(result.quantity).toBe(100);
    expect(result.unit).toBe("sq ft");
    expect(result.rate).toBe(120);
    expect(result.budgetInr).toBe(50000);
    expect(result.timelineRelativeDays).toBe(7);
    expect(result.requirements).toBe("Needs polished finish");
  });

  test("toCreateQuotationEntities maps every product into items[]", () => {
    const result = toCreateQuotationEntities({
      ...base,
      customer: { name: "Darshan Shah" },
      project: { name: "Vastrapur Villa" },
      products: [
        { name: "Kandla Grey", quantity: 100, unit: "sq ft", unitPrice: 120 },
        { name: "Mint", quantity: 50, unit: "sq ft", unitPrice: 200 },
      ],
    });
    expect(result.customerName).toBe("Darshan Shah");
    expect(result.projectText).toBe("Vastrapur Villa");
    expect(result.items).toEqual([
      { productText: "Kandla Grey", quantity: 100, unit: "sq ft", rate: 120 },
      { productText: "Mint", quantity: 50, unit: "sq ft", rate: 200 },
    ]);
  });

  test("toCreateQuotationEntities omits items entirely when there are no products", () => {
    const result = toCreateQuotationEntities({ ...base, customer: { name: "X" } });
    expect(result.items).toBeUndefined();
  });

  test("toNoteFollowupEntities maps the first follow-up", () => {
    const result = toNoteFollowupEntities({
      ...base,
      customer: { name: "Ramesh Patel" },
      followups: [{ note: "Call back tomorrow", relativeDays: 1, channel: "call" }],
    });
    expect(result.targetName).toBe("Ramesh Patel");
    expect(result.note).toBe("Call back tomorrow");
    expect(result.relativeDays).toBe(1);
    expect(result.channel).toBe("call");
  });

  test("toNoteFollowupEntities never fabricates a note when there is none", () => {
    const result = toNoteFollowupEntities({ ...base, customer: { name: "Ramesh Patel" } });
    expect(result.targetName).toBe("Ramesh Patel");
    expect(result.note).toBeUndefined();
  });
});
