/**
 * Tests for resolveCustomerDuplicate — the read-only Planner resolver that
 * blocks create_customer whenever an extracted mobile number already
 * belongs to an existing customer. See VIE-CreateCustomer-UX-Contract.md §9.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts
 * (Milestone 3 — Validation & Coverage). This file's original mock.module()
 * call only supplied `findCustomerByPhone` on @/lib/customers/api; run
 * together with resolveCustomer.test.ts's own partial mock of the same
 * module (only `listCustomers`), the whole-suite run threw "Export named
 * 'listCustomers' not found" or similar depending on load order — a real
 * cross-file pollution bug in bun:test's process-wide mock.module registry,
 * not a hypothetical one. See moduleMocks.ts's header comment for the full
 * writeup and the fix (one shared, full-shape mock object per module,
 * reused by every file that needs it).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { customersApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";

const { resolveCustomerDuplicate } = await import("./resolveCustomerDuplicate");

describe("resolveCustomerDuplicate", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test("no mobile extracted -> no blocker, and no lookup is even attempted", async () => {
    const result = await resolveCustomerDuplicate(undefined);
    expect(result.blocker).toBeNull();
    expect(customersApiMock.findCustomerByPhone).not.toHaveBeenCalled();
  });

  test("whitespace-only mobile -> treated the same as no mobile", async () => {
    const result = await resolveCustomerDuplicate("   ");
    expect(result.blocker).toBeNull();
    expect(customersApiMock.findCustomerByPhone).not.toHaveBeenCalled();
  });

  test("mobile extracted, no existing match -> no blocker", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
    const result = await resolveCustomerDuplicate("9876543210");
    expect(result.blocker).toBeNull();
    expect(customersApiMock.findCustomerByPhone).toHaveBeenCalledWith("9876543210");
  });

  test("mobile matches an existing customer -> blocker naming the match, never a silent link", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => ({
      id: "cust-abc-123",
      name: "Ramesh Patel",
      customer_code: "CUST-0042",
    }));
    const result = await resolveCustomerDuplicate("9876543210");
    expect(result.blocker).toBe(
      "A customer with this phone number already exists: Ramesh Patel (CUST-0042).",
    );
  });
});
