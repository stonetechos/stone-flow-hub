import { describe, expect, it } from "bun:test";
import {
  compareCustomerLedgerRows,
  compareVendorLedgerRows,
  compareAgencyLedgerRows,
  type CustomerLedgerSortable,
  type VendorLedgerSortable,
  type AgencyLedgerSortable,
} from "./ledger-sorting";

describe("compareCustomerLedgerRows", () => {
  it("prioritizes customers with invoiced or collected > 0 over customers with zero activity", () => {
    const list: CustomerLedgerSortable[] = [
      {
        customer: { name: "Zero Activity Alpha", customer_code: "CUST-001" },
        summary: { totalDebit: 0, totalCredit: 0, balance: 0 },
      },
      {
        customer: { name: "Active Customer Invoiced Only", customer_code: "CUST-002" },
        summary: { totalDebit: 50000, totalCredit: 0, balance: 50000 },
      },
      {
        customer: { name: "Zero Activity Beta (No Summary)", customer_code: "CUST-003" },
        summary: null,
      },
      {
        customer: { name: "Active Customer Collected Only (Advance)", customer_code: "CUST-004" },
        summary: { totalDebit: 0, totalCredit: 25000, balance: -25000 },
      },
      {
        customer: { name: "Active Customer Fully Settled", customer_code: "CUST-005" },
        summary: { totalDebit: 100000, totalCredit: 100000, balance: 0 },
      },
    ];

    const sorted = [...list].sort(compareCustomerLedgerRows);

    // Active customers must be at the top
    expect(sorted[0].customer.name).toBe("Active Customer Invoiced Only"); // positive balance 50,000
    expect(sorted[1].customer.name).toBe("Active Customer Fully Settled"); // balance 0, but active (volume 200,000)
    expect(sorted[2].customer.name).toBe("Active Customer Collected Only (Advance)"); // advance balance -25,000, active
    // Zero activity customers must be moved down
    expect(sorted[3].customer.name).toBe("Zero Activity Alpha");
    expect(sorted[4].customer.name).toBe("Zero Activity Beta (No Summary)");
  });

  it("sorts active customers by balance due descending, then by volume", () => {
    const list: CustomerLedgerSortable[] = [
      {
        customer: { name: "Customer Small Due", customer_code: "CUST-10" },
        summary: { totalDebit: 60000, totalCredit: 40000, balance: 20000 },
      },
      {
        customer: { name: "Customer Big Due", customer_code: "CUST-20" },
        summary: { totalDebit: 300000, totalCredit: 100000, balance: 200000 },
      },
      {
        customer: { name: "Customer Settled High Volume", customer_code: "CUST-30" },
        summary: { totalDebit: 500000, totalCredit: 500000, balance: 0 },
      },
      {
        customer: { name: "Customer Settled Low Volume", customer_code: "CUST-40" },
        summary: { totalDebit: 10000, totalCredit: 10000, balance: 0 },
      },
    ];

    const sorted = [...list].sort(compareCustomerLedgerRows);

    expect(sorted.map((r) => r.customer.name)).toEqual([
      "Customer Big Due", // balance: 200,000
      "Customer Small Due", // balance: 20,000
      "Customer Settled High Volume", // balance: 0, volume: 1,000,000
      "Customer Settled Low Volume", // balance: 0, volume: 20,000
    ]);
  });
});

describe("compareVendorLedgerRows", () => {
  it("moves zero activity vendors to the bottom and active vendors to the top", () => {
    const list: VendorLedgerSortable[] = [
      {
        vendor: { company_name: "Inactive Granite Quarry", vendor_code: "VEN-001" },
        summary: { totalDebit: 0, totalCredit: 0, outstanding: 0 },
      },
      {
        vendor: { company_name: "Active Marble Supplier", vendor_code: "VEN-002" },
        summary: { totalDebit: 150000, totalCredit: 50000, outstanding: 100000 },
      },
      {
        vendor: { company_name: "Unused Vendor (null summary)", vendor_code: "VEN-003" },
        summary: null,
      },
      {
        vendor: { company_name: "Settled Transport Supplier", vendor_code: "VEN-004" },
        summary: { totalDebit: 80000, totalCredit: 80000, outstanding: 0 },
      },
    ];

    const sorted = [...list].sort(compareVendorLedgerRows);

    expect(sorted[0].vendor.company_name).toBe("Active Marble Supplier");
    expect(sorted[1].vendor.company_name).toBe("Settled Transport Supplier");
    expect(sorted[2].vendor.company_name).toBe("Inactive Granite Quarry");
    expect(sorted[3].vendor.company_name).toBe("Unused Vendor (null summary)");
  });
});

describe("compareAgencyLedgerRows", () => {
  it("moves zero charged/paid agencies to the bottom and active agencies to the top", () => {
    const list: AgencyLedgerSortable[] = [
      {
        agency_name: "New Carting Agency",
        agency_code: "AGT-001",
        total_debit: 0,
        total_credit: 0,
        balance: 0,
      },
      {
        agency_name: "Active Installation Team",
        agency_code: "AGT-002",
        total_debit: 45000,
        total_credit: 15000,
        balance: 30000,
      },
      {
        agency_name: "Empty Agency",
        agency_code: "AGT-003",
        total_debit: 0,
        total_credit: 0,
        balance: 0,
      },
      {
        agency_name: "Fully Paid Agency",
        agency_code: "AGT-004",
        total_debit: 20000,
        total_credit: 20000,
        balance: 0,
      },
    ];

    const sorted = [...list].sort(compareAgencyLedgerRows);

    expect(sorted[0].agency_name).toBe("Active Installation Team");
    expect(sorted[1].agency_name).toBe("Fully Paid Agency");
    expect(sorted[2].agency_name).toBe("Empty Agency");
    expect(sorted[3].agency_name).toBe("New Carting Agency");
  });
});
