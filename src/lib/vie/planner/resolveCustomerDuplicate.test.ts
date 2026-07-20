/**
 * Tests for resolveCustomerDuplicate — the read-only Planner resolver that
 * blocks create_customer whenever an extracted mobile number already
 * belongs to an existing customer. See VIE-CreateCustomer-UX-Contract.md §9.
 *
 * This is the first VIE Planner-resolver test in this codebase to need
 * module mocking: resolveCustomerDuplicate (unlike resolveEffectiveMode,
 * which is a pure function) does real I/O via
 * @/lib/customers/api's findCustomerByPhone. bun:test's mock.module()
 * replaces that module's export for any subsequent import of it — but only
 * for subsequent imports, since module evaluation is cached on first
 * import. So the mock is installed FIRST, before the module under test
 * (which imports the real specifier) is ever loaded — via a dynamic
 * `import()` after the mock is registered, rather than a static top-level
 * import, which would already have pulled in the real module by the time
 * mock.module() ran.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const findCustomerByPhoneMock = mock(async (_mobile: string): Promise<unknown> => null);

mock.module("@/lib/customers/api", () => ({
  findCustomerByPhone: findCustomerByPhoneMock,
}));

const { resolveCustomerDuplicate } = await import("./resolveCustomerDuplicate");

describe("resolveCustomerDuplicate", () => {
  beforeEach(() => {
    findCustomerByPhoneMock.mockReset();
    findCustomerByPhoneMock.mockImplementation(async () => null);
  });

  afterAll(() => {
    // Defensive: undo this file's module mock so a later test file that
    // transitively imports the real @/lib/customers/api (e.g. via
    // planner/index.ts) is never affected by it.
    mock.restore();
  });

  test("no mobile extracted -> no blocker, and no lookup is even attempted", async () => {
    const result = await resolveCustomerDuplicate(undefined);
    expect(result.blocker).toBeNull();
    expect(findCustomerByPhoneMock).not.toHaveBeenCalled();
  });

  test("whitespace-only mobile -> treated the same as no mobile", async () => {
    const result = await resolveCustomerDuplicate("   ");
    expect(result.blocker).toBeNull();
    expect(findCustomerByPhoneMock).not.toHaveBeenCalled();
  });

  test("mobile extracted, no existing match -> no blocker", async () => {
    findCustomerByPhoneMock.mockImplementation(async () => null);
    const result = await resolveCustomerDuplicate("9876543210");
    expect(result.blocker).toBeNull();
    expect(findCustomerByPhoneMock).toHaveBeenCalledWith("9876543210");
  });

  test("mobile matches an existing customer -> blocker naming the match, never a silent link", async () => {
    findCustomerByPhoneMock.mockImplementation(async () => ({
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
