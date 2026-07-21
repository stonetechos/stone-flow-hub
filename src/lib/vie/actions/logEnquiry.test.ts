/**
 * Tests for the "log_enquiry" Action Registry handler
 * (actions/logEnquiry.ts) — the ONLY place in this feature that writes an
 * enquiry, via the same createEnquiry() the manual "New Enquiry" form calls
 * (ADR-0001 requirement 2). These tests assert the handler transforms the
 * Planner's resolved params into exactly the createEnquiry() call shape the
 * real module function expects, and the unreachable-in-practice guard for a
 * missing customer_id actually guards.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts —
 * see that file's header comment for why a private partial mock.module()
 * call is unsafe when the whole suite runs together. registerVieAction()'s
 * backing Map is process-wide singleton state shared with
 * actions/registry.test.ts, so this file captures its own handler reference
 * ONCE, immediately after importing the module under test — a later test
 * file re-registering a stub handler for the same intent cannot retroactively
 * change a reference already captured here.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { enquiriesApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";
import { getVieAction } from "./registry";

await import("./logEnquiry");
const handler = getVieAction("log_enquiry");
if (!handler) throw new Error("log_enquiry handler failed to self-register on import");

describe("log_enquiry action handler", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  test("no customer_id -> throws without ever calling createEnquiry (Planner contract guard)", async () => {
    await expect(handler({ requirement: "250 sqft Mint" })).rejects.toThrow(
      "log_enquiry handler invoked without a resolved customer_id",
    );
    expect(enquiriesApiMock.createEnquiry).not.toHaveBeenCalled();
  });

  test("null customer_id -> also throws (not just undefined)", async () => {
    await expect(handler({ customer_id: null, requirement: "x" })).rejects.toThrow(
      "log_enquiry handler invoked without a resolved customer_id",
    );
  });

  test("valid params -> calls createEnquiry with the exact expected shape and source 'AI Assistant'", async () => {
    enquiriesApiMock.createEnquiry.mockImplementation(async () => ({
      id: "enq-1",
      enquiry_no: "ENQ-000123",
    }));

    const result = await handler({
      customer_id: "cust-1",
      requirement: "250 sqft Mint at Rs. 145/sqft",
      budget_inr: 36250,
      notes: 'AI-logged from: "Customer Ramesh wants 250 sqft Mint at 145."',
    });

    expect(enquiriesApiMock.createEnquiry).toHaveBeenCalledWith({
      customer_id: "cust-1",
      customer_name: "",
      mobile: "",
      email: undefined,
      source: "AI Assistant",
      requirement: "250 sqft Mint at Rs. 145/sqft",
      budget_inr: 36250,
      notes: 'AI-logged from: "Customer Ramesh wants 250 sqft Mint at 145."',
      priority: "normal",
      required_delivery_date: undefined,
    });
    expect(result).toEqual({ linkedRecordType: "enquiry", linkedRecordId: "enq-1" });
  });

  test("missing requirement -> coerced to an empty string, not the literal 'undefined'", async () => {
    enquiriesApiMock.createEnquiry.mockImplementation(async () => ({ id: "enq-2" }));
    await handler({ customer_id: "cust-1" });
    expect(enquiriesApiMock.createEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ requirement: "" }),
    );
  });

  test("missing budget_inr -> passed through as null, not undefined", async () => {
    enquiriesApiMock.createEnquiry.mockImplementation(async () => ({ id: "enq-3" }));
    await handler({ customer_id: "cust-1", requirement: "x" });
    expect(enquiriesApiMock.createEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ budget_inr: null }),
    );
  });

  test("missing notes -> passed through as undefined", async () => {
    enquiriesApiMock.createEnquiry.mockImplementation(async () => ({ id: "enq-4" }));
    await handler({ customer_id: "cust-1", requirement: "x" });
    expect(enquiriesApiMock.createEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ notes: undefined }),
    );
  });

  test("a completeDraftAction-style patch supplying customer_id lets an originally-blocked plan execute", async () => {
    enquiriesApiMock.createEnquiry.mockImplementation(async () => ({ id: "enq-5" }));
    // Simulates workflowEngine.ts merging { ...planParams, ...patch } where
    // the original plan had customer_id: null (a draft) and the patch fills
    // it in with a manually-picked id. Two separate objects, not one
    // literal with a repeated key, so TS doesn't flag a static
    // duplicate-key mistake — the duplication is intentional patch-merge
    // semantics, not an error.
    const original = { requirement: "x", customer_id: null };
    const patch = { customer_id: "cust-manual" };
    const merged = { ...original, ...patch };
    const result = await handler(merged);
    expect(enquiriesApiMock.createEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cust-manual" }),
    );
    expect(result.linkedRecordId).toBe("enq-5");
  });
});
