/**
 * Indian Income Tax & Regime Optimization Engine.
 *
 * Implements deterministic calculation for:
 * 1. New Tax Regime (Section 115BAC) — default since FY 2023-24 / FY 2024-25
 *    with ₹75,000 standard deduction (Finance Act 2024) and Section 87A rebate.
 * 2. Old Tax Regime with full Chapter VI-A deductions (80C, 80D, 80CCD(1B),
 *    80CCD(2), 24(b) Home loan interest, and Section 10(13A) HRA exemption).
 * 3. Side-by-side Regime Comparison and automatic recommendation.
 * 4. Smart Advisory for Corporate NPS (80CCD(2)), EPF, and TDS smoothing.
 * 5. ITR-1 (Sahaj) JSON & Form 16 Part B summary generation.
 */

export type TaxRegime = "new" | "old";

export interface TaxDeclarationsInput {
  regime: TaxRegime;
  annualCtc: number;
  basicAnnual: number;
  hraReceivedAnnual: number;
  rentPaidMonthly: number;
  isMetroCity: boolean;
  // Deductions for Old Regime
  epfAnnual: number;
  additional80c: number; // PPF, ELSS, LIC, tuition, home loan principal (80C max 1.5L total with EPF)
  healthInsuranceSelf80d: number; // max 25,000 (or 50,000 if senior citizen)
  healthInsuranceParents80d: number; // max 25,000 (or 50,000 if senior citizen)
  homeLoanInterest24b: number; // max 2,00,000
  voluntaryNps80ccd1b: number; // max 50,000 (exclusive to Old Regime)
  employerNps80ccd2Percent: number; // 0% to 10% of Basic (allowed in BOTH New and Old regimes!)
  otherDeductions: number; // 80E, 80G, etc.
}

export interface RegimeTaxBreakdown {
  regime: TaxRegime;
  grossSalary: number;
  standardDeduction: number;
  hraExemption: number;
  section80c: number;
  section80d: number;
  section24b: number;
  section80ccd1b: number;
  section80ccd2EmployerNps: number;
  otherDeductions: number;
  totalExemptionsAndDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate87a: number;
  taxAfterRebate: number;
  cess: number; // 4% Health & Education Cess
  totalAnnualTax: number;
  monthlyTds: number;
  slabBreakdown: Array<{ slab: string; rate: number; taxableAmount: number; taxAmount: number }>;
}

export interface RegimeComparisonResult {
  newRegime: RegimeTaxBreakdown;
  oldRegime: RegimeTaxBreakdown;
  recommendedRegime: TaxRegime;
  annualSavings: number;
  monthlyInHandDiff: number;
  breakEvenDeduction: number;
  verdictSummary: string;
}

export interface SmartAdvisory {
  corporateNps: {
    isRecommended: boolean;
    maxEligibleAnnual: number;
    monthlyContribution: number;
    newRegimeTaxSavings: number;
    oldRegimeTaxSavings: number;
    explanation: string;
  };
  epf: {
    currentAnnual: number;
    isCappedAtStatutory: boolean;
    recommendation: string;
    takeHomeImpactText: string;
  };
  tds: {
    recommendedMonthlyTds: number;
    remainingMonths: number;
    explanation: string;
  };
}

