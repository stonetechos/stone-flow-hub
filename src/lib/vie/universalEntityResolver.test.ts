/**
 * Universal Entity Resolver tests. Run with `bun test`.
 *
 * Follows testSupport/moduleMocks.ts's documented discipline: `customer`/
 * `project` cases reuse the SHARED customersApiMock/projectsApiMock (since
 * @/lib/customers/api and @/lib/projects/api are already mock.module()'d
 * process-wide by that file — a second, independent mock.module() call for
 * either specifier here would be exactly the cross-file collision bug that
 * file's own header comment describes). @/lib/rfqs/api, @/lib/vendors/api,
 * @/lib/tasks/api, and @/lib/search/api are NOT mocked anywhere else in the
 * repo (grep-confirmed), so this file registers its own mock.module() calls
 * for those four, each following the same "spread the real module's
 * exports, override only what this test needs" pattern moduleMocks.ts
 * established — so any other export those modules have keeps working for
 * any other file that happens to load them in the same `bun test` run.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { customersApiMock, projectsApiMock, resetAllModuleMocks } from "./testSupport/moduleMocks";
import type { UniversalEntityType } from "./universalEntityResolver";

import * as rfqsApiActual from "@/lib/rfqs/api";
import * as vendorsApiActual from "@/lib/vendors/api";
import * as tasksApiActual from "@/lib/tasks/api";
import * as searchApiActual from "@/lib/search/api";

const rfqsApiMock = {
  listRfqs: mock(async (_q: string, _status: string): Promise<unknown[]> => []),
};
const vendorsApiMock = { listVendors: mock(async (_q?: string): Promise<unknown[]> => []) };
const tasksApiMock = {
  listTasks: mock(async (_opts?: unknown): Promise<unknown[]> => []),
};
const searchApiMock = {
  fetchCommentHits: mock(async (_q: string, _limit?: number): Promise<unknown[]> => []),
  fetchDocumentHits: mock(async (_q: string, _limit?: number): Promise<unknown[]> => []),
  fetchActivityHits: mock(async (_q: string, _limit?: number): Promise<unknown[]> => []),
};

mock.module("@/lib/rfqs/api", () => ({ ...rfqsApiActual, ...rfqsApiMock }));
mock.module("@/lib/vendors/api", () => ({ ...vendorsApiActual, ...vendorsApiMock }));
mock.module("@/lib/tasks/api", () => ({ ...tasksApiActual, ...tasksApiMock }));
mock.module("@/lib/search/api", () => ({ ...searchApiActual, ...searchApiMock }));

const { resolveUniversalEntities, resolveUniversalEntitiesByType, UNIVERSAL_ENTITY_TYPES } =
  await import("./universalEntityResolver");

describe("UNIVERSAL_ENTITY_TYPES", () => {
  test("covers exactly the 12 types this sprint scoped", () => {
    expect([...UNIVERSAL_ENTITY_TYPES].sort()).toEqual(
      (
        [
          "activity",
          "comment",
          "customer",
          "document",
          "enquiry",
          "invoice",
          "project",
          "quote",
          "rfq",
          "sales_order",
          "task",
          "vendor",
        ] satisfies UniversalEntityType[]
      ).sort(),
    );
  });
});

describe("resolveUniversalEntities", () => {
  beforeEach(() => {
    resetAllModuleMocks();
    rfqsApiMock.listRfqs.mockReset().mockImplementation(async () => []);
    vendorsApiMock.listVendors.mockReset().mockImplementation(async () => []);
    tasksApiMock.listTasks.mockReset().mockImplementation(async () => []);
    searchApiMock.fetchCommentHits.mockReset().mockImplementation(async () => []);
    searchApiMock.fetchDocumentHits.mockReset().mockImplementation(async () => []);
    searchApiMock.fetchActivityHits.mockReset().mockImplementation(async () => []);
  });
  afterEach(() => {
    resetAllModuleMocks();
  });

  test("a query under 2 characters short-circuits to an empty result with no lookups", async () => {
    const results = await resolveUniversalEntities("a");
    expect(results).toEqual([]);
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test("maps a customer row into a structured, typed result", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001", updated_at: "2026-01-01" },
    ]);
    const results = await resolveUniversalEntities("Ramesh", { types: ["customer"] });
    expect(results).toEqual([
      {
        type: "customer",
        id: "cust-1",
        label: "Ramesh Patel",
        subtitle: "CUST-0001",
        route: "/customers/cust-1",
        updatedAt: "2026-01-01",
        raw: {
          id: "cust-1",
          name: "Ramesh Patel",
          customer_code: "CUST-0001",
          updated_at: "2026-01-01",
        },
      },
    ]);
  });

  test("maps a project row, falling back to city when there's no linked customer", async () => {
    projectsApiMock.listProjects.mockImplementation(async () => [
      {
        id: "proj-1",
        name: "Vastrapur Villa",
        city: "Ahmedabad",
        customer: null,
        updated_at: null,
      },
    ]);
    const results = await resolveUniversalEntities("Vastrapur", { types: ["project"] });
    expect(results[0]).toMatchObject({
      type: "project",
      id: "proj-1",
      label: "Vastrapur Villa",
      subtitle: "Ahmedabad",
      route: "/projects/proj-1",
    });
  });

  test("rfq/vendor/task resolvers delegate to the same list*() functions nl-search already uses", async () => {
    rfqsApiMock.listRfqs.mockImplementation(async () => [
      { id: "rfq-1", rfq_no: "RFQ-0001", project: { name: "Site A" }, created_at: "2026-01-01" },
    ]);
    vendorsApiMock.listVendors.mockImplementation(async () => [
      { id: "ven-1", company_name: "Acme Stone", vendor_code: "VEN-01", updated_at: "2026-01-02" },
    ]);
    tasksApiMock.listTasks.mockImplementation(async () => [
      { id: "task-1", title: "Follow up", description: "Call back", updated_at: "2026-01-03" },
    ]);

    const results = await resolveUniversalEntities("xx", { types: ["rfq", "vendor", "task"] });

    expect(results).toEqual([
      {
        type: "rfq",
        id: "rfq-1",
        label: "RFQ-0001",
        subtitle: "Site A",
        route: "/rfqs/rfq-1",
        updatedAt: "2026-01-01",
        raw: {
          id: "rfq-1",
          rfq_no: "RFQ-0001",
          project: { name: "Site A" },
          created_at: "2026-01-01",
        },
      },
      {
        type: "vendor",
        id: "ven-1",
        label: "Acme Stone",
        subtitle: "VEN-01",
        route: "/vendors/ven-1",
        updatedAt: "2026-01-02",
        raw: {
          id: "ven-1",
          company_name: "Acme Stone",
          vendor_code: "VEN-01",
          updated_at: "2026-01-02",
        },
      },
      {
        type: "task",
        id: "task-1",
        label: "Follow up",
        subtitle: "Call back",
        route: "/tasks",
        updatedAt: "2026-01-03",
        raw: {
          id: "task-1",
          title: "Follow up",
          description: "Call back",
          updated_at: "2026-01-03",
        },
      },
    ]);
  });

  test("comment/document/activity resolve via the shared search/api fetchers (foundation's new Copilot entity types)", async () => {
    searchApiMock.fetchCommentHits.mockImplementation(async () => [
      {
        id: "c1",
        label: "Great service!",
        sublabel: "customer",
        href: "/customers/cust-1",
        group: "notes",
        groupLabel: "Notes",
      },
    ]);
    searchApiMock.fetchDocumentHits.mockImplementation(async () => [
      {
        id: "d1",
        label: "invoice.pdf",
        sublabel: "Invoices",
        href: "/invoices/inv-1",
        group: "documents",
        groupLabel: "Documents",
      },
    ]);
    searchApiMock.fetchActivityHits.mockImplementation(async () => [
      {
        id: "a1",
        label: "Quote sent",
        sublabel: "quote",
        href: "/quotes/q1",
        group: "activities",
        groupLabel: "Activities",
      },
    ]);

    const results = await resolveUniversalEntities("xx", {
      types: ["comment", "document", "activity"],
    });

    expect(results).toEqual([
      {
        type: "comment",
        id: "c1",
        label: "Great service!",
        subtitle: "customer",
        route: "/customers/cust-1",
      },
      {
        type: "document",
        id: "d1",
        label: "invoice.pdf",
        subtitle: "Invoices",
        route: "/invoices/inv-1",
      },
      { type: "activity", id: "a1", label: "Quote sent", subtitle: "quote", route: "/quotes/q1" },
    ]);
  });

  test("a failing type is isolated — other types still return results", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => {
      throw new Error("simulated DB error");
    });
    vendorsApiMock.listVendors.mockImplementation(async () => [
      { id: "ven-1", company_name: "Acme Stone", vendor_code: "VEN-01", updated_at: null },
    ]);

    const results = await resolveUniversalEntities("xx", { types: ["customer", "vendor"] });

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("vendor");
  });

  test("resolveUniversalEntitiesByType surfaces [] instead of throwing on a failing type", async () => {
    tasksApiMock.listTasks.mockImplementation(async () => {
      throw new Error("simulated DB error");
    });
    await expect(resolveUniversalEntitiesByType("task", "x")).resolves.toEqual([]);
  });

  test("limitPerType caps results per type", async () => {
    customersApiMock.listCustomers.mockImplementation(async () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: `cust-${i}`,
        name: `Customer ${i}`,
        customer_code: `CUST-0${i}`,
        updated_at: null,
      })),
    );
    const results = await resolveUniversalEntities("Customer", {
      types: ["customer"],
      limitPerType: 3,
    });
    expect(results).toHaveLength(3);
  });
});
