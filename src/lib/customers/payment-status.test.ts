import { describe, expect, it } from "bun:test";
import {
  extractCustomerSerialNumber,
  getCustomerPaymentStatus,
  getCustomerDirectoryRank,
  compareCustomersForDirectory,
  CUSTOMER_PAYMENT_STATUS_CONFIG,
} from "./payment-status";
import type { CustomerRow } from "./api";

describe("extractCustomerSerialNumber", () => {
  it("extracts serial numbers correctly from formatted customer codes", () => {
    expect(extractCustomerSerialNumber("CUS-000035")).toBe(35);
    expect(extractCustomerSerialNumber("CUS-000024")).toBe(24);
    expect(extractCustomerSerialNumber("CUST-9243-2611")).toBe(2611);
    expect(extractCustomerSerialNumber("CUS-1")).toBe(1);
  });

  it("returns null for missing, null, or empty customer codes", () => {
    expect(extractCustomerSerialNumber(null)).toBeNull();
    expect(extractCustomerSerialNumber(undefined)).toBeNull();
    expect(extractCustomerSerialNumber("")).toBeNull();
    expect(extractCustomerSerialNumber("NO_DIGITS_HERE")).toBeNull();
  });
});

describe("getCustomerPaymentStatus", () => {
  it("returns 'no_dues' for new customers without transactions or explicit status", () => {
    const customer = {
      workflow_state: {},
      external_ref: {},
    };
    expect(getCustomerPaymentStatus(customer)).toBe("no_dues");
    expect(getCustomerPaymentStatus(null)).toBe("no_dues");
  });

  it("returns explicit status when assigned in workflow_state or external_ref", () => {
    expect(
      getCustomerPaymentStatus({
        workflow_state: { payment_status: "part_payment_received" },
      }),
    ).toBe("part_payment_received");

    expect(
      getCustomerPaymentStatus({
        external_ref: { payment_status: "payment_pending" },
      }),
    ).toBe("payment_pending");
  });

  it("derives status correctly from ledger summaries", () => {
    const customer = { workflow_state: {}, external_ref: {} };

    // Debit with 0 credit -> payment_pending
    expect(
      getCustomerPaymentStatus(customer, {
        totalDebit: 10000,
        totalCredit: 0,
        balance: 10000,
        entryCount: 1,
        lastEntryAt: null,
      }),
    ).toBe("payment_pending");

    // Partial credit -> part_payment_received
    expect(
      getCustomerPaymentStatus(customer, {
        totalDebit: 10000,
        totalCredit: 4000,
        balance: 6000,
        entryCount: 2,
        lastEntryAt: null,
      }),
    ).toBe("part_payment_received");

    // Full credit -> full_payment_received
    expect(
      getCustomerPaymentStatus(customer, {
        totalDebit: 10000,
        totalCredit: 10000,
        balance: 0,
        entryCount: 2,
        lastEntryAt: null,
      }),
    ).toBe("full_payment_received");

    // Zero debit and zero credit -> no_dues
    expect(
      getCustomerPaymentStatus(customer, {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
        entryCount: 0,
        lastEntryAt: null,
      }),
    ).toBe("no_dues");
  });

  it("has config for no_dues status", () => {
    expect(CUSTOMER_PAYMENT_STATUS_CONFIG.no_dues).toBeDefined();
    expect(CUSTOMER_PAYMENT_STATUS_CONFIG.no_dues.value).toBe("no_dues");
  });

  it("verifies MATERIAL_OPTIONS contains the complete 30-product range including marble, granite, waterfall, fountain, artwork", async () => {
    const { MATERIAL_OPTIONS } = await import("./schema");
    expect(MATERIAL_OPTIONS.length).toBe(30);
    const keys = MATERIAL_OPTIONS.map((m) => m.value);
    expect(keys).toContain("italian_marble_slabs");
    expect(keys).toContain("indian_marble_slabs");
    expect(keys).toContain("granite_slabs");
    expect(keys).toContain("limestone_slabs");
    expect(keys).toContain("cobblestone");
    expect(keys).toContain("pebblestone");
    expect(keys).toContain("boulders");
    expect(keys).toContain("sculptures");
    expect(keys).toContain("artwork");
    expect(keys).toContain("custom_stone_basins");
    expect(keys).toContain("waterfall");
    expect(keys).toContain("fountain");
    expect(keys).toContain("temple_work_handcrafting");
    expect(keys).toContain("stone_veneer");
    expect(keys).toContain("clay_veneers");
  });
});

