/**
 * Tests for resolveProduct — the read-only, best-effort Planner resolver
 * that turns a material mention into an existing product_id for
 * log_enquiry. Flagged as an untested resolver in
 * VIE-Phase2-Milestone2-Review.md §3; closed here as part of Milestone 3 —
 * Validation & Coverage.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts —
 * see that file's header comment for why a private partial mock.module()
 * call is unsafe when the whole suite runs together.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { productsApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";

const { resolveProduct } = await import("./resolveProduct");

describe("resolveProduct", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test("no text extracted -> null result, and no lookup is even attempted", async () => {
    const result = await resolveProduct(undefined);
    expect(result).toEqual({ productId: null, productLabel: null });
    expect(productsApiMock.listProducts).not.toHaveBeenCalled();
  });

  test("whitespace-only text -> treated the same as no text", async () => {
    const result = await resolveProduct("   ");
    expect(result).toEqual({ productId: null, productLabel: null });
    expect(productsApiMock.listProducts).not.toHaveBeenCalled();
  });

  test("text given, zero matches -> null result, NEVER a blocker (this resolver has no blocker field at all)", async () => {
    productsApiMock.listProducts.mockImplementation(async () => []);
    const result = await resolveProduct("Mint");
    expect(result).toEqual({ productId: null, productLabel: null });
    expect(Object.keys(result)).not.toContain("blocker");
  });

  test("text given, exactly one match -> resolved", async () => {
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);
    const result = await resolveProduct("Mint");
    expect(result.productId).toBe("prod-1");
    expect(result.productLabel).toBe("Mint Green Marble");
  });

  test("text given, multiple matches -> null result rather than guessing one", async () => {
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
      { id: "prod-2", name: "Mint White Marble" },
    ]);
    const result = await resolveProduct("Mint");
    expect(result.productId).toBeNull();
    expect(result.productLabel).toBeNull();
  });

  test("passes the trimmed text through to listProducts", async () => {
    productsApiMock.listProducts.mockImplementation(async () => []);
    await resolveProduct("  Mint  ");
    expect(productsApiMock.listProducts).toHaveBeenCalledWith("Mint");
  });
});
