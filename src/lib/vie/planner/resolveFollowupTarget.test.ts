/**
 * Tests for resolveFollowupTarget — the read-only Planner resolver that
 * decides which record a note_followup attaches to. Flagged as an untested
 * resolver in VIE-Phase2-Milestone2-Review.md §3 ("resolveProduct.ts and
 * resolveFollowupTarget.ts remain untested"); closed here as part of
 * Milestone 3 — Validation & Coverage.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts —
 * see that file's header comment for why a private partial mock.module()
 * call is unsafe when the whole suite runs together.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { customersApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";
import type { VieActionContext } from "../types";

const { resolveFollowupTarget } = await import("./resolveFollowupTarget");

describe("resolveFollowupTarget", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test("caller-supplied context wins outright — no name lookup attempted, even if targetName is also present", async () => {
    const context: VieActionContext = { entityType: "enquiry", entityId: "enq-123" };
    const result = await resolveFollowupTarget("Ramesh", context);
    expect(result).toEqual({ entityType: "enquiry", entityId: "enq-123", blocker: null });
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("context missing entityId -> falls through to name resolution, not treated as supplied", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel" },
    ]);
    const result = await resolveFollowupTarget("Ramesh", { entityType: "enquiry" });
    expect(result.entityType).toBe("customer");
    expect(result.entityId).toBe("cust-1");
  });

  test("context missing entityType -> falls through to name resolution, not treated as supplied", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel" },
    ]);
    const result = await resolveFollowupTarget("Ramesh", { entityId: "enq-123" });
    expect(result.entityType).toBe("customer");
    expect(result.entityId).toBe("cust-1");
  });

  test("no context, no targetName -> blocker naming both missing sources", async () => {
    const result = await resolveFollowupTarget(undefined, undefined);
    expect(result.entityId).toBeNull();
    expect(result.blocker).toBe(
      "No customer/record name was extracted and no current-page context was supplied.",
    );
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("no context, whitespace-only targetName -> treated the same as no name", async () => {
    const result = await resolveFollowupTarget("   ", undefined);
    expect(result.blocker).toBe(
      "No customer/record name was extracted and no current-page context was supplied.",
    );
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("no context, name given, zero matches -> blocker naming the search term", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    const result = await resolveFollowupTarget("Ramesh", undefined);
    expect(result.entityId).toBeNull();
    expect(result.blocker).toBe('No existing customer matches "Ramesh".');
  });

  test("no context, name given, exactly one match -> resolved as a customer entity, no blocker", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel" },
    ]);
    const result = await resolveFollowupTarget("Ramesh", undefined);
    expect(result.blocker).toBeNull();
    expect(result.entityType).toBe("customer");
    expect(result.entityId).toBe("cust-1");
  });

  test("no context, name given, multiple matches -> blocker, cannot determine which one", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel" },
      { id: "cust-2", name: "Ramesh Shah" },
    ]);
    const result = await resolveFollowupTarget("Ramesh", undefined);
    expect(result.entityId).toBeNull();
    expect(result.blocker).toBe('"Ramesh" matches 2 customers — cannot determine which one.');
  });

  test("passes the trimmed target name through to listCustomers", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    await resolveFollowupTarget("  Ramesh  ", undefined);
    expect(customersApiMock.listCustomers).toHaveBeenCalledWith("Ramesh");
  });
});
