import { describe, expect, it } from "bun:test";
import {
  extractCustomerSerialNumber,
  getCustomerPaymentStatus,
  CUSTOMER_PAYMENT_STATUS_CONFIG,
} from "./payment-status";

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

  it("verifies MATERIAL_OPTIONS contains the complete 29-product range including marble, granite, waterfall, fountain", async () => {
    const { MATERIAL_OPTIONS } = await import("./schema");
    expect(MATERIAL_OPTIONS.length).toBe(29);
    const keys = MATERIAL_OPTIONS.map((m) => m.value);
    expect(keys).toContain("italian_marble_slabs");
    expect(keys).toContain("indian_marble_slabs");
    expect(keys).toContain("granite_slabs");
    expect(keys).toContain("limestone_slabs");
    expect(keys).toContain("cobblestone");
    expect(keys).toContain("pebblestone");
    expect(keys).toContain("boulders");
    expect(keys).toContain("sculptures");
    expect(keys).toContain("custom_stone_basins");
    expect(keys).toContain("waterfall");
    expect(keys).toContain("fountain");
    expect(keys).toContain("temple_work_handcrafting");
    expect(keys).toContain("stone_veneer");
    expect(keys).toContain("clay_veneers");
  });
});

describe("Customer directory sorting and OG serial ordering", () => {
  it("prioritizes customers with order_placed response status at the top sorted by OG numbers descending", () => {
    const customers = [
      {
        id: "1",
        customer_code: "CUS-000001",
        workflow_state: { response_status: "order_completed" },
      },
      {
        id: "23",
        customer_code: "CUS-000023",
        workflow_state: { response_status: "order_placed" },
      },
      {
        id: "39",
        customer_code: "CUS-000039",
        workflow_state: { response_status: "active_responsive" },
      },
      {
        id: "40",
        customer_code: "CUS-000040",
        workflow_state: { response_status: "order_placed" },
      },
      {
        id: "41",
        customer_code: "CUS-000041",
        workflow_state: { response_status: "order_placed" },
      },
    ];

    const sorted = [...customers].sort((a, b) => {
      const isOrderPlacedA = a.workflow_state.response_status === "order_placed";
      const isOrderPlacedB = b.workflow_state.response_status === "order_placed";

      if (isOrderPlacedA && !isOrderPlacedB) return -1;
      if (!isOrderPlacedA && isOrderPlacedB) return 1;

      const serialA = extractCustomerSerialNumber(a.customer_code);
      const serialB = extractCustomerSerialNumber(b.customer_code);

      if (serialA !== null && serialB !== null && serialA !== serialB) {
        return serialB - serialA;
      }
      return 0;
    });

    // Top rows MUST be order_placed, sorted by OG serial number descending
    expect(sorted.map((c) => c.customer_code)).toEqual([
      "CUS-000041", // order_placed (serial 41)
      "CUS-000040", // order_placed (serial 40)
      "CUS-000023", // order_placed (serial 23)
      "CUS-000039", // active_responsive (serial 39)
      "CUS-000001", // order_completed (serial 1)
    ]);
  });
});
