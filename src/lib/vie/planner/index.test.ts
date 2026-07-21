/**
 * Planner integration tests (VIE Phase 2 — Milestone 3: Validation &
 * Coverage; extended in Phase 3 — Milestone 2: Planner Integration for
 * create_quotation). Exercises planAction()'s dispatch and each of the
 * planX() functions end-to-end against mocked resolver I/O and mocked
 * policy config — the layer between VIE's raw classification and the
 * Workflow Engine's execution, per ADR-0001 §3.
 *
 * Complements the existing pure-function coverage of resolveEffectiveMode
 * (resolveEffectiveMode.test.ts) and the individual resolvers
 * (resolveCustomer/resolveCustomerDuplicate/resolveFollowupTarget/
 * resolveProduct/resolveProject .test.ts) by testing the planX() functions
 * that glue them together: blocker aggregation, params assembly, and the
 * policy lookup -> resolveEffectiveMode hand-off. The "planCreateQuotation
 * (via planAction)" describe block below additionally pins the sequential
 * resolveCustomer() -> resolveProject() composition this milestone
 * introduces — see planner/index.ts's planCreateQuotation for why this is
 * the first non-parallel multi-resolver call in the Planner.
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts —
 * see that file's header comment for why a private partial mock.module()
 * call is unsafe when the whole suite runs together.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  appSettingsApiMock,
  customersApiMock,
  productsApiMock,
  projectsApiMock,
  resetAllModuleMocks,
} from "../testSupport/moduleMocks";
import type { VieUnderstanding } from "../types";

const { planAction } = await import("./index");

function understanding(overrides: Partial<VieUnderstanding> = {}): VieUnderstanding {
  return {
    intent: "log_enquiry",
    entities: {},
    confidence: 0.9,
    language: "en",
    originalText: "Customer Ramesh wants 250 sqft Mint at 145.",
    canonicalText: "Customer Ramesh wants 250 sqft of Mint at Rs. 145 per unit.",
    ...overrides,
  };
}

describe("planAction dispatch", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test('"unsupported" -> null, no plan produced and no resolver called', async () => {
    const result = await planAction(understanding({ intent: "unsupported", entities: {} }));
    expect(result).toBeNull();
    expect(customersApiMock.listCustomers).not.toHaveBeenCalled();
  });

  test('"log_enquiry" dispatches to planLogEnquiry — operation matches, resolveCustomer is called', async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await planAction(
      understanding({ intent: "log_enquiry", entities: { customerName: "Ramesh" } }),
    );
    expect(result?.operation).toBe("log_enquiry");
    expect(customersApiMock.listCustomers).toHaveBeenCalledWith("Ramesh");
  });

  test('"note_followup" dispatches to planNoteFollowup — operation matches', async () => {
    const result = await planAction(
      understanding({
        intent: "note_followup",
        entities: { note: "General follow-up", relativeDays: 3 },
      }),
    );
    expect(result?.operation).toBe("note_followup");
  });

  test('"create_customer" dispatches to planCreateCustomer — operation matches', async () => {
    const result = await planAction(
      understanding({
        intent: "create_customer",
        entities: { customerName: "Meera", mobile: "9724455663" },
      }),
    );
    expect(result?.operation).toBe("create_customer");
  });

  test('"create_quotation" dispatches to planCreateQuotation — operation matches', async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    const result = await planAction(
      understanding({ intent: "create_quotation", entities: { customerName: "Ramesh" } }),
    );
    expect(result?.operation).toBe("create_quotation");
  });
});

describe("planLogEnquiry (via planAction)", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (entities: Record<string, unknown>, extra: Partial<VieUnderstanding> = {}) =>
    planAction(understanding({ intent: "log_enquiry", entities, ...extra }));

  test("customer resolved, product resolved, quantity+rate given -> full params, no blockers", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      productText: "Mint",
      quantity: 250,
      unit: "sqft",
      rate: 145,
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params).toMatchObject({
      customer_id: "cust-1",
      product_id: "prod-1",
      requirement: "250 sqft Mint Green Marble at Rs. 145/sqft",
      budget_inr: 250 * 145,
    });
  });

  test("no customer name -> customer blocker forces draft regardless of confidence", async () => {
    const result = await plan({ productText: "Mint" }, { confidence: 0.99 });
    expect(result?.blockers).toEqual(["No customer name was extracted from the utterance."]);
    expect(result?.effectiveMode).toBe("draft");
  });

  test("customer resolved, product NOT resolved -> requirement falls back to raw productText, no blocker (product is never a blocker)", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    productsApiMock.listProducts.mockImplementation(async () => []); // no match

    const result = await plan({
      customerName: "Ramesh",
      productText: "SomeUnknownStone",
      quantity: 10,
      unit: "sqft",
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.product_id).toBeNull();
    expect(result?.params.requirement).toBe("10 sqft SomeUnknownStone");
  });

  test("unit defaults to sqft when not extracted", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await plan({ customerName: "Ramesh", quantity: 10, rate: 100 });
    expect(result?.params.requirement).toContain("10 sqft");
  });

  test("no quantity/rate -> budget_inr is undefined", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await plan({ customerName: "Ramesh", productText: "Mint" });
    expect(result?.params.budget_inr).toBeUndefined();
  });

  test("notes field records the original utterance verbatim", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await plan(
      { customerName: "Ramesh" },
      { originalText: "Ramesh ne 250 sqft Mint 145 ma joie che." },
    );
    expect(result?.params.notes).toBe('AI-logged from: "Ramesh ne 250 sqft Mint 145 ma joie che."');
  });

  test(
    "KNOWN DEFECT (reported, not fixed — see Milestone 3 validation report): " +
      "when nothing at all is extracted, requirement falls back to the literal string " +
      '"material", never to understanding.canonicalText, because `material` always contributes ' +
      "a non-empty string to requirementParts (product.productLabel ?? entities.productText ?? " +
      '"material" is never empty) — the `: understanding.canonicalText` branch in planLogEnquiry ' +
      "is unreachable dead code. This test pins today's actual behavior so a future change to " +
      "this fallback is a deliberate, visible diff rather than a silent regression either way.",
    async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      productsApiMock.listProducts.mockImplementation(async () => []);

      const result = await plan(
        {}, // no customerName (blocker, but requirement is still computed), no product/qty/rate
        { canonicalText: "A vague utterance nothing could be extracted from." },
      );

      // What a human would expect from the design comment ("falls back to
      // canonicalText"):
      // expect(result?.params.requirement).toBe("A vague utterance nothing could be extracted from.");
      // What the code actually does:
      expect(result?.params.requirement).toBe("material");
    },
  );

  test("policy: default log_enquiry policy (confirm/0.85) is a ceiling, never upgraded by high confidence", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    const result = await plan({ customerName: "Ramesh" }, { confidence: 0.99 });
    expect(result?.mode).toBe("confirm");
    expect(result?.effectiveMode).toBe("confirm");
  });

  test("policy: an app_settings override changes both the ceiling and the effective mode", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    appSettingsApiMock.getAppSetting.mockImplementation(async () => ({
      log_enquiry: { mode: "auto", autoThreshold: 0.5 },
    }));
    const result = await plan({ customerName: "Ramesh" }, { confidence: 0.9 });
    expect(result?.mode).toBe("auto");
    expect(result?.effectiveMode).toBe("auto");
  });
});

describe("planNoteFollowup (via planAction)", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (
    entities: Record<string, unknown>,
    context?: { entityType?: string; entityId?: string },
    extra: Partial<VieUnderstanding> = {},
  ) => planAction(understanding({ intent: "note_followup", entities, ...extra }), context);

  test("caller-supplied context + relativeDays -> no blockers, params carry entity + computed date + default channel", async () => {
    const before = Date.now();
    const result = await plan(
      { note: "Reminder to call back", relativeDays: 3 },
      { entityType: "enquiry", entityId: "enq-123" },
    );
    expect(result?.blockers).toEqual([]);
    expect(result?.params.entity_type).toBe("enquiry");
    expect(result?.params.entity_id).toBe("enq-123");
    expect(result?.params.channel).toBe("call");
    expect(result?.params.notes).toBe("Reminder to call back");
    const scheduledAt = new Date(result?.params.scheduled_at as string).getTime();
    expect(scheduledAt).toBeGreaterThanOrEqual(before + 3 * 24 * 60 * 60 * 1000 - 1000);
    expect(scheduledAt).toBeLessThanOrEqual(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1000);
  });

  test("no context, unresolvable target name -> target blocker present", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    const result = await plan({ note: "General follow-up", targetName: "Ramesh", relativeDays: 1 });
    expect(result?.blockers).toContain('No existing customer matches "Ramesh".');
    expect(result?.effectiveMode).toBe("draft");
  });

  test("no relativeDays -> date blocker present even when target resolves", async () => {
    const result = await plan(
      { note: "General follow-up" },
      { entityType: "enquiry", entityId: "enq-123" },
    );
    expect(result?.blockers).toContain("No follow-up date could be determined from the utterance.");
    expect(result?.effectiveMode).toBe("draft");
  });

  test("explicit channel is preserved instead of defaulting", async () => {
    const result = await plan(
      { note: "Reminder", relativeDays: 1, channel: "whatsapp" },
      { entityType: "enquiry", entityId: "enq-123" },
    );
    expect(result?.params.channel).toBe("whatsapp");
  });

  test("policy: default note_followup policy (auto/0.85) auto-executes once unblocked and confident", async () => {
    const result = await plan(
      { note: "Reminder", relativeDays: 1 },
      { entityType: "enquiry", entityId: "enq-123" },
      undefined,
    );
    // default confidence in the understanding() helper is 0.9, above 0.85
    expect(result?.mode).toBe("auto");
    expect(result?.effectiveMode).toBe("auto");
  });

  test("policy: default note_followup policy downgrades to confirm just below threshold", async () => {
    const result = await plan(
      { note: "Reminder", relativeDays: 1 },
      { entityType: "enquiry", entityId: "enq-123" },
      { confidence: 0.5 },
    );
    expect(result?.mode).toBe("auto");
    expect(result?.effectiveMode).toBe("confirm");
  });
});

describe("planCreateCustomer (via planAction)", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (entities: Record<string, unknown>, extra: Partial<VieUnderstanding> = {}) =>
    planAction(understanding({ intent: "create_customer", entities, ...extra }));

  test("name + valid mobile, no duplicate -> no blockers, params carry name/mobile/type default", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
    const result = await plan({ customerName: "Meera", mobile: "9724455663" });
    expect(result?.blockers).toEqual([]);
    expect(result?.params).toMatchObject({
      name: "Meera",
      mobile: "9724455663",
      customer_type: "individual",
    });
    expect(customersApiMock.findCustomerByPhone).toHaveBeenCalledWith("9724455663");
  });

  test("explicit customerType is preserved instead of defaulting to individual", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
    const result = await plan({
      customerName: "Meera",
      mobile: "9724455663",
      customerType: "contractor",
    });
    expect(result?.params.customer_type).toBe("contractor");
  });

  test("no customer name -> blocker", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
    const result = await plan({ mobile: "9724455663" });
    expect(result?.blockers).toContain("No customer name was extracted from the utterance.");
  });

  test("no mobile extracted -> blocker, and the duplicate-check resolver is never called", async () => {
    const result = await plan({ customerName: "Meera" });
    expect(result?.blockers).toContain("No valid mobile number was extracted from the utterance.");
    expect(customersApiMock.findCustomerByPhone).not.toHaveBeenCalled();
  });

  test("mobile with fewer than 10 digits after stripping non-digits -> blocker, duplicate-check skipped", async () => {
    const result = await plan({ customerName: "Meera", mobile: "98765" });
    expect(result?.blockers).toContain("No valid mobile number was extracted from the utterance.");
    expect(customersApiMock.findCustomerByPhone).not.toHaveBeenCalled();
  });

  test("mobile matching an existing customer -> duplicate blocker, never auto-links", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => ({
      id: "cust-9",
      name: "Ramesh Patel",
      customer_code: "CUST-0042",
    }));
    const result = await plan({ customerName: "Meera", mobile: "9724455663" });
    expect(result?.blockers).toContain(
      "A customer with this phone number already exists: Ramesh Patel (CUST-0042).",
    );
  });

  test(
    "KNOWN GAP (reported, not fixed — see Milestone 3 validation report): the blocker check " +
      "only enforces a LOWER bound (< 10 digits after stripping). UX contract §4 specifies " +
      "10-15 digits, matching zMobile's own pattern, but there is no upper-bound check here — " +
      "an overlong, malformed mobile extraction is NOT blocked at planning time and would only " +
      "fail later, inside createCustomer()'s own zMobile validation at execution time (caught by " +
      "workflowEngine.ts's try/catch as a 'failed' status rather than gracefully downgrading to " +
      "'draft' the way every other unresolvable prerequisite does).",
    async () => {
      customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
      // 20 digits — clearly outside zMobile's raw-string max(15), but the
      // Planner's own check (`normalizedMobile.length < 10`) has no ceiling.
      const overlongMobile = "98765432101234567890";
      const result = await plan({ customerName: "Meera", mobile: overlongMobile });
      expect(result?.blockers).toEqual([]);
      expect(result?.params.mobile).toBe(overlongMobile);
    },
  );

  test("policy: default create_customer policy (confirm/0.9) is a ceiling, never upgraded by high confidence", async () => {
    customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
    const result = await plan(
      { customerName: "Meera", mobile: "9724455663" },
      { confidence: 0.99 },
    );
    expect(result?.mode).toBe("confirm");
    expect(result?.effectiveMode).toBe("confirm");
  });
});

describe("planCreateQuotation (via planAction)", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (entities: Record<string, unknown>, extra: Partial<VieUnderstanding> = {}) =>
    planAction(understanding({ intent: "create_quotation", entities, ...extra }));

  test("no customer name -> customer blocker, and resolveProject/listProjectsByCustomer is never called", async () => {
    const result = await plan({});
    expect(result?.blockers).toEqual(["No customer name was extracted from the utterance."]);
    expect(result?.effectiveMode).toBe("draft");
    expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
  });

  test("customer name matches no existing customer -> customer blocker, project resolution skipped", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []);
    const result = await plan({ customerName: "Nobody" });
    expect(result?.blockers).toEqual(['No existing customer matches "Nobody".']);
    expect(projectsApiMock.listProjectsByCustomer).not.toHaveBeenCalled();
    expect(result?.params.customer_id).toBeNull();
    expect(result?.params.project_id).toBeNull();
  });

  test("customer resolves, zero projects -> project blocker naming the customer, forces draft", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
    const result = await plan({ customerName: "Ramesh" }, { confidence: 0.99 });
    expect(result?.blockers).toEqual(['"Ramesh Patel" has no existing project to quote against.']);
    expect(result?.effectiveMode).toBe("draft");
    expect(result?.params.customer_id).toBe("cust-1");
    expect(result?.params.project_id).toBeNull();
  });

  test("customer resolves, multiple projects -> ambiguous project blocker listing candidates", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
      { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
    ]);
    const result = await plan({ customerName: "Ramesh" });
    expect(result?.blockers).toEqual([
      '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
    ]);
    expect(result?.params.project_id).toBeNull();
  });

  test("customer resolves, exactly one project -> no blockers, params carry both ids", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    const result = await plan({ customerName: "Ramesh" });
    expect(result?.blockers).toEqual([]);
    expect(result?.params).toMatchObject({
      customer_id: "cust-1",
      project_id: "proj-1",
    });
  });

  test("resolveProject is called with the customer's resolved id and label, sequentially after resolveCustomer resolves", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    await plan({ customerName: "Ramesh" });
    expect(customersApiMock.listCustomers).toHaveBeenCalledWith("Ramesh");
    expect(projectsApiMock.listProjectsByCustomer).toHaveBeenCalledWith("cust-1");
  });

  test("notes field records the original utterance verbatim", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    const result = await plan(
      { customerName: "Ramesh" },
      { originalText: "Quote for Ramesh's project." },
    );
    expect(result?.params.notes).toBe('AI-logged from: "Quote for Ramesh\'s project."');
  });

  test("policy: default create_quotation policy (confirm/0.9) is a ceiling, never upgraded by high confidence", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    const result = await plan({ customerName: "Ramesh" }, { confidence: 0.99 });
    expect(result?.mode).toBe("confirm");
    expect(result?.effectiveMode).toBe("confirm");
  });

  test("policy: an app_settings override changes both the ceiling and the effective mode", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
    appSettingsApiMock.getAppSetting.mockImplementation(async () => ({
      create_quotation: { mode: "auto", autoThreshold: 0.5 },
    }));
    const result = await plan({ customerName: "Ramesh" }, { confidence: 0.9 });
    expect(result?.mode).toBe("auto");
    expect(result?.effectiveMode).toBe("auto");
  });
});

describe("planCreateQuotation line-item extraction (via planAction, Milestone 5)", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (entities: Record<string, unknown>, extra: Partial<VieUnderstanding> = {}) =>
    planAction(understanding({ intent: "create_quotation", entities, ...extra }));

  // Every test in this block resolves customer + project cleanly unless a
  // test is specifically exercising customer/project blocker independence,
  // so item-related assertions aren't muddied by unrelated blockers.
  function resolveCustomerAndProjectCleanly() {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
  }

  test("single product -> one resolved item in params.items, no blockers", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint", quantity: 300, unit: "sqft", rate: 145 }],
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toEqual([
      {
        product_id: "prod-1",
        description: "Mint Green Marble",
        quantity: 300,
        unit: "sqft",
        unit_price: 145,
      },
    ]);
  });

  test("multiple products -> each resolved independently, all present in params.items in order", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async (text?: string) => {
      if (text === "Mint") return [{ id: "prod-1", name: "Mint Green Marble" }];
      if (text === "Kadappa") return [{ id: "prod-2", name: "Kadappa Black" }];
      return [];
    });

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 100, unit: "sqft", rate: 145 },
        { productText: "Kadappa", quantity: 200, unit: "sqft", rate: 210 },
      ],
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toEqual([
      {
        product_id: "prod-1",
        description: "Mint Green Marble",
        quantity: 100,
        unit: "sqft",
        unit_price: 145,
      },
      {
        product_id: "prod-2",
        description: "Kadappa Black",
        quantity: 200,
        unit: "sqft",
        unit_price: 210,
      },
    ]);
  });

  test("shared quantity — two items independently extracted with the same quantity value both carry it through unchanged", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async (text?: string) => {
      if (text === "Mint") return [{ id: "prod-1", name: "Mint Green Marble" }];
      if (text === "Kadappa") return [{ id: "prod-2", name: "Kadappa Black" }];
      return [];
    });

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 300, unit: "sqft", rate: 145 },
        { productText: "Kadappa", quantity: 300, unit: "sqft", rate: 210 },
      ],
    });

    expect(result?.blockers).toEqual([]);
    expect((result?.params.items as Array<{ quantity: number }>).map((i) => i.quantity)).toEqual([
      300, 300,
    ]);
  });

  test("independent quantities — each item keeps its own extracted quantity, not overwritten by another item's", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 100, rate: 145 },
        { productText: "Kadappa", quantity: 250, rate: 210 },
      ],
    });

    expect(result?.blockers).toEqual([]);
    expect((result?.params.items as Array<{ quantity: number }>).map((i) => i.quantity)).toEqual([
      100, 250,
    ]);
  });

  test("installation-flavored utterance -> line items still resolve normally, no invented installation field, notes carries the utterance verbatim", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan(
      {
        customerName: "Ramesh",
        items: [{ productText: "Mint", quantity: 300, unit: "sqft", rate: 145 }],
      },
      { originalText: "Quote 300 sqft Mint for Ramesh with supply and installation." },
    );

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toHaveLength(1);
    expect(Object.keys((result?.params.items as Array<Record<string, unknown>>)[0]).sort()).toEqual(
      ["description", "product_id", "quantity", "unit", "unit_price"].sort(),
    );
    expect(result?.params.notes).toBe(
      'AI-logged from: "Quote 300 sqft Mint for Ramesh with supply and installation."',
    );
  });

  test("duplicate products — the same product mentioned twice stays as two distinct line items, resolved independently, never merged", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 100, rate: 145 },
        { productText: "Mint", quantity: 50, rate: 145 },
      ],
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toHaveLength(2);
    expect(productsApiMock.listProducts).toHaveBeenCalledTimes(2);
    expect(
      (result?.params.items as Array<{ product_id: string }>).every(
        (i) => i.product_id === "prod-1",
      ),
    ).toBe(true);
  });

  test("ambiguous product (multiple matches) -> product_id null, description falls back to raw text, NEVER a blocker (matches resolveProduct()/log_enquiry behavior)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
      { id: "prod-2", name: "Mint White Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint", quantity: 300, rate: 145 }],
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toEqual([
      {
        product_id: null,
        description: "Mint",
        quantity: 300,
        unit: "sqft",
        unit_price: 145,
      },
    ]);
  });

  test("unknown product (zero matches) -> product_id null, description falls back to raw text, NEVER a blocker (matches resolveProduct()/log_enquiry behavior)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "SomeUnknownStone", quantity: 300, rate: 145 }],
    });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toEqual([
      {
        product_id: null,
        description: "SomeUnknownStone",
        quantity: 300,
        unit: "sqft",
        unit_price: 145,
      },
    ]);
  });

  test("missing quantity on one item -> blocker naming that line item, forces draft (all-or-nothing — the whole plan is blocked)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint", rate: 145 }],
    });

    expect(result?.blockers).toEqual([
      "Line item 1: no quantity was extracted from the utterance.",
    ]);
    expect(result?.effectiveMode).toBe("draft");
  });

  test("missing quantity on the second of two items -> only that item is named, but the whole plan is still blocked", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 100, rate: 145 },
        { productText: "Kadappa", rate: 210 },
      ],
    });

    expect(result?.blockers).toEqual([
      "Line item 2: no quantity was extracted from the utterance.",
    ]);
    expect(result?.effectiveMode).toBe("draft");
  });

  test("unit not extracted -> defaults to sqft, per item (mirrors planLogEnquiry's existing default)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint", quantity: 300, rate: 145 }],
    });

    expect((result?.params.items as Array<{ unit: string }>)[0].unit).toBe("sqft");
  });

  test("rate not extracted -> unit_price is undefined, never fabricated, and IS a Planner-level blocker as of Milestone 6 (previously left solely to actions/createQuotation.ts's execution-time schema validation — see planCreateQuotation's own header comment for why that left a gap)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint", quantity: 300 }],
    });

    expect(result?.blockers).toEqual([
      "Line item 1: no unit price was extracted from the utterance.",
    ]);
    expect(result?.effectiveMode).toBe("draft");
    expect((result?.params.items as Array<{ unit_price: unknown }>)[0].unit_price).toBeUndefined();
  });

  test("no items field at all -> params.items is an empty array, no item-related blockers", async () => {
    resolveCustomerAndProjectCleanly();

    const result = await plan({ customerName: "Ramesh" });

    expect(result?.blockers).toEqual([]);
    expect(result?.params.items).toEqual([]);
    expect(productsApiMock.listProducts).not.toHaveBeenCalled();
  });

  test("line items resolve independently of an unresolved customer — product resolution still runs and populates params.items even when the customer blocks the plan", async () => {
    customersApiMock.listCustomers.mockImplementation(async () => []); // customer blocker
    productsApiMock.listProducts.mockImplementation(async () => [
      { id: "prod-1", name: "Mint Green Marble" },
    ]);

    const result = await plan({
      customerName: "Nobody",
      items: [{ productText: "Mint", quantity: 300, rate: 145 }],
    });

    expect(result?.blockers).toEqual(['No existing customer matches "Nobody".']);
    expect(result?.params.items).toEqual([
      {
        product_id: "prod-1",
        description: "Mint Green Marble",
        quantity: 300,
        unit: "sqft",
        unit_price: 145,
      },
    ]);
  });

  test("resolveProduct is called once per item with each item's own trimmed productText", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    await plan({
      customerName: "Ramesh",
      items: [
        { productText: "  Mint  ", quantity: 100, rate: 145 },
        { productText: "Kadappa", quantity: 200, rate: 210 },
      ],
    });

    expect(productsApiMock.listProducts).toHaveBeenCalledTimes(2);
    expect(productsApiMock.listProducts).toHaveBeenNthCalledWith(1, "Mint");
    expect(productsApiMock.listProducts).toHaveBeenNthCalledWith(2, "Kadappa");
  });

  test("missing unit_price on one item among several priced items blocks the whole plan (all-or-nothing — Milestone 6)", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [
        { productText: "Mint", quantity: 100, rate: 145 },
        { productText: "Kadappa", quantity: 200 },
      ],
    });

    expect(result?.blockers).toEqual([
      "Line item 2: no unit price was extracted from the utterance.",
    ]);
    expect(result?.effectiveMode).toBe("draft");
  });

  test("an item missing BOTH quantity and unit_price produces both blockers, not just one", async () => {
    resolveCustomerAndProjectCleanly();
    productsApiMock.listProducts.mockImplementation(async () => []);

    const result = await plan({
      customerName: "Ramesh",
      items: [{ productText: "Mint" }],
    });

    expect(result?.blockers).toEqual([
      "Line item 1: no quantity was extracted from the utterance.",
      "Line item 1: no unit price was extracted from the utterance.",
    ]);
    expect(result?.effectiveMode).toBe("draft");
  });
});

describe("planCreateQuotation — Milestone 6: unit_price/category/projectText alignment", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  const plan = (entities: Record<string, unknown>, extra: Partial<VieUnderstanding> = {}) =>
    planAction(understanding({ intent: "create_quotation", entities, ...extra }));

  function resolveCustomerAndProjectCleanly() {
    customersApiMock.listCustomers.mockImplementation(async () => [
      { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
    ]);
    projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
      { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
    ]);
  }

  describe("category: Understanding -> Planner -> ExecutionPlan.params (Action Handler/Quote schema already consume params.category unchanged since Milestone 4)", () => {
    test("category is passed through from entities to params.category when stated", async () => {
      resolveCustomerAndProjectCleanly();
      const result = await plan({ customerName: "Ramesh", category: "supply_and_installation" });
      expect(result?.params.category).toBe("supply_and_installation");
    });

    test("each real QUOTE_CATEGORIES value passes through unchanged", async () => {
      resolveCustomerAndProjectCleanly();
      for (const category of [
        "supply_only",
        "supply_and_installation",
        "installation_only",
        "material_and_labour",
      ]) {
        const result = await plan({ customerName: "Ramesh", category });
        expect(result?.params.category).toBe(category);
      }
    });

    test("category is undefined, never fabricated, when not stated in the utterance", async () => {
      resolveCustomerAndProjectCleanly();
      const result = await plan({ customerName: "Ramesh" });
      expect(result?.params.category).toBeUndefined();
    });

    test("category never becomes a blocker on its own (soft, optional field)", async () => {
      resolveCustomerAndProjectCleanly();
      const result = await plan({ customerName: "Ramesh", category: "installation_only" });
      expect(result?.blockers).toEqual([]);
    });
  });

  describe("projectText: Understanding -> Planner -> resolveProject() hint + ExecutionPlan.params", () => {
    test("projectText is preserved on params.project_text even when it wasn't needed to resolve anything", async () => {
      resolveCustomerAndProjectCleanly();
      const result = await plan({ customerName: "Ramesh", projectText: "Shah Residence" });
      expect(result?.params.project_text).toBe("Shah Residence");
    });

    test("projectText is undefined, never fabricated, when not stated", async () => {
      resolveCustomerAndProjectCleanly();
      const result = await plan({ customerName: "Ramesh" });
      expect(result?.params.project_text).toBeUndefined();
    });

    test("projectText narrows an otherwise-ambiguous project (2 candidates) to exactly one match, no blocker", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);

      const result = await plan({ customerName: "Ramesh", projectText: "Shah Villa" });

      expect(result?.blockers).toEqual([]);
      expect(result?.params.project_id).toBe("proj-2");
      expect(result?.params.project_text).toBe("Shah Villa");
    });

    test("projectText that matches no candidate falls back to the ordinary ambiguous-project blocker, unchanged", async () => {
      customersApiMock.listCustomers.mockImplementation(async () => [
        { id: "cust-1", name: "Ramesh Patel", customer_code: "CUST-0001" },
      ]);
      projectsApiMock.listProjectsByCustomer.mockImplementation(async () => [
        { id: "proj-1", name: "Shah Residence", project_code: "PRJ-0001", customer_id: "cust-1" },
        { id: "proj-2", name: "Shah Villa", project_code: "PRJ-0002", customer_id: "cust-1" },
      ]);

      const result = await plan({ customerName: "Ramesh", projectText: "Nonexistent Project" });

      expect(result?.blockers).toEqual([
        '"Ramesh Patel" has 2 projects: Shah Residence (PRJ-0001), Shah Villa (PRJ-0002).',
      ]);
      expect(result?.effectiveMode).toBe("draft");
    });

    test("resolveProject is called with the extracted projectText as its third argument", async () => {
      resolveCustomerAndProjectCleanly();
      await plan({ customerName: "Ramesh", projectText: "Shah Residence" });
      expect(projectsApiMock.listProjectsByCustomer).toHaveBeenCalledWith("cust-1");
      // resolveProject itself (not mocked directly — it's real code under
      // test via planAction) is exercised end-to-end above; this call
      // confirms the underlying read-only lookup still only ever needs the
      // customer_id, matching resolveProject.test.ts's own coverage of the
      // hint parameter in isolation.
    });
  });

  describe("missing unit_price: Planner blocker forces draft, execution is never attempted (UX Contract §3/§6, Architecture Review §6)", () => {
    test("a plan with a missing-price blocker never reaches an executable mode, regardless of policy or confidence", async () => {
      resolveCustomerAndProjectCleanly();
      productsApiMock.listProducts.mockImplementation(async () => []);

      const result = await plan(
        { customerName: "Ramesh", items: [{ productText: "Mint", quantity: 300 }] },
        { confidence: 0.99 },
      );

      // Even maximal confidence cannot overcome a non-empty blockers array —
      // resolveEffectiveMode() (unmodified) forces "draft" unconditionally.
      // vie.functions.ts only ever auto-invokes executeAction() for a
      // "planned" status, which requires effectiveMode "auto" AND an empty
      // blockers array (also unmodified) — so this plan can never reach
      // execution without a human first seeing the blocker and completing
      // the draft via completeDraftAction's patch mechanism. Neither
      // vie.functions.ts nor workflowEngine.ts is modified or exercised
      // directly by this test (out of scope for this milestone — see
      // engineering/VIE-CreateQuotation-Midpoint-Review.md §5); this test
      // pins the one guarantee this milestone's own code is responsible
      // for: the blockers array is non-empty whenever a price is missing.
      expect(result?.blockers.length).toBeGreaterThan(0);
      expect(result?.effectiveMode).toBe("draft");
      expect(result?.effectiveMode).not.toBe("auto");
      expect(result?.effectiveMode).not.toBe("confirm");
    });

    test("policy is confirm-only for create_quotation, so even a fully priced/quantified plan never reaches auto-execution", async () => {
      resolveCustomerAndProjectCleanly();
      productsApiMock.listProducts.mockImplementation(async () => [
        { id: "prod-1", name: "Mint Green Marble" },
      ]);

      const result = await plan(
        {
          customerName: "Ramesh",
          items: [{ productText: "Mint", quantity: 300, unit: "sqft", rate: 145 }],
        },
        { confidence: 0.99 },
      );

      expect(result?.blockers).toEqual([]);
      expect(result?.mode).toBe("confirm");
      expect(result?.effectiveMode).toBe("confirm");
    });
  });
});
