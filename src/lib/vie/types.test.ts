/**
 * VIE entity-schema tests (Milestone 1 — Hardening & Guardrails).
 *
 * These pin the actual validation behaviour of every existing per-intent
 * entity schema against well-formed, malformed, and partial LLM output —
 * the last line of defense before an ambiguous or malformed classification
 * reaches the Planner (see planner/index.ts's `.parse()` calls, now wrapped
 * by vie.functions.ts's classified error handling on top of this). Run with
 * `bun test`.
 */
import { describe, expect, test } from "bun:test";
import {
  createCustomerEntitiesSchema,
  createQuotationEntitiesSchema,
  createQuotationLineItemEntitySchema,
  logEnquiryEntitiesSchema,
  noteFollowupEntitiesSchema,
} from "./types";
import {
  expectValidEntities,
  expectInvalidEntities,
  validCreateCustomerEntities,
  validCreateQuotationEntities,
  validLogEnquiryEntities,
  validNoteFollowupEntities,
} from "./testSupport/testUtils";

describe("logEnquiryEntitiesSchema", () => {
  test("accepts a fully-populated, well-formed AI response", () => {
    const parsed = expectValidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities());
    expect(parsed.customerName).toBe("Ramesh");
    expect(parsed.quantity).toBe(250);
  });

  test("has no required fields — an empty object is valid on its own", () => {
    // Documented behaviour, not an oversight: every field is optional
    // because a partial extraction (e.g. no rate mentioned) must still
    // reach the Planner rather than be rejected outright — the Planner's
    // blocker logic decides what to do with missing fields, not the schema.
    expectValidEntities(logEnquiryEntitiesSchema, {});
  });

  test("accepts a partial AI response with only some fields present", () => {
    expectValidEntities(logEnquiryEntitiesSchema, { customerName: "Ramesh" });
  });

  test("rejects a non-positive quantity", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: -5 }));
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: 0 }));
  });

  test("rejects a quantity given as a string instead of a number", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: "250" }));
  });

  test("rejects an empty customerName", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ customerName: "" }));
  });

  test("rejects a whitespace-only customerName (trimmed to empty)", () => {
    expectInvalidEntities(
      logEnquiryEntitiesSchema,
      validLogEnquiryEntities({ customerName: "   " }),
    );
  });

  test("rejects a non-positive rate", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ rate: -145 }));
  });

  test("silently strips an unexpected/unknown field rather than rejecting the whole payload", () => {
    // Zod objects strip unknown keys by default (no .strict() on this
    // schema) — one extra, unrecognized field from the LLM must never fail
    // understanding entirely.
    const parsed = expectValidEntities(logEnquiryEntitiesSchema, {
      ...validLogEnquiryEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});

describe("noteFollowupEntitiesSchema", () => {
  test("accepts a fully-populated, well-formed AI response", () => {
    const parsed = expectValidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities());
    expect(parsed.note).toBe("Customer rejected the offer - price too high");
  });

  test("accepts the minimal valid payload — note only (its one required field)", () => {
    expectValidEntities(noteFollowupEntitiesSchema, { note: "General follow-up" });
  });

  test("rejects a payload missing the required `note` field", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, { targetName: "Ramesh", relativeDays: 3 });
  });

  test("rejects an empty `note`", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities({ note: "" }));
  });

  test("rejects `note` given as a non-string type", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities({ note: 123 }));
  });

  test("rejects a negative relativeDays", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ relativeDays: -1 }),
    );
  });

  test("rejects a non-integer relativeDays", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ relativeDays: 2.5 }),
    );
  });

  test("rejects a channel outside the known enum", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ channel: "sms" }),
    );
  });

  test("accepts a partial AI response matching the prompt's own few-shot example (note + relativeDays only)", () => {
    expectValidEntities(noteFollowupEntitiesSchema, { note: "General follow-up", relativeDays: 3 });
  });

  test("silently strips an unexpected/unknown field rather than rejecting the whole payload", () => {
    const parsed = expectValidEntities(noteFollowupEntitiesSchema, {
      ...validNoteFollowupEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});

describe("createCustomerEntitiesSchema", () => {
  test("accepts a fully-populated, well-formed AI response", () => {
    const parsed = expectValidEntities(createCustomerEntitiesSchema, validCreateCustomerEntities());
    expect(parsed.customerName).toBe("Meera");
    expect(parsed.mobile).toBe("9724455663");
    expect(parsed.customerType).toBe("contractor");
  });

  test("has no required fields — an empty object is valid on its own", () => {
    // Documented behaviour, not an oversight: a create_customer utterance
    // with no phone number extracted still reaches the Planner, whose
    // blocker logic (planCreateCustomer) is what forces "draft" — not this
    // schema. Mirrors logEnquiryEntitiesSchema's own documented behaviour.
    expectValidEntities(createCustomerEntitiesSchema, {});
  });

  test("accepts a partial AI response with only customerName present", () => {
    expectValidEntities(createCustomerEntitiesSchema, { customerName: "Ramesh" });
  });

  test("rejects an empty customerName", () => {
    expectInvalidEntities(
      createCustomerEntitiesSchema,
      validCreateCustomerEntities({ customerName: "" }),
    );
  });

  test("rejects a whitespace-only customerName (trimmed to empty)", () => {
    expectInvalidEntities(
      createCustomerEntitiesSchema,
      validCreateCustomerEntities({ customerName: "   " }),
    );
  });

  test("rejects mobile given as a number instead of a string", () => {
    expectInvalidEntities(
      createCustomerEntitiesSchema,
      validCreateCustomerEntities({ mobile: 9724455663 }),
    );
  });

  test("rejects a customerType outside the known enum", () => {
    expectInvalidEntities(
      createCustomerEntitiesSchema,
      validCreateCustomerEntities({ customerType: "wholesaler" }),
    );
  });

  test("silently strips an unexpected/unknown field rather than rejecting the whole payload", () => {
    const parsed = expectValidEntities(createCustomerEntitiesSchema, {
      ...validCreateCustomerEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});

describe("createQuotationLineItemEntitySchema (VIE Phase 3 — Milestone 5: Line-Item Extraction)", () => {
  test("accepts a fully-populated, well-formed line item", () => {
    const parsed = expectValidEntities(createQuotationLineItemEntitySchema, {
      productText: "Mint",
      quantity: 250,
      unit: "sqft",
      rate: 145,
    });
    expect(parsed.productText).toBe("Mint");
    expect(parsed.quantity).toBe(250);
    expect(parsed.unit).toBe("sqft");
    expect(parsed.rate).toBe(145);
  });

  test("has no required fields — an empty object is valid on its own (the Planner's missing-quantity blocker decides what to do, not this schema)", () => {
    expectValidEntities(createQuotationLineItemEntitySchema, {});
  });

  test("accepts a partial line item with only productText and quantity present", () => {
    expectValidEntities(createQuotationLineItemEntitySchema, { productText: "Mint", quantity: 10 });
  });

  test("rejects a non-positive quantity", () => {
    expectInvalidEntities(createQuotationLineItemEntitySchema, { quantity: -5 });
    expectInvalidEntities(createQuotationLineItemEntitySchema, { quantity: 0 });
  });

  test("rejects a quantity given as a string instead of a number", () => {
    expectInvalidEntities(createQuotationLineItemEntitySchema, { quantity: "250" });
  });

  test("rejects a non-positive rate", () => {
    expectInvalidEntities(createQuotationLineItemEntitySchema, { rate: -145 });
    expectInvalidEntities(createQuotationLineItemEntitySchema, { rate: 0 });
  });

  test("rejects an empty productText (trimmed to empty)", () => {
    expectInvalidEntities(createQuotationLineItemEntitySchema, { productText: "   " });
  });

  test("silently strips an unexpected/unknown per-item field rather than rejecting the whole payload", () => {
    const parsed = expectValidEntities(createQuotationLineItemEntitySchema, {
      productText: "Mint",
      quantity: 10,
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});

describe("createQuotationEntitiesSchema (VIE Phase 3 — Milestone 5: Line-Item Extraction)", () => {
  test("accepts a fully-populated, well-formed AI response with multiple items", () => {
    const parsed = expectValidEntities(
      createQuotationEntitiesSchema,
      validCreateQuotationEntities(),
    );
    expect(parsed.customerName).toBe("Ramesh");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items?.[0]).toMatchObject({ productText: "Mint", quantity: 250 });
  });

  test("has no required fields — an empty object is valid on its own", () => {
    // Same discipline as every other entities schema here: a partial
    // extraction (e.g. no items mentioned) must still reach the Planner,
    // whose blocker logic (planCreateQuotation) decides what forces
    // "draft," not this schema.
    expectValidEntities(createQuotationEntitiesSchema, {});
  });

  test("accepts customerName with no items at all", () => {
    expectValidEntities(createQuotationEntitiesSchema, { customerName: "Ramesh" });
  });

  test("accepts an explicitly empty items array", () => {
    const parsed = expectValidEntities(createQuotationEntitiesSchema, {
      customerName: "Ramesh",
      items: [],
    });
    expect(parsed.items).toEqual([]);
  });

  test("accepts a single-item array", () => {
    const parsed = expectValidEntities(createQuotationEntitiesSchema, {
      customerName: "Ramesh",
      items: [{ productText: "Mint", quantity: 300, unit: "sqft", rate: 145 }],
    });
    expect(parsed.items).toHaveLength(1);
  });

  test("rejects when one item in the array is malformed (non-positive quantity) — the whole payload fails, not just that item", () => {
    expectInvalidEntities(
      createQuotationEntitiesSchema,
      validCreateQuotationEntities({
        items: [
          { productText: "Mint", quantity: 250, unit: "sqft", rate: 145 },
          { productText: "Kadappa", quantity: -1, unit: "sqft", rate: 210 },
        ],
      }),
    );
  });

  test("rejects an empty customerName", () => {
    expectInvalidEntities(
      createQuotationEntitiesSchema,
      validCreateQuotationEntities({ customerName: "" }),
    );
  });

  test("silently strips an unexpected/unknown top-level field rather than rejecting the whole payload", () => {
    const parsed = expectValidEntities(createQuotationEntitiesSchema, {
      ...validCreateQuotationEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });

  describe("projectText and category (VIE Phase 3 — Milestone 6: Planner Alignment)", () => {
    test("accepts a well-formed projectText", () => {
      const parsed = expectValidEntities(createQuotationEntitiesSchema, {
        customerName: "Ramesh",
        projectText: "Shah Villa",
      });
      expect(parsed.projectText).toBe("Shah Villa");
    });

    test("rejects an empty projectText", () => {
      expectInvalidEntities(createQuotationEntitiesSchema, { projectText: "" });
    });

    test("rejects a whitespace-only projectText (trimmed to empty)", () => {
      expectInvalidEntities(createQuotationEntitiesSchema, { projectText: "   " });
    });

    test("accepts every real QUOTE_CATEGORIES value", () => {
      for (const category of [
        "supply_only",
        "supply_and_installation",
        "installation_only",
        "material_and_labour",
      ] as const) {
        const parsed = expectValidEntities(createQuotationEntitiesSchema, { category });
        expect(parsed.category).toBe(category);
      }
    });

    test("rejects a category outside the known enum", () => {
      expectInvalidEntities(createQuotationEntitiesSchema, { category: "free_shipping" });
    });

    test("projectText and category are both absent by default — never fabricated", () => {
      const parsed = expectValidEntities(createQuotationEntitiesSchema, { customerName: "Ramesh" });
      expect(parsed.projectText).toBeUndefined();
      expect(parsed.category).toBeUndefined();
    });
  });
});
