/**
 * Tests for the "create_customer" Action Registry handler
 * (actions/createCustomer.ts) — calls the same createCustomer() the manual
 * "New Customer" form calls, including its own phone-based dedup check as a
 * second line of defense behind the Planner's resolveCustomerDuplicate. See
 * VIE-CreateCustomer-UX-Contract.md.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts.
 * Captures its own handler reference once at import time — see
 * logEnquiry.test.ts's header comment for why, given registry.ts's
 * process-wide singleton Map.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { customersApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";
import { getVieAction } from "./registry";

await import("./createCustomer");
const handler = getVieAction("create_customer");
if (!handler) throw new Error("create_customer handler failed to self-register on import");

describe("create_customer action handler", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  test("missing name -> throws without calling createCustomer", async () => {
    await expect(handler({ mobile: "9724455663" })).rejects.toThrow(
      "create_customer handler invoked without a resolved name/mobile",
    );
    expect(customersApiMock.createCustomer).not.toHaveBeenCalled();
  });

  test("missing mobile -> throws without calling createCustomer", async () => {
    await expect(handler({ name: "Meera" })).rejects.toThrow(
      "create_customer handler invoked without a resolved name/mobile",
    );
    expect(customersApiMock.createCustomer).not.toHaveBeenCalled();
  });

  test("valid params -> calls createCustomer with the exact expected shape", async () => {
    customersApiMock.createCustomer.mockImplementation(async () => ({ id: "cust-1" }));

    const result = await handler({
      name: "Meera",
      mobile: "9724455663",
      city: "Surat",
      customer_type: "contractor",
      notes:
        'AI-logged from: "Naya customer add karo, Meera ben, mobile 9724455663, Surat thi, contractor che."',
    });

    expect(customersApiMock.createCustomer).toHaveBeenCalledWith({
      name: "Meera",
      mobile: "9724455663",
      email: undefined,
      city: "Surat",
      customer_type: "contractor",
      whatsapp: undefined,
      state: undefined,
      pincode: undefined,
      billing_address: undefined,
      gst_number: undefined,
      notes:
        'AI-logged from: "Naya customer add karo, Meera ben, mobile 9724455663, Surat thi, contractor che."',
    });
    expect(result).toEqual({ linkedRecordType: "customer", linkedRecordId: "cust-1" });
  });

  test("customer_type omitted -> defaults to 'individual'", async () => {
    customersApiMock.createCustomer.mockImplementation(async () => ({ id: "cust-2" }));
    await handler({ name: "Ramesh", mobile: "9876543210" });
    expect(customersApiMock.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ customer_type: "individual" }),
    );
  });

  test("customer_type outside the known enum -> falls back to 'individual' rather than passing through a bad value", async () => {
    customersApiMock.createCustomer.mockImplementation(async () => ({ id: "cust-3" }));
    await handler({ name: "Ramesh", mobile: "9876543210", customer_type: "wholesaler" });
    expect(customersApiMock.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ customer_type: "individual" }),
    );
  });

  test("city omitted -> passed through as undefined", async () => {
    customersApiMock.createCustomer.mockImplementation(async () => ({ id: "cust-4" }));
    await handler({ name: "Ramesh", mobile: "9876543210" });
    expect(customersApiMock.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ city: undefined }),
    );
  });

  test("a completeDraftAction-style patch supplying mobile lets an originally-blocked plan execute", async () => {
    customersApiMock.createCustomer.mockImplementation(async () => ({ id: "cust-5" }));
    // Simulates workflowEngine.ts merging { ...planParams, ...patch } where
    // the original plan had mobile: undefined (a draft) and the patch fills
    // it in with a manually-supplied number. Two separate objects, not one
    // literal with a repeated key, so TS doesn't (rightly) flag it as a
    // static duplicate-key mistake — the duplication here is intentional
    // and mirrors real patch-merge semantics.
    const original = { name: "Meera", mobile: undefined };
    const patch = { mobile: "9724455663" };
    const merged = { ...original, ...patch };
    const result = await handler(merged);
    expect(customersApiMock.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ mobile: "9724455663" }),
    );
    expect(result.linkedRecordId).toBe("cust-5");
  });
});
