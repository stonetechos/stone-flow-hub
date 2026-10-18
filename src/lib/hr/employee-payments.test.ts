import { describe, expect, it } from "bun:test";
import {
  formatMonthLabel,
  currentMonthStr,
  generateEmployeePaymentWhatsAppMessage,
  EMPLOYEE_PAYMENT_METHODS,
  EMPLOYEE_PAYMENT_TYPES,
} from "./employee-payments";

describe("employee-payments helper utilities", () => {
  it("formats month string correctly", () => {
    expect(formatMonthLabel("2026-10")).toBe("October 2026");
    expect(formatMonthLabel("2026-01")).toBe("January 2026");
    expect(formatMonthLabel("2026-12")).toBe("December 2026");
  });

  it("returns a valid currentMonthStr in YYYY-MM format", () => {
    const cur = currentMonthStr();
    expect(cur).toMatch(/^\d{4}-\d{2}$/);
  });

  it("has valid payment methods including BOB and personal UPIs", () => {
    const methodIds = EMPLOYEE_PAYMENT_METHODS.map((m) => m.id);
    expect(methodIds).toContain("bank_transfer");
    expect(methodIds).toContain("upi_personal_rishi");
    expect(methodIds).toContain("upi_personal_raman");
    expect(methodIds).toContain("cash");
  });

  it("has valid payment types with default deduction flags", () => {
    const advance = EMPLOYEE_PAYMENT_TYPES.find((t) => t.id === "advance");
    expect(advance?.defaultDeduct).toBe(true);

    const incentive = EMPLOYEE_PAYMENT_TYPES.find((t) => t.id === "incentive");
    expect(incentive?.defaultDeduct).toBe(false);
  });

  it("generates structured WhatsApp message voucher", () => {
    const msg = generateEmployeePaymentWhatsAppMessage({
      employeeName: "Rajesh Sharma",
      amount: 5000,
      paymentType: "advance",
      paymentMethod: "UPI Personal - Rishi",
      paymentDate: "2026-10-18",
      referenceNo: "UPI/12345678",
      payrollMonth: "2026-10",
      totalPaidThisMonth: 5000,
      remainingSalaryDue: 15000,
      notes: "Diwali advance",
    });

    expect(msg).toContain("STONE TECH — PAYMENT VOUCHER");
    expect(msg).toContain("Rajesh Sharma");
    expect(msg).toContain("₹5,000");
    expect(msg).toContain("UPI Personal - Rishi");
    expect(msg).toContain("Remaining Salary to be Paid after Month Ends: *₹15,000*");
    expect(msg).toContain("Diwali advance");
  });
});
