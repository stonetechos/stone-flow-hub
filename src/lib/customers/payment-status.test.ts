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
        customerId: "c1",
        customerName: "Test",
        totalDebit: 10000,
        totalCredit: 0,
        balance: 10000,
        entryCount: 1,
        lastTransactionAt: null,
      }),
    ).toBe("payment_pending");

    // Partial credit -> part_payment_received
    expect(
      getCustomerPaymentStatus(customer, {
        customerId: "c1",
        customerName: "Test",
        totalDebit: 10000,
        totalCredit: 4000,
        balance: 6000,
        entryCount: 2,
        lastTransactionAt: null,
      }),
    ).toBe("part_payment_received");

    // Full credit -> full_payment_received
    expect(
      getCustomerPaymentStatus(customer, {
        customerId: "c1",
        customerName: "Test",
        totalDebit: 10000,
        totalCredit: 10000,
        balance: 0,
        entryCount: 2,
        lastTransactionAt: null,
      }),
    ).toBe("full_payment_received");

    // Zero debit and zero credit -> no_dues
    expect(
      getCustomerPaymentStatus(customer, {
        customerId: "c1",
        customerName: "Test",
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
        entryCount: 0,
        lastTransactionAt: null,
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
