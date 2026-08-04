/**
 * Payroll engine tests — statutory maths must be provable, not eyeballed.
 */
import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PAYROLL_SETTINGS,
  buildStructureFromCtc,
  computeAnnualTax,
  computeEsi,
  computeMonthlyTds,
  computePayslip,
  computePf,
  computeProfessionalTax,
  daysInMonth,
  grossFromLines,
  overtimeHourlyRate,
  payableDays,
  periodLabel,
  remainingFyMonths,
  summarizeRun,
  type SalaryComponentDef,
  type StructureLine,
} from "@/lib/hr/payroll-engine";

const S = DEFAULT_PAYROLL_SETTINGS;

const COMPONENTS: SalaryComponentDef[] = [
  {
    name: "Basic",
    kind: "earning",
    calc_type: "percent_of_ctc",
    value: 40,
    is_taxable: true,
    pf_applicable: true,
    esi_applicable: true,
    sort_order: 1,
  },
  {
    name: "HRA",
    kind: "earning",
    calc_type: "percent_of_basic",
    value: 50,
    is_taxable: true,
    pf_applicable: false,
    esi_applicable: true,
    sort_order: 2,
  },
  {
    name: "Special allowance",
    kind: "earning",
    calc_type: "balance",
    value: 0,
    is_taxable: true,
    pf_applicable: false,
    esi_applicable: true,
    sort_order: 3,
  },
];

describe("salary structure", () => {
  it("expands a CTC and reconciles the balance component", () => {
    const lines = buildStructureFromCtc(600_000, COMPONENTS);
    const [basic, hra, special] = lines;
    expect(basic!.monthly_amount).toBe(20_000);
    expect(hra!.monthly_amount).toBe(10_000);
    expect(special!.monthly_amount).toBe(20_000);
    expect(grossFromLines(lines)).toBe(50_000);
  });

  it("never produces a negative balance component", () => {
    const lines = buildStructureFromCtc(
      120_000,
      COMPONENTS.map((c) => (c.name === "HRA" ? { ...c, calc_type: "fixed" as const, value: 90_000 } : c)),
    );
    expect(lines[2]!.monthly_amount).toBe(0);
  });
});

describe("statutory", () => {
  it("caps PF at the wage ceiling", () => {
    expect(computePf(50_000, S)).toEqual({ employee: 1800, employer: 1800 });
    expect(computePf(10_000, S)).toEqual({ employee: 1200, employer: 1200 });
  });

  it("computes PF on full wages when the ceiling is disabled", () => {
    expect(computePf(50_000, { ...S, pf_limit_to_ceiling: false }).employee).toBe(6000);
  });

  it("applies ESI only within the ceiling", () => {
    expect(computeEsi(20_000, S)).toEqual({ employee: 150, employer: 650 });
    expect(computeEsi(25_000, S)).toEqual({ employee: 0, employer: 0 });
  });

  it("reads professional tax from the slab table", () => {
    expect(computeProfessionalTax(7000, S.pt_slabs)).toBe(0);
    expect(computeProfessionalTax(9000, S.pt_slabs)).toBe(175);
    expect(computeProfessionalTax(50_000, S.pt_slabs)).toBe(200);
  });

  it("gives a nil tax below the 87A rebate limit", () => {
    expect(computeAnnualTax(1_200_000)).toBe(0);
  });

  it("taxes slab by slab above the rebate limit", () => {
    // 4-8L @5% = 20,000; 8-12L @10% = 40,000; 12-13L @15% = 15,000 → 75,000 + 4% cess
    expect(computeAnnualTax(1_300_000)).toBe(78_000);
  });

  it("spreads TDS across the remaining months", () => {
    const annual = computeAnnualTax(1_800_000 - S.standard_deduction);
    expect(computeMonthlyTds(1_800_000, S, 12)).toBe(Math.round(annual / 12));
    expect(computeMonthlyTds(1_800_000, S, 6)).toBe(Math.round(annual / 6));
    expect(computeMonthlyTds(1_800_000, { ...S, tds_enabled: false })).toBe(0);
  });
});

describe("attendance interaction", () => {
  it("reduces payable days by loss of pay", () => {
    expect(payableDays(31, 3)).toBe(28);
    expect(payableDays(31, 40)).toBe(0);
  });

  it("uses the 26-day convention for overtime", () => {
    expect(Math.round(overtimeHourlyRate(26_000, 1.5))).toBe(188);
  });
});

const LINES: StructureLine[] = buildStructureFromCtc(600_000, COMPONENTS).map((l) => ({ ...l }));

describe("payslip", () => {
  it("computes a full-attendance payslip", () => {
    const p = computePayslip({
      employeeId: "e1",
      lines: LINES,
      calendarDays: 30,
      lopDays: 0,
      settings: S,
    });
    expect(p.grossEarnings).toBe(50_000);
    expect(p.pfEmployee).toBe(1800);
    expect(p.esiEmployee).toBe(0); // gross above the ESI ceiling
    expect(p.professionalTax).toBe(200);
    expect(p.netPay).toBe(p.grossEarnings - p.totalDeductions);
    expect(p.employerCost).toBe(p.grossEarnings + p.pfEmployer);
  });

  it("prorates earnings for loss of pay", () => {
    const p = computePayslip({
      employeeId: "e1",
      lines: LINES,
      calendarDays: 30,
      lopDays: 3,
      settings: S,
    });
    expect(p.payableDays).toBe(27);
    expect(p.grossEarnings).toBe(45_000);
  });

  it("adds overtime and reimbursements, and subtracts loan installments", () => {
    const p = computePayslip({
      employeeId: "e1",
      lines: LINES,
      calendarDays: 30,
      lopDays: 0,
      overtimeHours: 10,
      loanInstallment: 2000,
      reimbursements: 1500,
      settings: S,
    });
    expect(p.overtimeAmount).toBeGreaterThan(0);
    expect(p.loanDeduction).toBe(2000);
    expect(p.reimbursements).toBe(1500);
    expect(p.netPay).toBe(p.grossEarnings + 1500 - p.totalDeductions);
  });

  it("pays nothing when the whole month is loss of pay", () => {
    const p = computePayslip({
      employeeId: "e1",
      lines: LINES,
      calendarDays: 30,
      lopDays: 30,
      settings: S,
    });
    expect(p.grossEarnings).toBe(0);
    expect(p.netPay).toBe(0);
  });

  it("summarizes a run", () => {
    const slip = computePayslip({
      employeeId: "e1",
      lines: LINES,
      calendarDays: 30,
      lopDays: 0,
      settings: S,
    });
    const totals = summarizeRun([slip, slip]);
    expect(totals.employeeCount).toBe(2);
    expect(totals.totalNet).toBe(slip.netPay * 2);
  });
});

describe("period helpers", () => {
  it("knows month lengths and financial-year position", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(remainingFyMonths(4)).toBe(12);
    expect(remainingFyMonths(3)).toBe(1);
    expect(remainingFyMonths(12)).toBe(4);
    expect(periodLabel(2026, 8)).toBe("August 2026");
  });
});