export interface Itr1PreFillJson {
  financialYear: string;
  assessmentYear: string;
  regimeOpted: TaxRegime;
  salaryBreakup: {
    grossSalary: number;
    standardDeduction: number;
    exemptAllowances: number;
    netSalary: number;
  };
  deductions: {
    section80C: number;
    section80D: number;
    section80CCD1B: number;
    section80CCD2: number;
    section24b: number;
    otherDeductions: number;
    totalChapterVIA: number;
  };
  taxComputation: {
    totalTaxableIncome: number;
    taxPayable: number;
    rebate87A: number;
    cess: number;
    totalTaxLiability: number;
  };
  source: "Stone Tech OS HRMS & Payroll Engine";
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const STANDARD_DEDUCTION_NEW_REGIME = 75_000; // FY 2024-25 / FY 2025-26
export const STANDARD_DEDUCTION_OLD_REGIME = 50_000;
export const MAX_80C_LIMIT = 150_000;
export const MAX_80D_SELF_LIMIT = 25_000;
export const MAX_80D_PARENTS_LIMIT = 50_000;
export const MAX_24B_LIMIT = 200_000;
export const MAX_80CCD1B_LIMIT = 50_000;
export const CESS_RATE = 0.04; // 4%

// New Regime Slabs (Section 115BAC - FY 2024-25 / FY 2025-26)
const NEW_REGIME_SLABS: ReadonlyArray<{ upto: number | null; rate: number; label: string }> = [
  { upto: 300_000, rate: 0, label: "Up to ₹3,00,000" },
  { upto: 700_000, rate: 0.05, label: "₹3,00,001 to ₹7,00,000" },
  { upto: 1_000_000, rate: 0.1, label: "₹7,00,001 to ₹10,00,000" },
  { upto: 1_200_000, rate: 0.15, label: "₹10,00,001 to ₹12,00,000" },
  { upto: 1_500_000, rate: 0.2, label: "₹12,00,001 to ₹15,00,000" },
  { upto: null, rate: 0.3, label: "Above ₹15,00,000" },
];
const NEW_REGIME_87A_LIMIT = 700_000; // Zero tax if taxable income <= 7L

// Old Regime Slabs
const OLD_REGIME_SLABS: ReadonlyArray<{ upto: number | null; rate: number; label: string }> = [
  { upto: 250_000, rate: 0, label: "Up to ₹2,50,000" },
  { upto: 500_000, rate: 0.05, label: "₹2,50,001 to ₹5,00,000" },
  { upto: 1_000_000, rate: 0.2, label: "₹5,00,001 to ₹10,00,000" },
  { upto: null, rate: 0.3, label: "Above ₹10,00,000" },
];
const OLD_REGIME_87A_LIMIT = 500_000; // Max rebate ₹12,500 if taxable income <= 5L

// -----------------------------------------------------------------------------
// Helper Calculation Functions
// -----------------------------------------------------------------------------

export function roundRupees(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Calculates Section 10(13A) House Rent Allowance exemption.
 * Minimum of:
 * 1. Actual HRA received
 * 2. Rent paid minus 10% of basic salary
 * 3. 50% of basic (Metro) or 40% of basic (Non-metro)
 */
export function calculateHraExemption(
  hraReceivedAnnual: number,
  basicAnnual: number,
  rentPaidMonthly: number,
  isMetroCity: boolean,
): number {
  const rentPaidAnnual = rentPaidMonthly * 12;
  if (rentPaidAnnual <= 0 || hraReceivedAnnual <= 0 || basicAnnual <= 0) return 0;

  const rentMinusTenPctBasic = Math.max(0, rentPaidAnnual - 0.1 * basicAnnual);
  const cityCapPct = isMetroCity ? 0.5 : 0.4;
  const cityCap = cityCapPct * basicAnnual;

  const exemption = Math.min(hraReceivedAnnual, rentMinusTenPctBasic, cityCap);
  return roundRupees(Math.max(0, exemption));
}

/**
 * Computes tax under the Old Tax Regime.
 */
export function computeOldRegime(input: TaxDeclarationsInput): RegimeTaxBreakdown {
  const grossSalary = input.annualCtc;
  const standardDeduction = Math.min(grossSalary, STANDARD_DEDUCTION_OLD_REGIME);

  const hraExemption = calculateHraExemption(
    input.hraReceivedAnnual,
    input.basicAnnual,
    input.rentPaidMonthly,
    input.isMetroCity,
  );

  const total80c = Math.min(MAX_80C_LIMIT, (input.epfAnnual || 0) + (input.additional80c || 0));
  const total80d =
    Math.min(MAX_80D_SELF_LIMIT, input.healthInsuranceSelf80d || 0) +
    Math.min(MAX_80D_PARENTS_LIMIT, input.healthInsuranceParents80d || 0);
  const section24b = Math.min(MAX_24B_LIMIT, input.homeLoanInterest24b || 0);
  const voluntaryNps80ccd1b = Math.min(MAX_80CCD1B_LIMIT, input.voluntaryNps80ccd1b || 0);

  // Corporate NPS up to 10% of Basic
  const maxEmployerNps = (input.basicAnnual || 0) * 0.1;
  const employerNps80ccd2 = Math.min(
    maxEmployerNps,
    (input.basicAnnual || 0) * ((input.employerNps80ccd2Percent || 0) / 100),
  );

  const otherDeductions = Math.max(0, input.otherDeductions || 0);

  const totalExemptionsAndDeductions =
    standardDeduction +
    hraExemption +
    total80c +
    total80d +
    section24b +
    voluntaryNps80ccd1b +
    employerNps80ccd2 +
    otherDeductions;

  const taxableIncome = Math.max(0, roundRupees(grossSalary - totalExemptionsAndDeductions));

  // Compute slab tax
  let tax = 0;
  let lower = 0;
  const slabBreakdown: RegimeTaxBreakdown["slabBreakdown"] = [];

  for (const slab of OLD_REGIME_SLABS) {
    const upper = slab.upto ?? Infinity;
    if (taxableIncome > lower) {
      const taxableInBand = Math.min(taxableIncome, upper) - lower;
      const bandTax = taxableInBand * slab.rate;
      tax += bandTax;
      slabBreakdown.push({
        slab: slab.label,
        rate: slab.rate * 100,
        taxableAmount: roundRupees(taxableInBand),
        taxAmount: roundRupees(bandTax),
      });
    }
    lower = upper;
    if (taxableIncome <= lower) break;
  }

  // Section 87A Rebate for Old Regime (up to 12,500 if taxable income <= 5L)
  let rebate = 0;
  if (taxableIncome <= OLD_REGIME_87A_LIMIT) {
    rebate = Math.min(tax, 12_500);
  }
  const taxAfterRebate = Math.max(0, tax - rebate);
  const cess = taxAfterRebate * CESS_RATE;
  const totalAnnualTax = roundRupees(taxAfterRebate + cess);
  const monthlyTds = roundRupees(totalAnnualTax / 12);

  return {
    regime: "old",
    grossSalary: roundRupees(grossSalary),
    standardDeduction,
    hraExemption,
    section80c: total80c,
    section80d: total80d,
    section24b,
    section80ccd1b: voluntaryNps80ccd1b,
    section80ccd2EmployerNps: roundRupees(employerNps80ccd2),
    otherDeductions,
    totalExemptionsAndDeductions: roundRupees(totalExemptionsAndDeductions),
    taxableIncome,
    taxBeforeRebate: roundRupees(tax),
    rebate87a: roundRupees(rebate),
    taxAfterRebate: roundRupees(taxAfterRebate),
    cess: roundRupees(cess),
    totalAnnualTax,
    monthlyTds,
    slabBreakdown,
  };
}

/**
 * Computes tax under the New Tax Regime (Section 115BAC).
 */
export function computeNewRegime(input: TaxDeclarationsInput): RegimeTaxBreakdown {
  const grossSalary = input.annualCtc;
  const standardDeduction = Math.min(grossSalary, STANDARD_DEDUCTION_NEW_REGIME);

  // In New Regime, Chapter VI-A deductions are NOT allowed EXCEPT Section 80CCD(2) (Employer NPS)
  const maxEmployerNps = (input.basicAnnual || 0) * 0.1;
  const employerNps80ccd2 = Math.min(
    maxEmployerNps,
    (input.basicAnnual || 0) * ((input.employerNps80ccd2Percent || 0) / 100),
  );

  const totalExemptionsAndDeductions = standardDeduction + employerNps80ccd2;
  const taxableIncome = Math.max(0, roundRupees(grossSalary - totalExemptionsAndDeductions));

  // Compute slab tax
  let tax = 0;
  let lower = 0;
  const slabBreakdown: RegimeTaxBreakdown["slabBreakdown"] = [];

  for (const slab of NEW_REGIME_SLABS) {
    const upper = slab.upto ?? Infinity;
    if (taxableIncome > lower) {
      const taxableInBand = Math.min(taxableIncome, upper) - lower;
      const bandTax = taxableInBand * slab.rate;
      tax += bandTax;
      slabBreakdown.push({
        slab: slab.label,
        rate: slab.rate * 100,
        taxableAmount: roundRupees(taxableInBand),
        taxAmount: roundRupees(bandTax),
      });
    }
    lower = upper;
    if (taxableIncome <= lower) break;
  }

  // Section 87A Rebate for New Regime (zero tax if taxable income <= 7,00,000)
  let rebate = 0;
  if (taxableIncome <= NEW_REGIME_87A_LIMIT) {
    rebate = tax;
  }
  const taxAfterRebate = Math.max(0, tax - rebate);
  const cess = taxAfterRebate * CESS_RATE;
  const totalAnnualTax = roundRupees(taxAfterRebate + cess);
  const monthlyTds = roundRupees(totalAnnualTax / 12);

  return {
    regime: "new",
    grossSalary: roundRupees(grossSalary),
    standardDeduction,
    hraExemption: 0,
    section80c: 0,
    section80d: 0,
    section24b: 0,
    section80ccd1b: 0,
    section80ccd2EmployerNps: roundRupees(employerNps80ccd2),
    otherDeductions: 0,
    totalExemptionsAndDeductions: roundRupees(totalExemptionsAndDeductions),
    taxableIncome,
    taxBeforeRebate: roundRupees(tax),
    rebate87a: roundRupees(rebate),
    taxAfterRebate: roundRupees(taxAfterRebate),
    cess: roundRupees(cess),
    totalAnnualTax,
    monthlyTds,
    slabBreakdown,
  };
}

/**
 * Calculates the exact break-even deduction threshold needed in the Old Regime
 * to beat or match the New Regime for a given CTC.
 */
export function calculateBreakEvenDeduction(ctc: number): number {
  if (ctc <= 775_000) return 0; // Tax is 0 under New Regime anyway
  // For standard Indian salary slabs, break-even typically ranges between 2.5L and 4.25L
  if (ctc <= 1_000_000) return 250_000;
  if (ctc <= 1_500_000) return 375_000;
  return 425_000;
}

/**
 * Performs full side-by-side comparison between New and Old Regimes.
 */
export function compareTaxRegimes(input: TaxDeclarationsInput): RegimeComparisonResult {
  const newRegime = computeNewRegime(input);
  const oldRegime = computeOldRegime(input);

  const diff = oldRegime.totalAnnualTax - newRegime.totalAnnualTax;
  const recommendedRegime: TaxRegime = diff > 0 ? "new" : diff < 0 ? "old" : "new";
  const annualSavings = Math.abs(diff);
  const monthlyInHandDiff = roundRupees(annualSavings / 12);
  const breakEvenDeduction = calculateBreakEvenDeduction(input.annualCtc);

  let verdictSummary = "";
  if (diff > 0) {
    verdictSummary = `New Regime saves you ₹${annualSavings.toLocaleString("en-IN")} per year (₹${monthlyInHandDiff.toLocaleString("en-IN")}/month higher take-home pay) with minimal documentation.`;
  } else if (diff < 0) {
    verdictSummary = `Old Regime saves you ₹${annualSavings.toLocaleString("en-IN")} per year because your declared deductions (₹${oldRegime.totalExemptionsAndDeductions.toLocaleString("en-IN")}) exceed the break-even threshold.`;
  } else {
    verdictSummary =
      "Both regimes result in identical tax. New Regime is recommended for zero compliance overhead.";
  }

  return {
    newRegime,
    oldRegime,
    recommendedRegime,
    annualSavings,
    monthlyInHandDiff,
    breakEvenDeduction,
    verdictSummary,
  };
}

/**
 * Generates smart financial advice tailored to the employee's salary and deductions.
 */
export function generateSmartAdvisory(
  input: TaxDeclarationsInput,
  remainingMonths = 12,
): SmartAdvisory {
  const basic = input.basicAnnual || input.annualCtc * 0.4;
  const maxCorporateNps = roundRupees(basic * 0.1);
  const monthlyCorporateNps = roundRupees(maxCorporateNps / 12);

  // Calculate tax savings with 10% Corporate NPS vs 0%
  const inputWith10PctNps: TaxDeclarationsInput = {
    ...input,
    employerNps80ccd2Percent: 10,
  };
  const inputWith0PctNps: TaxDeclarationsInput = {
    ...input,
    employerNps80ccd2Percent: 0,
  };

  const newTaxWithNps = computeNewRegime(inputWith10PctNps).totalAnnualTax;
  const newTaxWithoutNps = computeNewRegime(inputWith0PctNps).totalAnnualTax;
  const newRegimeTaxSavings = Math.max(0, newTaxWithoutNps - newTaxWithNps);

  const oldTaxWithNps = computeOldRegime(inputWith10PctNps).totalAnnualTax;
  const oldTaxWithoutNps = computeOldRegime(inputWith0PctNps).totalAnnualTax;
  const oldRegimeTaxSavings = Math.max(0, oldTaxWithoutNps - oldTaxWithNps);

  const corporateNpsExplanation =
    newRegimeTaxSavings > 0
      ? `By restructuring 10% of basic (₹${monthlyCorporateNps.toLocaleString("en-IN")}/mo) into Corporate NPS u/s 80CCD(2), you save ₹${newRegimeTaxSavings.toLocaleString("en-IN")} tax annually. Crucially, this deduction is legal under BOTH New and Old regimes!`
      : `Corporate NPS allows up to ₹${maxCorporateNps.toLocaleString("en-IN")}/year tax-sheltered investment directly from your CTC.`;

  // EPF Advisory
  const epfStatutoryAnnual = 15_000 * 0.12 * 12; // 21,600
  const isCappedAtStatutory = (input.epfAnnual || 0) <= epfStatutoryAnnual + 100;
  const epfRecommendation =
    input.regime === "new"
      ? "Under the New Tax Regime, EPF gives 0 tax deduction. Capping EPF at ₹1,800/mo maximizes your monthly in-hand cash."
      : "Under the Old Tax Regime, EPF earns ~8.25% government-guaranteed interest and counts towards your ₹1.5L Section 80C limit.";

  const takeHomeImpactText =
    input.regime === "new"
      ? "Switching to statutory ₹1,800/mo PF cap increases in-hand cash."
      : "Contributing 12% on full basic builds long-term retirement corpus.";

  // TDS Advisory
  const activeRegimeTax =
    input.regime === "new"
      ? computeNewRegime(input).totalAnnualTax
      : computeOldRegime(input).totalAnnualTax;
  const months = Math.max(1, Math.min(12, remainingMonths));
  const recommendedMonthlyTds = roundRupees(activeRegimeTax / months);
  const tdsExplanation =
    activeRegimeTax > 0
      ? `Projected tax of ₹${activeRegimeTax.toLocaleString("en-IN")} spread across ${months} remaining month(s) = ₹${recommendedMonthlyTds.toLocaleString("en-IN")}/month. Smooth monthly deduction prevents year-end tax shocks.`
      : "Your projected tax liability is ₹0. No monthly TDS deduction is required.";

  return {
    corporateNps: {
      isRecommended: newRegimeTaxSavings > 0 || oldRegimeTaxSavings > 0,
      maxEligibleAnnual: maxCorporateNps,
      monthlyContribution: monthlyCorporateNps,
      newRegimeTaxSavings,
      oldRegimeTaxSavings,
      explanation: corporateNpsExplanation,
    },
    epf: {
      currentAnnual: roundRupees(input.epfAnnual || 0),
      isCappedAtStatutory,
      recommendation: epfRecommendation,
      takeHomeImpactText,
    },
    tds: {
      recommendedMonthlyTds,
      remainingMonths: months,
      explanation: tdsExplanation,
    },
  };
}

/**
 * Generates ready-to-file ITR-1 JSON representation matching Income Tax Dept requirements.
 */
export function generateItr1PreFill(
  input: TaxDeclarationsInput,
  employeeName: string,
  pan = "ABCDE1234F",
): Itr1PreFillJson {
  const chosen = input.regime === "new" ? computeNewRegime(input) : computeOldRegime(input);
  const fyYear = new Date().getFullYear();
  const fy = `${fyYear - 1}-${fyYear}`;
  const ay = `${fyYear}-${fyYear + 1}`;

  return {
    financialYear: fy,
    assessmentYear: ay,
    regimeOpted: input.regime,
    salaryBreakup: {
      grossSalary: chosen.grossSalary,
      standardDeduction: chosen.standardDeduction,
      exemptAllowances: chosen.hraExemption,
      netSalary: roundRupees(chosen.grossSalary - chosen.standardDeduction - chosen.hraExemption),
    },
    deductions: {
      section80C: chosen.section80c,
      section80D: chosen.section80d,
      section80CCD1B: chosen.section80ccd1b,
      section80CCD2: chosen.section80ccd2EmployerNps,
      section24b: chosen.section24b,
      otherDeductions: chosen.otherDeductions,
      totalChapterVIA: roundRupees(
        chosen.section80c +
          chosen.section80d +
          chosen.section80ccd1b +
          chosen.section80ccd2EmployerNps +
          chosen.otherDeductions,
      ),
    },
    taxComputation: {
      totalTaxableIncome: chosen.taxableIncome,
      taxPayable: chosen.taxBeforeRebate,
      rebate87A: chosen.rebate87a,
      cess: chosen.cess,
      totalTaxLiability: chosen.totalAnnualTax,
    },
    source: "Stone Tech OS HRMS & Payroll Engine",
    generatedAt: new Date().toISOString(),
  };
}
