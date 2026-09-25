import { describe, expect, it } from "bun:test";
import {
  calculateHraExemption,
  computeNewRegime,
  computeOldRegime,
  compareTaxRegimes,
  generateSmartAdvisory,
  generateItr1PreFill,
  type TaxDeclarationsInput,
} from "./tax-engine";

describe("tax-engine — Indian Income Tax & Regime Optimizer", () => {
  it("calculates HRA exemption accurately under Section 10(13A)", () => {
    // Basic: 50,000/mo = 6,00,000/yr
    // HRA Received: 20,000/mo = 2,40,000/yr
    // Rent Paid: 25,000/mo
    // 1. Actual HRA = 2,40,000
    // 2. Rent (3,00,000) - 10% Basic (60,000) = 2,40,000
    // 3. 50% Basic (Metro) = 3,00,000
    const metroHra = calculateHraExemption(240_000, 600_000, 25_000, true);
    expect(metroHra).toBe(240_000);

    // Non-metro cap: 40% of 6,00,000 = 2,40,000
    const nonMetroHra = calculateHraExemption(240_000, 600_000, 25_000, false);
    expect(nonMetroHra).toBe(240_000);

    // When rent paid is lower than 10% of basic
    const lowRent = calculateHraExemption(240_000, 600_000, 4_000, true);
    expect(lowRent).toBe(0);
  });

  it("yields zero tax in New Regime for CTC <= 7,75,000 due to Section 87A rebate", () => {
    const input: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 775_000,
      basicAnnual: 310_000,
      hraReceivedAnnual: 120_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 37_200,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const res = computeNewRegime(input);
    expect(res.standardDeduction).toBe(75_000);
    expect(res.taxableIncome).toBe(700_000);
    expect(res.rebate87a).toBe(res.taxBeforeRebate);
    expect(res.totalAnnualTax).toBe(0);
    expect(res.monthlyTds).toBe(0);
  });

  it("calculates New Regime tax correctly for higher incomes (e.g. 15,00,000)", () => {
    const input: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 1_500_000,
      basicAnnual: 600_000,
      hraReceivedAnnual: 240_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 72_000,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const res = computeNewRegime(input);
    expect(res.standardDeduction).toBe(75_000);
    expect(res.taxableIncome).toBe(1_425_000);
    // Slabs:
    // 0-3L: 0
    // 3L-7L (4L @ 5%) = 20,000
    // 7L-10L (3L @ 10%) = 30,000
    // 10L-12L (2L @ 15%) = 30,000
    // 12L-14.25L (2.25L @ 20%) = 45,000
    // Total before cess = 1,25,000 + 4% cess = 1,30,000
    expect(res.taxBeforeRebate).toBe(125_000);
    expect(res.totalAnnualTax).toBe(130_000);
    expect(res.monthlyTds).toBe(Math.round(130_000 / 12));
  });

  it("correctly allows Section 80CCD(2) Corporate NPS in the New Regime", () => {
    const input: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 1_500_000,
      basicAnnual: 600_000,
      hraReceivedAnnual: 240_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 72_000,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 10, // 10% of 6,00,000 = 60,000
      otherDeductions: 0,
    };

    const res = computeNewRegime(input);
    expect(res.section80ccd2EmployerNps).toBe(60_000);
    expect(res.taxableIncome).toBe(1_500_000 - 75_000 - 60_000); // 1,365,000
    // Taxable dropped by 60,000 in 20% slab -> saves 12,000 + 480 cess = 12,480
    expect(res.totalAnnualTax).toBe(130_000 - 12_480);
  });

  it("calculates Old Regime tax with 80C, 80D, 24(b) home loan and HRA", () => {
    const input: TaxDeclarationsInput = {
      regime: "old",
      annualCtc: 1_500_000,
      basicAnnual: 600_000,
      hraReceivedAnnual: 240_000,
      rentPaidMonthly: 25_000,
      isMetroCity: true,
      epfAnnual: 72_000,
      additional80c: 100_000, // Total 80C = 1,72,000 -> capped at 1,50,000
      healthInsuranceSelf80d: 25_000,
      healthInsuranceParents80d: 30_000,
      homeLoanInterest24b: 150_000,
      voluntaryNps80ccd1b: 50_000,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const res = computeOldRegime(input);
    expect(res.standardDeduction).toBe(50_000);
    expect(res.hraExemption).toBe(240_000);
    expect(res.section80c).toBe(150_000);
    expect(res.section80d).toBe(55_000);
    expect(res.section24b).toBe(150_000);
    expect(res.section80ccd1b).toBe(50_000);

    const expectedDeductions = 50_000 + 240_000 + 150_000 + 55_000 + 150_000 + 50_000;
    expect(res.totalExemptionsAndDeductions).toBe(expectedDeductions); // 695,000
    expect(res.taxableIncome).toBe(1_500_000 - 695_000); // 805,000
  });

  it("compares regimes side-by-side and selects the best regime with accurate savings", () => {
    // For an employee with minimal deductions (e.g. only standard deduction)
    const lowDeductionInput: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 1_200_000,
      basicAnnual: 480_000,
      hraReceivedAnnual: 180_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 21_600,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const comp = compareTaxRegimes(lowDeductionInput);
    expect(comp.recommendedRegime).toBe("new");
    expect(comp.annualSavings).toBeGreaterThan(0);
    expect(comp.verdictSummary).toContain("New Regime saves you");
  });

  it("generates smart advisory for Corporate NPS, EPF, and TDS", () => {
    const input: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 1_800_000,
      basicAnnual: 720_000,
      hraReceivedAnnual: 280_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 86_400,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const adv = generateSmartAdvisory(input, 10);
    expect(adv.corporateNps.isRecommended).toBe(true);
    expect(adv.corporateNps.maxEligibleAnnual).toBe(72_000);
    expect(adv.corporateNps.newRegimeTaxSavings).toBeGreaterThan(0);
    expect(adv.tds.remainingMonths).toBe(10);
  });

  it("generates valid ITR-1 pre-fill structure matching Income Tax Department format", () => {
    const input: TaxDeclarationsInput = {
      regime: "new",
      annualCtc: 1_000_000,
      basicAnnual: 400_000,
      hraReceivedAnnual: 160_000,
      rentPaidMonthly: 0,
      isMetroCity: true,
      epfAnnual: 48_000,
      additional80c: 0,
      healthInsuranceSelf80d: 0,
      healthInsuranceParents80d: 0,
      homeLoanInterest24b: 0,
      voluntaryNps80ccd1b: 0,
      employerNps80ccd2Percent: 0,
      otherDeductions: 0,
    };

    const json = generateItr1PreFill(input, "Rajesh Sharma", "ABCDE1234F");
    expect(json.regimeOpted).toBe("new");
    expect(json.salaryBreakup.grossSalary).toBe(1_000_000);
    expect(json.salaryBreakup.standardDeduction).toBe(75_000);
    expect(json.source).toBe("Stone Tech OS HRMS & Payroll Engine");
  });
});
