import { describe, expect, it } from "bun:test";
import {
  CALL_OUTCOMES,
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  getCustomerCrmState,
  getCustomerResponseStatus,
  type CustomerResponseStatus,
} from "./crm-status";

describe("Customer CRM Status", () => {
  it("includes order_placed and order_completed in CUSTOMER_RESPONSE_STATUS_CONFIG", () => {
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.label).toBe("Order Placed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.shortLabel).toBe("Order Placed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.dotColor).toContain("purple");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.label).toBe("Order Completed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.shortLabel).toBe("Completed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.dotColor).toContain("teal");
  });

  it("includes all expected customer response statuses", () => {
    const keys: CustomerResponseStatus[] = [
      "active_responsive",
      "order_placed",
      "order_completed",
      "regular_future_requirement",
      "followup_pending",
      "awaiting_reply",
      "inactive_no_response",
      "do_not_contact",
    ];

    for (const key of keys) {
      expect(CUSTOMER_RESPONSE_STATUS_CONFIG[key]).toBeDefined();
      expect(CUSTOMER_RESPONSE_STATUS_CONFIG[key].value).toBe(key);
      expect(CUSTOMER_RESPONSE_STATUS_CONFIG[key].label).toBeTruthy();
      expect(CUSTOMER_RESPONSE_STATUS_CONFIG[key].description).toBeTruthy();
    }
  });

  it("extracts CRM state and status for order_placed and order_completed customer", () => {
    const customer = {
      is_active: true,
      workflow_state: {
        response_status: "order_placed" as const,
        last_call_at: "2026-10-09T08:00:00.000Z",
      },
    };

    expect(getCustomerCrmState(customer).response_status).toBe("order_placed");
    expect(getCustomerResponseStatus(customer)).toBe("order_placed");

    const customerCompleted = {
      is_active: true,
      workflow_state: {
        response_status: "order_completed" as const,
        last_call_at: "2026-10-10T10:00:00.000Z",
      },
    };

    expect(getCustomerCrmState(customerCompleted).response_status).toBe("order_completed");
    expect(getCustomerResponseStatus(customerCompleted)).toBe("order_completed");

    const customerRegularFuture = {
      is_active: true,
      workflow_state: {
        response_status: "regular_future_requirement" as const,
      },
    };
    expect(getCustomerResponseStatus(customerRegularFuture)).toBe("regular_future_requirement");
  });

  it("defaults to active_responsive or inactive_no_response when response_status is unset", () => {
    expect(getCustomerResponseStatus({ is_active: true })).toBe("active_responsive");
    expect(getCustomerResponseStatus({ is_active: false })).toBe("inactive_no_response");
  });

  it("includes order_placed, order_completed, and regular_future_requirement in CALL_OUTCOMES", () => {
    const foundPlaced = CALL_OUTCOMES.find((o) => o.value === "order_placed");
    expect(foundPlaced).toBeDefined();
    expect(foundPlaced?.label).toContain("Order Placed");

    const foundCompleted = CALL_OUTCOMES.find((o) => o.value === "order_completed");
    expect(foundCompleted).toBeDefined();
    expect(foundCompleted?.label).toContain("Order Completed");

    const foundFuture = CALL_OUTCOMES.find((o) => o.value === "regular_future_requirement");
    expect(foundFuture).toBeDefined();
    expect(foundFuture?.label).toContain("Regular requirement");

    const foundSamples = CALL_OUTCOMES.find((o) => o.value === "samples_required_site");
    expect(foundSamples).toBeDefined();
    expect(foundSamples?.label).toBe("Samples required at site");

    const foundCatalog = CALL_OUTCOMES.find((o) => o.value === "asked_for_catalog");
    expect(foundCatalog).toBeDefined();
    expect(foundCatalog?.label).toBe("Asked for product catalog/s");
  });

  it("detects assigned salesperson Rishi or Raman from workflow_state or external_ref", async () => {
    const { getCustomerSalesperson } = await import("./crm-status");
    expect(
      getCustomerSalesperson({
        workflow_state: { assigned_to: "rishi" },
      }),
    ).toBe("rishi");

    expect(
      getCustomerSalesperson({
        workflow_state: { assigned_salesperson: "Rishi Rai" },
      }),
    ).toBe("rishi");

    expect(
      getCustomerSalesperson({
        workflow_state: { assigned_to: "raman" },
      }),
    ).toBe("raman");

    expect(
      getCustomerSalesperson({
        external_ref: { assigned_salesperson: "Raman Pupneja" },
      }),
    ).toBe("raman");

    expect(getCustomerSalesperson(null)).toBeNull();
    expect(getCustomerSalesperson({})).toBeNull();
  });
});
