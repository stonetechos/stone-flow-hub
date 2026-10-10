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
  });

  it("defaults to active_responsive or inactive_no_response when response_status is unset", () => {
    expect(getCustomerResponseStatus({ is_active: true })).toBe("active_responsive");
    expect(getCustomerResponseStatus({ is_active: false })).toBe("inactive_no_response");
  });

  it("includes order_placed and order_completed in CALL_OUTCOMES", () => {
    const foundPlaced = CALL_OUTCOMES.find((o) => o.value === "order_placed");
    expect(foundPlaced).toBeDefined();
    expect(foundPlaced?.label).toContain("Order Placed");

    const foundCompleted = CALL_OUTCOMES.find((o) => o.value === "order_completed");
    expect(foundCompleted).toBeDefined();
    expect(foundCompleted?.label).toContain("Order Completed");
  });
});
