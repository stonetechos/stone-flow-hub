/**
 * Tests for resolveProject — the read-only Planner resolver that turns an
 * already-resolved customer_id into a single existing project for
 * create_quotation (VIE Phase 3, Milestone 1 — Project Resolution). See
 * VIE-CreateQuotation-Architecture-Review.md §2/§10 for the design this
 * pins: zero matches -> blocker, multiple matches -> blocker, exactly one
 * -> resolved — the same shape resolveCustomer.test.ts already established
 * for resolveCustomer.ts, adapted to a customer_id -> project_id input.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts
 * (extended with projectsApiMock for this milestone) — see that file's
 * header comment for why a private partial mock.module() call is unsafe
 * when the whole suite runs together. This file follows that pattern from
 * its first line specifically to avoid reintroducing the cross-file
 * pollution bug Milestone 3 found and fixed for @/lib/customers/api.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { projectsApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";

const { resolveProject } = await import("./resolveProject");

describe("resolveProject", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  describe("no resolved customer to look up a project for", () => {
    test("undefined customerId -> blocker, and no lookup is even attempted", async () => {
      const result = await resolveProject(undefined);
      expect(result.projectId).toBeNull();
      expect(result.projectLabel).toBeNull();
      expect(result.blocker).toBe("No resolved customer to look up a project for.");
      expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
    });

    test("whitespace-only customerId -> treated the same as no customerId", async () => {
      const result = await resolveProject("   ");
      expect(result.blocker).toBe("No resolved customer to look up a project for.");
      expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
    });

    test("empty-string customerId -> treated the same as no customerId", async () => {
      const result = await resolveProject("");
      expect(result.blocker).toBe("No resolved customer to look up a project for.");
      expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
    });

    test("a customerLabel alone, with no customerId, still blocks without a lookup", async () => {
      const result = await resolveProject(undefined, "Ramesh Patel");
      expect(result.blocker).toBe("No resolved customer to look up a project for.");
      expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
    });
  });

  describe("customerId given, zero matching projects", () => {
    test("blocker names the customer when a label was supplied", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
      const result = await resolveProject("cust-1", "Ramesh Patel");
      expect(result.projectId).toBeNull();
      expect(result.projectLabel).toBeNull();
      expect(result.blocker).toBe('"Ramesh Patel" has no existing project to quote against.');
    });

    test("blocker falls back to a generic phrase when no label was supplied", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
      const result = await resolveProject("cust-1");
      expect(result.blocker).toBe("This customer has no existing project to quote against.");
    });

    test("blocker falls back to a generic phrase when the label is explicitly null", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
      const result = await resolveProject("cust-1", null);
      expect(result.blocker).toBe("This customer has no existing project to quote against.");
    });
  });

  describe("customerId given, exactly one matching project", () => {
    test("resolves the project, no blocker", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        {
          id: "proj-1",
          name: "Shah Residence",
          project_code: "PRJ-0001",
          customer_id: "cust-1",
        },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel");
      expect(result.blocker).toBeNull();
      expect(result.projectId).toBe("proj-1");
      expect(result.projectLabel).toBe("Shah Residence");
    });

    test("resolves correctly even with no customerLabel supplied", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        {
          id: "proj-1",
          name: "Shah Residence",
          project_code: "PRJ-0001",
          customer_id: "cust-1",
        },
      ]);
      const result = await resolveProject("cust-1");
      expect(result.blocker).toBeNull();
      expect(result.projectId).toBe("proj-1");
    });
  });

  describe("customerId given, multiple matching projects", () => {
    test("blocker lists each candidate project, naming the customer when a label was supplied", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        {
          id: "proj-1",
          name: "Shah Residence",
          project_code: "PRJ-0001",
          customer_id: "cust-1",
        },
        {
          id: "proj-2",
          name: "Shah Villa",
          project_code: "PRJ-0002",
          customer_id: "cust-1",
        },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel");
      expect(result.projectId).toBeNull();
      expect(result.blocker).toBe(
        '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
      );
    });

    test("blocker uses the generic phrase when no label was supplied", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        {
          id: "proj-1",
          name: "Shah Residence",
          project_code: "PRJ-0001",
          customer_id: "cust-1",
        },
        {
          id: "proj-2",
          name: "Shah Villa",
          project_code: "PRJ-0002",
          customer_id: "cust-1",
        },
      ]);
      const result = await resolveProject("cust-1");
      expect(result.blocker).toBe(
        "This customer has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).",
      );
    });

    test("more than 5 matches -> lists only the first 5, with a trailing ellipsis", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () =>
        Array.from({ length: 7 }, (_, i) => ({
          id: `proj-${i}`,
          name: `Project ${i}`,
          project_code: `PRJ-000${i}`,
          customer_id: "cust-1",
        })),
      );

      const result = await resolveProject("cust-1", "Ramesh Patel");

      expect(result.blocker).toContain("has 7 projects:");
      expect(result.blocker?.endsWith(", ...")).toBe(true);
      expect((result.blocker?.match(/PRJ-000/g) ?? []).length).toBe(5);
    });

    test("exactly 5 matches -> lists all 5, no trailing ellipsis", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () =>
        Array.from({ length: 5 }, (_, i) => ({
          id: `proj-${i}`,
          name: `Project ${i}`,
          project_code: `PRJ-000${i}`,
          customer_id: "cust-1",
        })),
      );

      const result = await resolveProject("cust-1", "Ramesh Patel");

      expect(result.blocker).toContain("has 5 projects:");
      expect(result.blocker?.endsWith(", ...")).toBe(false);
      expect(result.blocker?.endsWith(".")).toBe(true);
    });
  });

  test("passes the trimmed customerId through to listProjectsByCustomer", async () => {
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
    await resolveProject("  cust-1  ");
    expect(projectsApiMock.listProjectsByCustomer).toHaveBeenCalledWith("cust-1");
  });

  test("never throws — always returns a ProjectResolution shape even on an empty result set", async () => {
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
    const result = await resolveProject("cust-1");
    expect(result).toEqual({
      projectId: null,
      projectLabel: null,
      blocker: "This customer has no existing project to quote against.",
    });
  });

  describe("projectTextHint (VIE Phase 3, Milestone 6 — additive, optional third parameter)", () => {
    test("a hint that uniquely narrows multiple candidates to exactly one resolves it, no blocker", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "Shah Villa");
      expect(result).toEqual({ projectId: "proj-2", projectLabel: "Shah Villa", blocker: null });
    });

    test("a hint that is a substring of the project name also narrows correctly", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "residence");
      expect(result.projectId).toBe("proj-1");
      expect(result.blocker).toBeNull();
    });

    test("a hint matching zero candidates falls back to the full candidate set (unchanged ambiguous-project blocker)", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "Nonexistent Project");
      expect(result.projectId).toBeNull();
      expect(result.blocker).toBe(
        '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
      );
    });

    test("a hint matching more than one candidate falls back to the full candidate set (still ambiguous, never a wrong guess)", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "Shah");
      expect(result.projectId).toBeNull();
      expect(result.blocker).toBe(
        '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
      );
    });

    test("a hint is irrelevant and ignored entirely when there is only one candidate anyway", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "some unrelated text");
      expect(result.projectId).toBe("proj-1");
      expect(result.blocker).toBeNull();
    });

    test("an empty or whitespace-only hint behaves identically to no hint at all", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel", "   ");
      expect(result.projectId).toBeNull();
      expect(result.blocker).toBe(
        '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
      );
    });

    test("omitting the hint entirely (existing call sites, pre-Milestone-6) behaves exactly as before", async () => {
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
      ]);
      const result = await resolveProject("cust-1", "Ramesh Patel");
      expect(result.projectId).toBe("proj-1");
    });
  });
});
