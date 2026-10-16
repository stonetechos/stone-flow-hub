import { describe, expect, it } from "bun:test";
import { buildDailyMoneyFlowData, getTodayString, formatDayLabel } from "./daily-money-flow";
import type { PaymentRegisterRow } from "@/lib/payments/crud";
import type { VendorPaymentListItem } from "@/lib/vendor-payments/api";
import type { InstallationLedgerRow } from "@/lib/installation-ledger/api";

describe("daily-money-flow data processor", () => {
  const mockCustomerPayments: PaymentRegisterRow[] = [
    {
      id: "cp-1",
      source: "receipt",
      doc_no: "RCPT-001",
      customer_id: "c-1",
      customer_name: "Jash Vasani",
      invoice_id: "inv-1",
      invoice_no: "INV-001",
      amount: 50000,
      method: "bank_transfer",
      reference_no: "UTR123456",
      notes: "Advance payment",
      paid_at: "2026-10-16T10:00:00Z",
      status: "posted",
      created_at: "2026-10-16T10:00:00Z",
    },
    {
      id: "cp-2",
      source: "receipt",
      doc_no: "RCPT-002",
      customer_id: "c-2",
      customer_name: "Raman Stones",
      invoice_id: null,
      invoice_no: null,
      amount: 25000,
      method: "upi",
      reference_no: "UPI98765",
      notes: "Part payment",
      paid_at: "2026-10-15T15:30:00Z",
      status: "posted",
      created_at: "2026-10-15T15:30:00Z",
    },
  ];

  const mockVendorPayments: VendorPaymentListItem[] = [
    {
      id: "vp-1",
      payment_no: "VPAY-001",
      vendor_id: "v-1",
      purchase_order_id: null,
      grn_id: null,
      project_id: null,
      payment_type: "part",
      amount: 15000,
      currency_code: "INR",
      method: "bank_transfer",
      reference_no: "NEFT45678",
      paid_at: "2026-10-16",
      notes: "Quarry block advance",
      created_at: "2026-10-16T11:00:00Z",
      vendor: { id: "v-1", company_name: "KK Stones" },
      purchase_order: null,
    },
    {
      id: "vp-2",
      payment_no: "VPAY-002",
      vendor_id: "v-2",
      purchase_order_id: null,
      grn_id: null,
      project_id: null,
      payment_type: "full",
      amount: 10000,
      currency_code: "INR",
      method: "cheque",
      reference_no: "CHQ00123",
      paid_at: "2026-10-15",
      notes: "Slate tiles settlement",
      created_at: "2026-10-15T14:00:00Z",
      vendor: { id: "v-2", company_name: "Vardhman Slate" },
      purchase_order: null,
    },
  ];

  const mockAgencyLedger: InstallationLedgerRow[] = [
    {
      id: "al-1",
      installation_agency_id: "a-1",
      entry_date: "2026-10-16",
      description: "Payment for dry cladding site 4 via UPI",
      ref_no: "AGY-DISB-01",
      debit: 0,
      credit: 5000,
      notes: null,
      created_at: "2026-10-16T12:00:00Z",
      running_balance: -5000,
    },
  ];

  const agencyNames = { "a-1": "Apex Cladding Solutions" };

  it("calculates exact inflow, outflow, and net cash flow for selected date", () => {
    const summary = buildDailyMoneyFlowData({
      customerPayments: mockCustomerPayments,
      vendorPayments: mockVendorPayments,
      agencyLedger: mockAgencyLedger,
      agencyNames,
      selectedDate: "2026-10-16",
    });

    expect(summary.selectedDate).toBe("2026-10-16");
    // Inflow on 2026-10-16: 50,000 (cp-1)
    expect(summary.totalInflow).toBe(50000);
    expect(summary.inflowCount).toBe(1);

    // Outflow on 2026-10-16: 15,000 (vp-1) + 5,000 (al-1) = 20,000
    expect(summary.totalOutflow).toBe(20000);
    expect(summary.outflowCount).toBe(2);

    // Net on 2026-10-16: 50,000 - 20,000 = +30,000
    expect(summary.netCashFlow).toBe(30000);
    expect(summary.totalCount).toBe(3);

    // Transactions array contains 3 items
    expect(summary.transactions.length).toBe(3);
    const parties = summary.transactions.map((t) => t.partyName);
    expect(parties).toContain("Jash Vasani");
    expect(parties).toContain("KK Stones");
    expect(parties).toContain("Apex Cladding Solutions");
  });

  it("correctly computes yesterday's figures when date is switched", () => {
    const summary = buildDailyMoneyFlowData({
      customerPayments: mockCustomerPayments,
      vendorPayments: mockVendorPayments,
      agencyLedger: mockAgencyLedger,
      agencyNames,
      selectedDate: "2026-10-15",
    });

    // Inflow on 2026-10-15: 25,000 (cp-2)
    expect(summary.totalInflow).toBe(25000);
    expect(summary.inflowCount).toBe(1);

    // Outflow on 2026-10-15: 10,000 (vp-2)
    expect(summary.totalOutflow).toBe(10000);
    expect(summary.outflowCount).toBe(1);

    // Net on 2026-10-15: 25,000 - 10,000 = +15,000
    expect(summary.netCashFlow).toBe(15000);
  });

  it("builds 7-day trend items with proper labels", () => {
    const summary = buildDailyMoneyFlowData({
      customerPayments: mockCustomerPayments,
      vendorPayments: mockVendorPayments,
      agencyLedger: mockAgencyLedger,
      agencyNames,
      selectedDate: "2026-10-16",
      trendDaysCount: 7,
    });

    expect(summary.recentDays.length).toBe(7);
    const lastDay = summary.recentDays[summary.recentDays.length - 1];
    expect(lastDay.isToday).toBe(true);
    expect(lastDay.dayLabel).toBe("Today");
  });

  it("formats day labels correctly for today and yesterday", () => {
    const today = getTodayString();
    expect(formatDayLabel(today, today).label).toBe("Today");
  });
});
