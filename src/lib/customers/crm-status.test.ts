import { describe, expect, it } from "bun:test";
import {
  CALL_OUTCOMES,
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  buildCustomerFollowupWhatsappMessage,
  buildCustomerPaymentReminderWhatsappMessage,
  buildCustomerStatusWhatsappMessage,
  getCustomerCrmState,
  getCustomerPaymentReminderInfo,
  getCustomerResponseStatus,
  getCustomerStatusNotificationInfo,
  type CustomerResponseStatus,
} from "./crm-status";

describe("Customer CRM Status", () => {
  it("includes order_placed and order_completed in CUSTOMER_RESPONSE_STATUS_CONFIG", () => {
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.label).toBe("Order Placed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.shortLabel).toBe("Order Placed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_placed.dotColor).toContain("purple");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.installation_team_working).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.installation_team_working.label).toBe(
      "Installation Team Working",
    );
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.installation_team_working.shortLabel).toBe(
      "Installation Team",
    );
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.installation_team_working.dotColor).toContain("blue");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.artwork_team_working).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.artwork_team_working.label).toBe("Artwork Team Working");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.artwork_team_working.shortLabel).toBe("Artwork Team");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.artwork_team_working.dotColor).toContain("violet");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.label).toBe("Order Completed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.shortLabel).toBe("Completed");
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_completed.dotColor).toContain("teal");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_delay).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_delay.label).toBe(
      "Order Cancelled · Delay",
    );
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_delay.shortLabel).toBe(
      "Cancelled · Delay",
    );
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_delay.dotColor).toContain("rose");

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_change_of_plans).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_change_of_plans.label).toBe(
      "Order Cancelled · Change of Plans",
    );
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.order_cancelled_change_of_plans.shortLabel).toBe(
      "Cancelled · Plans",
    );

    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.payment_pending).toBeDefined();
    expect(CUSTOMER_RESPONSE_STATUS_CONFIG.payment_pending.label).toContain("Payment");
  });

  it("includes all expected customer response statuses", () => {
    const keys: CustomerResponseStatus[] = [
      "active_responsive",
      "payment_pending",
      "order_placed",
      "installation_team_working",
      "artwork_team_working",
      "order_completed",
      "order_cancelled_delay",
      "order_cancelled_change_of_plans",
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

    const foundInstall = CALL_OUTCOMES.find((o) => o.value === "installation_team_working");
    expect(foundInstall).toBeDefined();
    expect(foundInstall?.label).toContain("Installation Team Working");

    const foundArtwork = CALL_OUTCOMES.find((o) => o.value === "artwork_team_working");
    expect(foundArtwork).toBeDefined();
    expect(foundArtwork?.label).toContain("Artwork Team Working");

    const foundCompleted = CALL_OUTCOMES.find((o) => o.value === "order_completed");
    expect(foundCompleted).toBeDefined();
    expect(foundCompleted?.label).toContain("Order Completed");

    const foundCancelDelay = CALL_OUTCOMES.find((o) => o.value === "order_cancelled_delay");
    expect(foundCancelDelay).toBeDefined();
    expect(foundCancelDelay?.label).toContain("Delay");

    const foundCancelPlans = CALL_OUTCOMES.find(
      (o) => o.value === "order_cancelled_change_of_plans",
    );
    expect(foundCancelPlans).toBeDefined();
    expect(foundCancelPlans?.label).toContain("Change of Plans");

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

  describe("buildCustomerFollowupWhatsappMessage", () => {
    it("builds a personalized follow-up message with contact person and salesperson signature", () => {
      const msg = buildCustomerFollowupWhatsappMessage({
        customerName: "Sharma Residence",
        contactPerson: "Rajesh Sharma",
        salesperson: "raman",
      });

      expect(msg).toContain("Hi Rajesh Sharma,");
      expect(msg).toContain("Kindly update us on the status");
      expect(msg).toContain("unable to finalise");
      expect(msg).toContain("Raman Pupneja");
      expect(msg).toContain("Stone Tech");
    });

    it("falls back to customer name if contact person is missing", () => {
      const msg = buildCustomerFollowupWhatsappMessage({
        customerName: "Apex Builders",
        salesperson: "rishi",
      });

      expect(msg).toContain("Hi Apex Builders,");
      expect(msg).toContain("Rishi Rai");
      expect(msg).toContain("unable to finalise");
    });

    it("includes quote/order number when provided", () => {
      const msg = buildCustomerFollowupWhatsappMessage({
        customerName: "Metro Spaces",
        orderNo: "Q-2026-0089",
      });

      expect(msg).toContain("Order/Quote #Q-2026-0089");
      expect(msg).toContain("Kindly update us on the status");
      expect(msg).toContain("unable to finalise");
      expect(msg).toContain("Regards,\nStone Tech");
    });

    it("handles missing names gracefully with generic greeting", () => {
      const msg = buildCustomerFollowupWhatsappMessage({});

      expect(msg).toContain("Hello,");
      expect(msg).toContain("Kindly update us on the status");
      expect(msg).toContain("unable to finalise");
      expect(msg).toContain("Stone Tech");
    });
  });

  describe("Customer Payment Promise & 2-Day Reminder Flag", () => {
    it("includes payment_promised in CALL_OUTCOMES", () => {
      const outcome = CALL_OUTCOMES.find((o) => o.value === "payment_promised");
      expect(outcome).toBeDefined();
      expect(outcome?.label).toContain("Payment Promised");
    });

    it("returns hasReminder false when customer has no payment promise", () => {
      const info = getCustomerPaymentReminderInfo({
        workflow_state: {},
      });
      expect(info.hasReminder).toBe(false);
      expect(info.isFlaggedActive).toBe(false);
    });

    it("returns hasReminder false when payment reminder was already completed", () => {
      const info = getCustomerPaymentReminderInfo({
        workflow_state: {
          payment_promised_date: "2026-10-25",
          payment_reminder_completed_at: "2026-10-21T10:00:00.000Z",
        },
      });
      expect(info.hasReminder).toBe(false);
    });

    it("flags active when today is within 2 days of payment promise", () => {
      // Create a date 1 day in the future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isoDate = tomorrow.toISOString().split("T")[0];

      const info = getCustomerPaymentReminderInfo({
        workflow_state: {
          payment_promised_date: isoDate,
          payment_promised_amount: 75000,
          payment_reminder_flag_days: 2,
        },
      });

      expect(info.hasReminder).toBe(true);
      expect(info.isFlaggedActive).toBe(true);
      expect(info.urgency).toBe("flagged_2days");
      expect(info.daysRemaining).toBe(1);
      expect(info.badgeLabel).toBe("Pay Due in 1d");
      expect(info.promisedAmount).toBe(75000);
    });

    it("flags active when payment is due today", () => {
      const today = new Date();
      const isoDate = today.toISOString().split("T")[0];

      const info = getCustomerPaymentReminderInfo({
        workflow_state: {
          payment_promised_date: isoDate,
        },
      });

      expect(info.hasReminder).toBe(true);
      expect(info.isFlaggedActive).toBe(true);
      expect(info.urgency).toBe("due_today");
      expect(info.daysRemaining).toBe(0);
      expect(info.badgeLabel).toBe("Pay Due Today");
    });

    it("flags active when payment is overdue", () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      const isoDate = past.toISOString().split("T")[0];

      const info = getCustomerPaymentReminderInfo({
        workflow_state: {
          payment_promised_date: isoDate,
        },
      });

      expect(info.hasReminder).toBe(true);
      expect(info.isFlaggedActive).toBe(true);
      expect(info.urgency).toBe("overdue");
      expect(info.daysRemaining).toBeLessThan(0);
      expect(info.badgeLabel).toContain("Pay Overdue");
    });

    it("is not active yet when payment date is far in the future (> flag days)", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const isoDate = future.toISOString().split("T")[0];

      const info = getCustomerPaymentReminderInfo({
        workflow_state: {
          payment_promised_date: isoDate,
          payment_reminder_flag_days: 2,
        },
      });

      expect(info.hasReminder).toBe(true);
      expect(info.isFlaggedActive).toBe(false);
      expect(info.urgency).toBe("upcoming");
      expect(info.badgeLabel).toBe("Pay in 10d");
    });

    it("builds a polite, professional WhatsApp payment request reminder", () => {
      const msg = buildCustomerPaymentReminderWhatsappMessage({
        customerName: "Horizon Towers",
        contactPerson: "Mr. Vikram",
        promisedDate: "2026-10-25",
        promisedAmount: 125000,
        salesperson: "raman",
      });

      expect(msg).toContain("Hi Mr. Vikram,");
      expect(msg).toContain("gentle reminder regarding the payment of ₹1,25,000");
      expect(msg).toContain("Raman Pupneja");
      expect(msg).toContain("Stone Tech");
    });
  });

  describe("Customer Status WhatsApp Notification & Tracking", () => {
    it("builds polite WhatsApp status messages for Installation Team Working", () => {
      const msg = buildCustomerStatusWhatsappMessage({
        customerName: "Sharma Villa",
        contactPerson: "Mr. Sharma",
        status: "installation_team_working",
        salesperson: "rishi",
      });

      expect(msg).toContain("Hi Mr. Sharma,");
      expect(msg).toContain("Installation Team Working");
      expect(msg).toContain("Installation Team is actively working on site");
      expect(msg).toContain("Rishi Rai");
      expect(msg).toContain("Stone Tech · Architectural Stone Atelier");
    });

    it("builds polite WhatsApp status messages for Artwork Team Working", () => {
      const msg = buildCustomerStatusWhatsappMessage({
        customerName: "Lotus Temple Residency",
        contactPerson: "Ananya",
        status: "artwork_team_working",
        salesperson: "raman",
      });

      expect(msg).toContain("Hi Ananya,");
      expect(msg).toContain("Artwork Team Working");
      expect(msg).toContain("Artwork & Stone Fabrication Team is actively carving");
      expect(msg).toContain("Raman Pupneja");
    });

    it("builds polite WhatsApp status messages for Order Placed", () => {
      const msg = buildCustomerStatusWhatsappMessage({
        customerName: "Grand Vista",
        status: "order_placed",
      });

      expect(msg).toContain("Order Placed");
      expect(msg).toContain("Thank you for confirming your order with Stone Tech");
      expect(msg).toContain("Warm regards");
    });

    it("identifies when customer is NOT updated with the current status", () => {
      const customer = {
        is_active: true,
        workflow_state: {
          response_status: "installation_team_working" as const,
          status_whatsapp_sent: false,
          status_whatsapp_status_key: null,
        },
      };

      const info = getCustomerStatusNotificationInfo(customer);
      expect(info.isNotified).toBe(false);
      expect(info.needsNotification).toBe(true);
      expect(info.status).toBe("installation_team_working");
      expect(info.statusLabel).toBe("Installation Team Working");
      expect(info.message).toBe("The customer is not updated with the current status");
    });

    it("identifies when customer IS notified for the current status", () => {
      const customer = {
        is_active: true,
        workflow_state: {
          response_status: "installation_team_working" as const,
          status_whatsapp_sent: true,
          status_whatsapp_status_key: "installation_team_working",
          status_whatsapp_sent_at: "2026-10-30T10:00:00.000Z",
        },
      };

      const info = getCustomerStatusNotificationInfo(customer);
      expect(info.isNotified).toBe(true);
      expect(info.needsNotification).toBe(false);
      expect(info.sentAt).toBe("2026-10-30T10:00:00.000Z");
      expect(info.sentStatusKey).toBe("installation_team_working");
    });

    it("marks customer as needing notification if status changes to another key", () => {
      // Previously sent for order_placed, but now changed to artwork_team_working
      const customer = {
        is_active: true,
        workflow_state: {
          response_status: "artwork_team_working" as const,
          status_whatsapp_sent: true,
          status_whatsapp_status_key: "order_placed", // outdated!
        },
      };

      const info = getCustomerStatusNotificationInfo(customer);
      expect(info.isNotified).toBe(false);
      expect(info.needsNotification).toBe(true);
      expect(info.message).toBe("The customer is not updated with the current status");
    });

    it("does not flag legacy customer with default active status as needing notification", () => {
      const customer = {
        is_active: true,
        workflow_state: {},
      };

      const info = getCustomerStatusNotificationInfo(customer);
      expect(info.needsNotification).toBe(false);
    });
  });
});
