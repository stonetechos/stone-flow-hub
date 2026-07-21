/**
 * Tests for the "create_quotation" Action Registry handler
 * (actions/createQuotation.ts) — VIE Phase 3, Milestone 4: Action Handler.
 * Calls the same createQuote() the manual "New Quotation" form calls, and
 * validates candidate input with the real, reused quoteCreateSchema before
 * calling it — never a hand-rolled duplicate of that schema's field checks.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts
 * (quotesApiMock, added this milestone) — see that file's header comment
 * for why a private partial mock.module() call is unsafe when the whole
 * suite runs together. quoteCreateSchema itself is NOT mocked — it's real,
 * pure Zod logic, and exercising the real schema is the whole point of
 * "reuse the existing quote schema" (this milestone's own instruction).
 *
 * Captures its own handler reference once at import time — mirrors
 * createCustomer.test.ts's own pattern, given registry.ts's process-wide
 * singleton Map.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { quotesApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";
import { getVieAction } from "./registry";

await import("./createQuotation");
const handler = getVieAction("create_quotation");
if (!handler) throw new Error("create_quotation handler failed to self-register on import");

const VALID_PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("create_quotation action handler", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  describe("handler registration", () => {
    test("self-registers under the 'create_quotation' intent on import", () => {
      expect(getVieAction("create_quotation")).toBe(handler);
    });
  });

  describe("successful draft creation", () => {
    test("valid project + priced line item -> calls createQuote with the schema-parsed shape, returns linkedRecordType/linkedRecordId", async () => {
      quotesApiMock.createQuote.mockImplementation(async () => ({ id: "quote-1" }));

      const result = await handler({
        project_id: VALID_PROJECT_ID,
        notes: 'AI-logged from: "Quote 300 sqft Mint Stone."',
        items: [{ description: "Mint Stone", quantity: 300, unit: "sqft", unit_price: 145 }],
      });

      expect(quotesApiMock.createQuote).toHaveBeenCalledWith({
        project_id: VALID_PROJECT_ID,
        enquiry_id: null,
        category: null,
        notes: 'AI-logged from: "Quote 300 sqft Mint Stone."',
        items: [
          {
            description: "Mint Stone",
            quantity: 300,
            unit: "sqft",
            unit_price: 145,
            tax_pct: 0,
          },
        ],
      });
      expect(result).toEqual({ linkedRecordType: "quote", linkedRecordId: "quote-1" });
    });

    test("multiple priced line items are all passed through to createQuote", async () => {
      quotesApiMock.createQuote.mockImplementation(async () => ({ id: "quote-2" }));

      await handler({
        project_id: VALID_PROJECT_ID,
        items: [
          { description: "Mint", quantity: 100, unit_price: 100 },
          { description: "Kadappa", quantity: 200, unit_price: 210 },
        ],
      });

      const call = quotesApiMock.createQuote.mock.calls[0][0] as { items: unknown[] };
      expect(call.items).toHaveLength(2);
    });

    test("category and enquiry_id pass through when present, instead of being defaulted to null", async () => {
      quotesApiMock.createQuote.mockImplementation(async () => ({ id: "quote-3" }));

      await handler({
        project_id: VALID_PROJECT_ID,
        category: "supply_and_installation",
        enquiry_id: "22222222-2222-2222-2222-222222222222",
        items: [{ description: "Kadappa", quantity: 400, unit_price: 210 }],
      });

      expect(quotesApiMock.createQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "supply_and_installation",
          enquiry_id: "22222222-2222-2222-2222-222222222222",
        }),
      );
    });
  });

  describe("missing project", () => {
    test("no project_id at all -> throws an itemized error naming project_id, never calls createQuote", async () => {
      await expect(
        handler({ items: [{ description: "Mint", quantity: 10, unit_price: 145 }] }),
      ).rejects.toThrow(/project_id/);
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });

    test("project_id explicitly null (planCreateQuotation's own shape when resolution failed) -> same blocked outcome", async () => {
      await expect(
        handler({
          project_id: null,
          items: [{ description: "Mint", quantity: 10, unit_price: 145 }],
        }),
      ).rejects.toThrow(/project_id/);
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });

    test("the thrown message says the fields were never fabricated, not silently invented", async () => {
      await expect(handler({ project_id: null, items: [] })).rejects.toThrow(/never fabricated/);
    });
  });

  describe("missing required prices", () => {
    test("a line item missing unit_price -> throws an itemized error naming items.0.unit_price, never calls createQuote", async () => {
      await expect(
        handler({
          project_id: VALID_PROJECT_ID,
          items: [{ description: "Mint Stone", quantity: 300 }],
        }),
      ).rejects.toThrow(/items\.0\.unit_price/);
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });

    test("no unit_price is ever defaulted to 0 or invented — a missing price fails validation rather than silently passing as free", async () => {
      await expect(
        handler({
          project_id: VALID_PROJECT_ID,
          items: [{ description: "Mint Stone", quantity: 300 }],
        }),
      ).rejects.toThrow();
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });

    test("no line items at all (Milestone 2's current Planner shape — items is never populated yet) -> blocked the same way", async () => {
      await expect(handler({ project_id: VALID_PROJECT_ID })).rejects.toThrow(/items/);
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });

    test("one priced item and one unpriced item -> the whole plan is still blocked (all-or-nothing), not a partial quote", async () => {
      await expect(
        handler({
          project_id: VALID_PROJECT_ID,
          items: [
            { description: "Mint", quantity: 100, unit_price: 100 },
            { description: "Kadappa", quantity: 200 },
          ],
        }),
      ).rejects.toThrow(/items\.1\.unit_price/);
      expect(quotesApiMock.createQuote).not.toHaveBeenCalled();
    });
  });

  describe("API failure propagation", () => {
    test("createQuote rejecting (e.g. project deleted between resolution and execution) propagates unchanged, is not swallowed", async () => {
      quotesApiMock.createQuote.mockImplementation(async () => {
        throw new Error("Selected project not found");
      });

      await expect(
        handler({
          project_id: VALID_PROJECT_ID,
          items: [{ description: "Mint", quantity: 10, unit_price: 145 }],
        }),
      ).rejects.toThrow("Selected project not found");
    });

    test("a rejected createQuote is still only called once — the handler doesn't retry or swallow and continue", async () => {
      quotesApiMock.createQuote.mockImplementation(async () => {
        throw new Error("Database connection lost");
      });

      await expect(
        handler({
          project_id: VALID_PROJECT_ID,
          items: [{ description: "Mint", quantity: 10, unit_price: 145 }],
        }),
      ).rejects.toThrow("Database connection lost");
      expect(quotesApiMock.createQuote).toHaveBeenCalledTimes(1);
    });
  });
});
