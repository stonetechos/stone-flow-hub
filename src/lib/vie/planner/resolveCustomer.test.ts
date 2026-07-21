/**
 * Tests for resolveCustomer — the read-only Planner resolver that turns an
 * extracted customer name into an existing customer_id for log_enquiry (and,
 * via resolveFollowupTarget, note_followup). This resolver has existed since
 * VIE Phase 1 with no dedicated test file; adding one here alongside
 * resolveCustomerDuplicate.test.ts closes a pre-existing gap in the same
 * "customers" resolver family this Milestone-2 work touches (flagged in
 * VIE-Phase2-Milestone2-Review.md §3).
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts
 * (Milestone 3 — Validation & Coverage) rather than a private, partial
 * mock.module() call for @/lib/customers/api. A partial mock here collided
 * with resolveCustomerDuplicate.test.ts's own partial mock of the same
 * module when the whole suite ran together — see moduleMocks.ts's header
 * comment for the full reproduction. Importing the shared mock BEFORE
 * dynamically importing the module under test keeps this file's mocked
 * behavior correct regardless of what order bun evaluates test files in.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { customersApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";

const { resolveCustomer } = await import("./resolveCustomer");

describe("resolveCustomer", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test("no name extracted -> blocker, and no lookup is even attempted", async () => {
    const result = await resolveCustomer(undefined);
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe("No customer name was extracted from the utterance.");
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("whitespace-only name -> treated the same as no name", async () => {
    const result = await resolveCustomer("   ");
    expect(result.blocker).toBe("No customer name was extracted from the utterance.");
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("name given, zero matches -> blocker naming the search term", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    const result = await resolveCustomer("Ramesh");
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe('No existing customer matches "Ramesh".');
  });

  test("name given, exactly one match -> resolved, no blocker", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await resolveCustomer("Ramesh");
    expect(result.blocker).toBeNull();
    expect(result.customerId).toBe("cust-1");
    expect(result.customerLabel).toBe("Ramesh Patel");
  });

  test("name given, multiple matches -> blocker listing each candidate", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      { id: "cust-2", name: "Ramesh Shah", customer_code: "CUST-0002" },
    ]);
    const result = await resolveCustomer("Ramesh");
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe(
      '"Ramesh" matches 2 customers: Ramesh Patel (CUST-0001), Ramesh Shah (CUST-0002).',
    );
  });

  test("more than 5 matches -> lists only the first 5, with a trailing ellipsis", async () => {
    customersApiMock.listCustomers.mockImplementation(async () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: `cust-${i}`,
        name: `Ramesh ${i}`,
        customer_code: `CUST-000${i}`,
      })),
    );

    const result = await resolveCustomer("Ramesh");

    expect(result.blocker).toContain("matches 7 customers:");
    expect(result.blocker?.endsWith(", ...")).toBe(true);
    expect((result.blocker?.match(/CUST-000/g) ?? []).length).toBe(5);
  });

  test("passes the trimmed name through to listCustomers", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    await resolveCustomer("  Ramesh  ");
    expect(customersApiMock.listCustomers).toHaveBeenCalledWith("Ramesh");
  });
});