describe("Customer directory sorting and 4-Tier ranking", () => {
  it("determines directory rank correctly for all tiers", () => {
    // Tier 1: Order Placed / Pending
    expect(
      getCustomerDirectoryRank({
        workflow_state: { response_status: "order_placed" },
      }),
    ).toBe(1);

    // Tier 2: Order Completed AND Payment Pending (explicit or positive ledger balance)
    expect(
      getCustomerDirectoryRank(
        {
          workflow_state: { response_status: "order_completed", payment_status: "payment_pending" },
        },
        null,
      ),
    ).toBe(2);

    expect(
      getCustomerDirectoryRank(
        {
          workflow_state: { response_status: "order_completed" },
        },
        {
          orderInfo: { health: "completed" },
          ledgerSummary: {
            totalDebit: 50000,
            totalCredit: 20000,
            balance: 30000,
            entryCount: 2,
            lastEntryAt: null,
          },
        },
      ),
    ).toBe(2);

    // Tier 3: Newly entered or active leads without completed order + pending payment
    expect(
      getCustomerDirectoryRank({
        workflow_state: { response_status: "active_responsive" },
      }),
    ).toBe(3);

    // Tier 10: Order is completed AND fully paid (put back to the list by customer number)
    expect(
      getCustomerDirectoryRank({
        workflow_state: {
          response_status: "order_completed",
          payment_status: "full_payment_received",
        },
      }),
    ).toBe(10);

    expect(
      getCustomerDirectoryRank(
        {
          workflow_state: { response_status: "order_completed" },
        },
        {
          orderInfo: { health: "completed" },
          ledgerSummary: {
            totalDebit: 50000,
            totalCredit: 50000,
            balance: 0,
            entryCount: 2,
            lastEntryAt: null,
          },
        },
      ),
    ).toBe(10);

    // Tier 99: Closed · Not Interested or Cancelled Orders without dues
    expect(
      getCustomerDirectoryRank({
        workflow_state: { response_status: "do_not_contact" },
      }),
    ).toBe(99);

    expect(
      getCustomerDirectoryRank({
        workflow_state: { response_status: "order_cancelled_delay" },
      }),
    ).toBe(99);

    expect(
      getCustomerDirectoryRank({
        workflow_state: { response_status: "order_cancelled_change_of_plans" },
      }),
    ).toBe(99);

    // Cancelled order with pending payment -> Tier 2 (needs payment follow-up / settlement)
    expect(
      getCustomerDirectoryRank(
        {
          workflow_state: {
            response_status: "order_cancelled_delay",
            payment_status: "payment_pending",
          },
        },
        null,
      ),
    ).toBe(2);
  });

  it("sorts customers across tiers and places completed & fully paid customers back in the list by customer number", () => {
    const customers: Partial<CustomerRow>[] = [
      // Tier 99: Closed · Not Interested (should be at the very bottom)
      {
        id: "closed-27",
        customer_code: "CUS-000027",
        workflow_state: { response_status: "do_not_contact" },
      },
      // Tier 3: newly entered / active leads
      {
        id: "new-50",
        customer_code: "CUS-000050",
        workflow_state: { response_status: "active_responsive" },
        created_at: "2026-10-10T10:00:00Z",
      },
      {
        id: "new-49",
        customer_code: "CUS-000049",
        workflow_state: { response_status: "followup_pending" },
        created_at: "2026-10-09T10:00:00Z",
      },
      // Tier 1: Order Placed / Pending
      {
        id: "placed-41",
        customer_code: "CUS-000041",
        workflow_state: { response_status: "order_placed" },
      },
      {
        id: "placed-45",
        customer_code: "CUS-000045",
        workflow_state: { response_status: "order_placed" },
      },
      // Tier 2: Order Completed AND Payment Pending
      {
        id: "completed-38",
        customer_code: "CUS-000038",
        workflow_state: { response_status: "order_completed", payment_status: "payment_pending" },
      },
      {
        id: "completed-42",
        customer_code: "CUS-000042",
        workflow_state: {
          response_status: "order_completed",
          payment_status: "part_payment_received",
        },
      },
      // Tier 10: Order is Completed AND Fully Paid (put back to the list by customer number)
      {
        id: "completed-paid-37",
        customer_code: "CUS-000037",
        workflow_state: {
          response_status: "order_completed",
          payment_status: "full_payment_received",
        },
      },
      {
        id: "completed-paid-26",
        customer_code: "CUS-000026",
        workflow_state: {
          response_status: "order_completed",
          payment_status: "full_payment_received",
        },
      },
    ];

    const sorted = [...customers].sort((a, b) =>
      compareCustomersForDirectory(a as CustomerRow, b as CustomerRow),
    );

    // Expected order:
    // Tier 1 (Order Placed / Pending): 45, 41
    // Tier 2 (Order Completed + Payment Pending): 42, 38
    // Tier 3 (Recently Entered Leads / Active Inquiries): 50, 49
    // Tier 10 (Order Completed & Fully Paid, sorted back in list by customer number): 37, 26
    // Tier 99 (Closed · Not Interested pushed to last): 27
    expect(sorted.map((c) => c.customer_code)).toEqual([
      "CUS-000045", // Tier 1 (serial 45)
      "CUS-000041", // Tier 1 (serial 41)
      "CUS-000042", // Tier 2 (serial 42)
      "CUS-000038", // Tier 2 (serial 38)
      "CUS-000050", // Tier 3 (serial 50)
      "CUS-000049", // Tier 3 (serial 49)
      "CUS-000037", // Tier 10 (serial 37, completed & fully paid)
      "CUS-000026", // Tier 10 (serial 26, completed & fully paid)
      "CUS-000027", // Tier 99 (serial 27, pushed to very last)
    ]);
  });
});
