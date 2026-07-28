/**
 * Tests for planFromBusinessIntent() — the VIE Planner sprint's (2026-07-28)
 * BusinessIntent -> BusinessIntentExecutionPlan entry point. See that file's
 * own header comment for the full contract this pins: never mutates,
 * decides which of the 4 known VIE actions a BusinessIntent implies,
 * detects missing information as PlannerBlockers, and produces a
 * deterministic plan (actions, dependencies, validation errors, suggested
 * questions, confidence, estimated impact, unhandled sections).
 *
 * Uses the shared, full-shape module mocks from testSupport/moduleMocks.ts
 * (customersApiMock, productsApiMock, projectsApiMock) — every underlying
 * lookup this file's resolvers make (listCustomers, findCustomerByPhone,
 * listProducts, listProjectsByCustomer) is already covered there; no new
 * mock.module() call is needed for this test file.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  customersApiMock,
  productsApiMock,
  projectsApiMock,
  resetAllModuleMocks,
} from "../testSupport/moduleMocks";

const { planFromBusinessIntent } = await import("./fromBusinessIntent");

function baseIntent(overrides: Record<string, unknown> = {}) {
  return {
    source: "text" as const,
    rawText: "test capture",
    capturedAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

describe("planFromBusinessIntent", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });
  afterEach(() => {
    resetAllModuleMocks();
  });

  test("an intent with no populated sections produces zero actions and full confidence", async () => {
    const plan = await planFromBusinessIntent(baseIntent());
    expect(plan.actions).toEqual([]);
    expect(plan.dependencies).toEqual([]);
    expect(plan.validationErrors).toEqual([]);
    expect(plan.suggestedQuestions).toEqual([]);
    expect(plan.estimatedImpact).toEqual([]);
    expect(plan.confidence).toBe(1);
    expect(plan.unhandledSections).toEqual([]);
  });

  test("a structurally invalid BusinessIntent returns a degenerate plan instead of throwing", async () => {
    // Missing required `rawText`/`capturedAt`/`source` entirely.
    const plan = await planFromBusinessIntent({ customer: { name: "X" } } as never);
    expect(plan.actions).toEqual([]);
    expect(plan.confidence).toBe(0);
    expect(plan.validationErrors.length).toBeGreaterThan(0);
    expect(plan.validationErrors[0].actionId).toBeUndefined();
  });

  test("never calls any mutating customer/product/project function", async () => {
    await planFromBusinessIntent(
      baseIntent({
        customer: { name: "Ramesh Patel", mobile: "9876543210" },
        requirements: { summary: "Granite countertop" },
        followups: [{ note: "call back", relativeDays: 2 }],
      }),
    );
    expect(customersApiMock.createCustomer).not.toHaveBeenCalled();
    expect(customersApiMock.updateCustomer).not.toHaveBeenCalled();
    expect(customersApiMock.deleteCustomer).not.toHaveBeenCalled();
    expect(projectsApiMock.createProject).not.toHaveBeenCalled();
  });

  describe("customer resolution", () => {
    test("an existing unique customer match resolves — no create_customer action, downstream uses the resolved id", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "Granite countertop" },
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["log_enquiry"]);
      expect(plan.actions[0].params.customer_id).toBe("cust-1");
      expect(plan.actions[0].blockers).toEqual([]);
    });

    test("no existing match + enough info -> create_customer is proposed", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "New Customer", mobile: "9876543210" } }),
      );
      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0].operation).toBe("create_customer");
      expect(plan.actions[0].blockers).toEqual([]);
      expect(plan.actions[0].params).toMatchObject({ name: "New Customer", mobile: "9876543210" });
    });

    test("create_customer gets a blocker when mobile is missing/invalid", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(baseIntent({ customer: { name: "New Customer" } }));
      expect(plan.actions[0].operation).toBe("create_customer");
      expect(plan.actions[0].blockers.some((b) => b.field === "mobile")).toBe(true);
      expect(plan.actions[0].confidence).toBeLessThan(1);
    });

    test("a duplicate phone number surfaces as a confirmation_required blocker on create_customer", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => ({
        id: "cust-9",
        name: "Existing Co",
        customer_code: "CUST-0009",
      }));
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "New Customer", mobile: "9876543210" } }),
      );
      const blocker = plan.actions[0].blockers.find((b) => b.type === "confirmation_required");
      expect(blocker).toBeDefined();
      expect(blocker?.candidates?.[0]?.label).toContain("Existing Co");
    });

    test("an ambiguous customer match never proposes create_customer, and attaches the ambiguity blocker downstream", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
        { id: "cust-2", name: "Ramesh Patel", customer_code: "CUST-0002" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "Granite countertop" },
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["log_enquiry"]);
      const blocker = plan.actions[0].blockers.find((b) => b.type === "customer_selection");
      expect(blocker?.candidates).toHaveLength(2);
    });
  });

  describe("log_enquiry vs create_quotation", () => {
    test("products present -> create_quotation only, never both", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Site A", project_code: "PRJ-0001" },
      ]);
      productsApiMock.listProducts.mockImplementation(async () => [
        { id: "prod-1", name: "Granite Slab" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "General remodel" },
          products: [{ name: "Granite Slab", quantity: 10, unit: "sqft", unitPrice: 120 }],
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["create_quotation"]);
    });

    test("no products, requirements present -> log_enquiry", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "Granite countertop" },
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["log_enquiry"]);
      expect(plan.actions[0].params.requirement).toBe("Granite countertop");
    });

    test("neither products nor requirements -> no demand action proposed", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(baseIntent({ customer: { name: "Ramesh Patel" } }));
      expect(plan.actions).toEqual([]);
    });

    test("create_quotation line items missing quantity/price produce per-item blockers", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Site A", project_code: "PRJ-0001" },
      ]);
      productsApiMock.listProducts.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          products: [{ name: "Granite Slab" }],
        }),
      );
      const action = plan.actions[0];
      expect(action.blockers.some((b) => b.type === "quantity_required")).toBe(true);
      expect(action.blockers.some((b) => b.type === "unit_price_required")).toBe(true);
    });
  });

  describe("note_followup and dependencies", () => {
    test("follow-up alone (no demand section) -> a single note_followup action", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          followups: [{ note: "call back next week", relativeDays: 7 }],
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["note_followup"]);
      expect(plan.actions[0].params.entity_id).toBe("cust-1");
      expect(plan.actions[0].params.notes).toBe("call back next week");
    });

    test("a pending new customer + a follow-up for the same name creates a dependency edge", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Brand New Co", mobile: "9876543210" },
          followups: [{ note: "call back", relativeDays: 1 }],
        }),
      );
      const customerAction = plan.actions.find((a) => a.operation === "create_customer");
      const followupAction = plan.actions.find((a) => a.operation === "note_followup");
      expect(customerAction).toBeDefined();
      expect(followupAction).toBeDefined();
      expect(followupAction?.params.entity_id).toBeNull();
      expect(plan.dependencies).toContainEqual({
        actionId: followupAction!.id,
        dependsOnActionId: customerAction!.id,
        reason: expect.any(String),
      });
      expect(followupAction?.dependsOn).toEqual([customerAction!.id]);
    });

    test("a pending new customer + an enquiry for the same name creates a dependency edge", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Brand New Co", mobile: "9876543210" },
          requirements: { summary: "Kitchen countertop" },
        }),
      );
      const customerAction = plan.actions.find((a) => a.operation === "create_customer");
      const enquiryAction = plan.actions.find((a) => a.operation === "log_enquiry");
      expect(plan.dependencies).toEqual([
        {
          actionId: enquiryAction!.id,
          dependsOnActionId: customerAction!.id,
          reason: expect.any(String),
        },
      ]);
      expect(enquiryAction?.dependsOn).toEqual([customerAction!.id]);
    });
  });

  describe("action ids and multi-action plans", () => {
    test("multiple actions get sequential, deterministic ids in build order", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Brand New Co", mobile: "9876543210" },
          requirements: { summary: "Kitchen countertop" },
          followups: [{ note: "call back", relativeDays: 1 }],
        }),
      );
      expect(plan.actions.map((a) => a.id)).toEqual(["action-1", "action-2", "action-3"]);
      expect(plan.actions.map((a) => a.operation)).toEqual([
        "create_customer",
        "log_enquiry",
        "note_followup",
      ]);
    });

    test("same input produces the same plan shape (deterministic)", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const intent = baseIntent({
        customer: { name: "Ramesh Patel" },
        requirements: { summary: "Granite countertop" },
      });
      const plan1 = await planFromBusinessIntent(intent);
      const plan2 = await planFromBusinessIntent(intent);
      expect(plan1).toEqual(plan2);
    });
  });

  describe("unhandledSections", () => {
    test("tasks/documents/measurements populated with no consuming action are surfaced, not silently dropped", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "Granite countertop" },
          tasks: [{ title: "Follow up with vendor" }],
          documents: [{ fileName: "site-photo.jpg" }],
          measurements: [{ label: "kitchen", value: 120, unit: "sqft" }],
        }),
      );
      expect(plan.unhandledSections.sort()).toEqual(["documents", "measurements", "tasks"]);
    });

    test("budget/timeline are unhandled when create_quotation (not log_enquiry) is the chosen path", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          products: [{ name: "Granite Slab", quantity: 10, unit: "sqft", unitPrice: 100 }],
          budget: { amountInr: 50000 },
          timeline: { relativeDays: 5 },
        }),
      );
      expect(plan.actions.map((a) => a.operation)).toEqual(["create_quotation"]);
      expect(plan.unhandledSections.sort()).toEqual(["budget", "timeline"]);
    });

    test("budget/timeline are consumed (not unhandled) when log_enquiry is the chosen path", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          requirements: { summary: "Granite countertop" },
          budget: { amountInr: 50000 },
          timeline: { relativeDays: 5 },
        }),
      );
      expect(plan.unhandledSections).toEqual([]);
      expect(plan.actions[0].params.budget_inr).toBe(50000);
    });
  });

  describe("suggested questions", () => {
    test("a text_required blocker maps to a field-based question", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(baseIntent({ customer: { name: "New Customer" } }));
      const q = plan.suggestedQuestions.find((sq) => sq.blockerId === "mobile");
      expect(q?.question).toBe("What is the mobile?");
    });

    test("a customer_selection blocker with candidates lists them in the question", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
        { id: "cust-2", name: "Ramesh Patel", customer_code: "CUST-0002" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "Ramesh Patel" }, requirements: { summary: "x" } }),
      );
      const q = plan.suggestedQuestions.find((sq) => sq.blockerId === "customer_id");
      expect(q?.question).toContain("Ramesh Patel");
    });

    test("a confirmation_required blocker reuses the blocker's own message verbatim", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => ({
        id: "cust-9",
        name: "Existing Co",
        customer_code: "CUST-0009",
      }));
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "New Customer", mobile: "9876543210" } }),
      );
      const action = plan.actions[0];
      const blocker = action.blockers.find((b) => b.type === "confirmation_required")!;
      const q = plan.suggestedQuestions.find((sq) => sq.blockerId === blocker.id);
      expect(q?.question).toBe(blocker.message);
    });
  });

  describe("estimated impact", () => {
    test("create_customer summary names the customer", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "Brand New Co", mobile: "9876543210" } }),
      );
      const impact = plan.estimatedImpact.find((i) => i.operation === "create_customer");
      expect(impact).toMatchObject({ entityType: "customer", recordsCreated: 1 });
      expect(impact?.summary).toContain("Brand New Co");
    });

    test("create_quotation summary includes item count and computed total", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Site A", project_code: "PRJ-0001" },
      ]);
      productsApiMock.listProducts.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          products: [{ name: "Granite Slab", quantity: 10, unit: "sqft", unitPrice: 100 }],
        }),
      );
      const impact = plan.estimatedImpact.find((i) => i.operation === "create_quotation");
      expect(impact?.summary).toContain("1 line item");
      expect(impact?.summary).toContain("1,000");
    });

    test("note_followup summary names the channel", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({
          customer: { name: "Ramesh Patel" },
          followups: [{ note: "call back", relativeDays: 1, channel: "whatsapp" }],
        }),
      );
      const impact = plan.estimatedImpact.find((i) => i.operation === "note_followup");
      expect(impact?.summary).toContain("whatsapp");
    });
  });

  describe("confidence", () => {
    test("blockers reduce an action's confidence below the base confidence", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      const plan = await planFromBusinessIntent(
        baseIntent({ confidence: 0.9, customer: { name: "New Customer" } }),
      );
      // create_customer here has a "missing mobile" blocker.
      expect(plan.actions[0].confidence).toBeLessThan(0.9);
    });

    test("plan-level confidence is the minimum across actions", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => []);
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      const plan = await planFromBusinessIntent(
        baseIntent({
          confidence: 0.9,
          customer: { name: "Brand New Co", mobile: "9876543210" },
          requirements: { summary: "Granite countertop" },
        }),
      );
      // create_customer has no blockers here (valid mobile, no duplicate);
      // log_enquiry has an implicit customer_id blocker (customer not yet
      // created) -> its confidence is lower -> plan confidence should equal
      // the lower of the two.
      const min = Math.min(...plan.actions.map((a) => a.confidence));
      expect(plan.confidence).toBe(min);
    });

    test("a missing source confidence defaults to a neutral 0.5 base", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      const plan = await planFromBusinessIntent(
        baseIntent({ customer: { name: "Ramesh Patel" }, requirements: { summary: "x" } }),
      );
      expect(plan.actions[0].confidence).toBe(0.5);
    });
  });
});
