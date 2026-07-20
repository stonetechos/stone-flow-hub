/**
 * Tests for resolveCustomer — the read-only Planner resolver that turns an
 * extracted customer name into an existing customer_id for log_enquiry (and,
 * via resolveFollowupTarget, note_followup). This resolver has existed since
 * VIE Phase 1 with no dedicated test file; adding one here alongside
 * resolveCustomerDuplicate.test.ts closes a pre-existing gap in the same
 * "customers" resolver family this Milestone-2 work touches (flagged in
 * VIE-Phase2-Milestone2-Review.md §3). resolveProduct.ts and
 * resolveFollowupTarget.ts remain untested and are intentionally out of
 * scope here — they belong to log_enquiry/note_followup, not create_customer.
 *
 * Same module-mocking approach as resolveCustomerDuplicate.test.ts, and for
 * the same reason: resolveCustomer.ts calls @/lib/customers/api's
 * listCustomers(), real I/O that must be mocked before the module under
 * test is ever imported.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const listCustomersMock = mock(async (_query?: string): Promise<unknown[]> => []);

mock.module("@/lib/customers/api", () => ({
  listCustomers: listCustomersMock,
}));

const { resolveCustomer } = await import("./resolveCustomer");

describe("resolveCustomer", () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listCustomersMock.mockImplementation(async () => []);
  });

  afterAll(() => {
    mock.restore();
  });

  test("no name extracted -> blocker, and no lookup is even attempted", async () => {
    const result = await resolveCustomer(undefined);
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe("No customer name was extracted from the utterance.");
    expect(listCustomersMock).not.toHaveBeenCalled();
  });

  test("whitespace-only name -> treated the same as no name", async () => {
    const result = await resolveCustomer("   ");
    expect(result.blocker).toBe("No customer name was extracted from the utterance.");
    expect(listCustomersMock).not.toHaveBeenCalled();
  });

  test("name given, zero matches -> blocker naming the search term", async () => {
    listCustomersMock.mockImplementation(async () => []);
    const result = await resolveCustomer("Ramesh");
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe('No existing customer matches "Ramesh".');
  });

  test("name given, exactly one match -> resolved, no blocker", async () => {
    listCustomersMock.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await resolveCustomer("Ramesh");
    expect(result.blocker).toBeNull();
    expect(result.customerId).toBe("cust-1");
    expect(result.customerLabel).toBe("Ramesh Patel");
  });

  test("name given, multiple matches -> blocker listing each candidate", async () => {
    listCustomersMock.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      { id: "cust-2", name: "Ramesh Shah", customer_code: "CUST-0002" },
    ]);
    const result = await resolveCustomer("Ramesh");
    expect(result.customerId).toBeNull();
    expect(result.blocker).toBe(
      '"Ramesh" matches 2 customers: Ramesh Patel (CUST-0001), Ramesh Shah (CUST-0002).',
    );
  });

  test("more than 5 matches...", async () => {
  listCustomersMock.mockImplementation(async () =>
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
});