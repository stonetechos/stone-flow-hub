/**
 * Payroll engine — pure, deterministic functions.
 *
 * No Supabase, no React. Every rupee a payslip shows is derived here from
 * explicit inputs, so the same calculation runs in the browser preview, in a
 * batch run and in tests. Statutory rates are *inputs* (payroll settings), not
 * constants, because PF/ESI/PT rules change by year and by state.
 */

export type ComponentKind = "earning" | "deduction";
export type CalcType = "fixed" | "percent_of_basic" | "percent_of_ctc" | "balance";

export interface SalaryComponentDef {
  id?: string;
  name: string;
  kind: ComponentKind;
  calc_type: CalcType;
  value: number;
  is_taxable: boolean;
  pf_applicable: boolean;
  esi_applicable: boolean;
  sort_order?: number;
}

export interface StructureLine {
  component_id?: string | null;
  label: string;
  kind: ComponentKind;
  monthly_amount: number;
  is_taxable: boolean;
  pf_applicable: boolean;
  esi_applicable: boolean;
  sort_order: number;
}

export interface PtSlab {
  /** Upper bound of monthly gross for this slab; `null` means "and above". */
  upto: number | null;
  amount: number;
}

export interface PayrollSettings {
  pf_employee_pct: number;
  pf_employer_pct: number;
  pf_wage_ceiling: number;
  pf_limit_to_ceiling: boolean;
  esi_employee_pct: number;
  esi_employer_pct: number;
  esi_wage_ceiling: number;
  pt_slabs: PtSlab[];
  tds_enabled: boolean;
  standard_deduction: number;
  overtime_multiplier: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  pf_employee_pct: 12,
  pf_employer_pct: 12,
  pf_wage_ceiling: 15000,
  pf_limit_to_ceiling: true,
  esi_employee_pct: 0.75,
  esi_employer_pct: 3.25,
  esi_wage_ceiling: 21000,
  pt_slabs: [
    { upto: 7500, amount: 0 },
    { upto: 10000, amount: 175 },
    { upto: null, amount: 200 },
  ],
  tds_enabled: true,
  standard_deduction: 75000,
  overtime_multiplier: 1.5,
};

/** Rounds to whole rupees — payroll never carries paise on a payslip. */
export function rupees(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function pct(base: number, percent: number): number {
  return (base * percent) / 100;
}

// ---------------------------------------------------------------- structures

/**
 * Expands a CTC into monthly component lines.
 *
 * Percent components resolve against basic or annual CTC; a single `balance`
 * component absorbs whatever is left so the structure always reconciles to the
 * CTC exactly (no silent rounding leak).
 */
export function buildStructureFromCtc(
  ctcAnnual: number,
  components: readonly SalaryComponentDef[],
): StructureLine[] {
  const monthlyCtc = ctcAnnual / 12;
  const earnings = components.filter((c) => c.kind === "earning");
  const basicDef = earnings.find((c) => c.calc_type === "percent_of_ctc");
  const basic = basicDef ? pct(monthlyCtc, basicDef.value) : monthlyCtc * 0.4;

  const lines: StructureLine[] = [];
  let allocated = 0;
  let balanceIndex = -1;

  components.forEach((c, i) => {
    let amount = 0;
    switch (c.calc_type) {
      case "fixed":
        amount = c.value;
        break;
      case "percent_of_basic":
        amount = pct(basic, c.value);
        break;
      case "percent_of_ctc":
        amount = pct(monthlyCtc, c.value);
        break;
      case "balance":
        amount = 0;
        balanceIndex = i;
        break;
    }
    amount = rupees(amount);
    if (c.kind === "earning" && c.calc_type !== "balance") allocated += amount;
    lines.push({
      component_id: c.id ?? null,
      label: c.name,
      kind: c.kind,
      monthly_amount: amount,
      is_taxable: c.is_taxable,
      pf_applicable: c.pf_applicable,
      esi_applicable: c.esi_applicable,
      sort_order: c.sort_order ?? i,
    });
  });

  if (balanceIndex >= 0) {
    const line = lines[balanceIndex]!;
    line.monthly_amount = Math.max(0, rupees(monthlyCtc) - allocated);
  }
  return lines;
}

export function grossFromLines(lines: readonly StructureLine[]): number {
  return rupees(
    lines.filter((l) => l.kind === "earning").reduce((s, l) => s + l.monthly_amount, 0),
  );
}

// ---------------------------------------------------------------- statutory

export interface StatutorySplit {
  employee: number;
  employer: number;
}

/** Provident Fund on PF-applicable wages, optionally capped at the ceiling. */
export function computePf(pfWage: number, s: PayrollSettings): StatutorySplit {
  const base = s.pf_limit_to_ceiling ? Math.min(pfWage, s.pf_wage_ceiling) : pfWage;
  if (base <= 0) return { employee: 0, employer: 0 };
  return {
    employee: rupees(pct(base, s.pf_employee_pct)),
    employer: rupees(pct(base, s.pf_employer_pct)),
  };
}

/** ESI applies only while gross stays within the wage ceiling. */
export function computeEsi(esiWage: number, s: PayrollSettings): StatutorySplit {
  if (esiWage <= 0 || esiWage > s.esi_wage_ceiling) return { employee: 0, employer: 0 };
  return {
    employee: Math.ceil(pct(esiWage, s.esi_employee_pct)),
    employer: Math.ceil(pct(esiWage, s.esi_employer_pct)),
  };
}

/** Professional tax from the configured monthly slab table. */
export function computeProfessionalTax(monthlyGross: number, slabs: readonly PtSlab[]): number {
  if (monthlyGross <= 0) return 0;
  const ordered = [...slabs].sort((a, b) => (a.upto ?? Infinity) - (b.upto ?? Infinity));
  for (const slab of ordered) {
    if (slab.upto === null || monthlyGross <= slab.upto) return rupees(slab.amount);
  }
  return 0;
}

/** New-regime annual slabs (FY 2025-26). Kept local so TDS stays explainable. */
const TDS_SLABS: ReadonlyArray<{ upto: number | null; rate: number }> = [
  { upto: 400_000, rate: 0 },
  { upto: 800_000, rate: 5 },
  { upto: 1_200_000, rate: 10 },
  { upto: 1_600_000, rate: 15 },
  { upto: 2_000_000, rate: 20 },
  { upto: 2_400_000, rate: 25 },
  { upto: null, rate: 30 },
];
const REBATE_87A_LIMIT = 1_200_000;
const CESS_PCT = 4;

/** Annual income tax under the new regime, including 87A rebate and cess. */
export function computeAnnualTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const slab of TDS_SLABS) {
    const upper = slab.upto ?? Infinity;
    if (taxableIncome > lower) {
      const band = Math.min(taxableIncome, upper) - lower;
      tax += pct(band, slab.rate);
    }
    lower = upper;
    if (taxableIncome <= lower) break;
  }
  if (taxableIncome <= REBATE_87A_LIMIT) tax = 0;
  return rupees(tax + pct(tax, CESS_PCT));
}

/**
 * Monthly TDS = annual tax on projected taxable pay, spread evenly over the
 * remaining months of the financial year.
 */
export function computeMonthlyTds(
  annualTaxableGross: number,
  s: PayrollSettings,
  remainingMonths = 12,
): number {
  if (!s.tds_enabled) return 0;
  const taxable = Math.max(0, annualTaxableGross - s.standard_deduction);
  const annual = computeAnnualTax(taxable);
  const months = Math.max(1, Math.min(12, Math.round(remainingMonths)));
  return rupees(annual / months);
}

// ---------------------------------------------------------------- attendance

/** Days actually payable after unpaid absence. */
export function payableDays(calendarDays: number, lopDays: number): number {
  return Math.max(0, calendarDays - Math.max(0, lopDays));
}

/** Hourly rate used for overtime — standard 26-day / 8-hour convention. */
export function overtimeHourlyRate(monthlyBasic: number, multiplier: number): number {
  if (monthlyBasic <= 0) return 0;
  return (monthlyBasic / 26 / 8) * multiplier;
}

// ---------------------------------------------------------------- payslip

export interface PayslipInput {
  employeeId: string;
  employeeName?: string | null;
  employeeCode?: string | null;
  lines: readonly StructureLine[];
  calendarDays: number;
  lopDays: number;
  presentDays?: number;
  paidLeaveDays?: number;
  overtimeHours?: number;
  loanInstallment?: number;
  reimbursements?: number;
  settings: PayrollSettings;
  /** Months left in the financial year, used to spread TDS. */
  remainingMonths?: number;
}

export interface PayslipLine {
  label: string;
  kind: "earning" | "deduction" | "employer";
  amount: number;
  sort_order: number;
}

export interface PayslipResult {
  employeeId: string;
  employeeName: string | null;
  employeeCode: string | null;
  payableDays: number;
  presentDays: number;
  lopDays: number;
  paidLeaveDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  loanDeduction: number;
  reimbursements: number;
  employerCost: number;
  lines: PayslipLine[];
}

/**
 * Computes one payslip. Order matters and mirrors Indian payroll practice:
 * prorate earnings → derive PF/ESI wages → statutory deductions → other
 * deductions → net pay. Reimbursements are paid on top and never taxed here.
 */
export function computePayslip(input: PayslipInput): PayslipResult {
  const s = input.settings;
  const calendar = Math.max(1, input.calendarDays);
  const lop = Math.min(Math.max(0, input.lopDays), calendar);
  const paid = payableDays(calendar, lop);
  const factor = paid / calendar;

  const lines: PayslipLine[] = [];
  let gross = 0;
  let pfWage = 0;
  let esiWage = 0;
  let taxableMonthly = 0;
  let structuredDeductions = 0;
  let basic = 0;

  for (const l of input.lines) {
    const amount = rupees(l.monthly_amount * (l.kind === "earning" ? factor : 1));
    if (l.kind === "earning") {
      gross += amount;
      if (l.pf_applicable) pfWage += amount;
      if (l.esi_applicable) esiWage += amount;
      if (l.is_taxable) taxableMonthly += amount;
      if (/basic/i.test(l.label)) basic += rupees(l.monthly_amount);
    } else {
      structuredDeductions += amount;
    }
    lines.push({ label: l.label, kind: l.kind, amount, sort_order: l.sort_order });
  }

  const overtimeHours = Math.max(0, input.overtimeHours ?? 0);
  const overtimeAmount = rupees(
    overtimeHours * overtimeHourlyRate(basic || gross, s.overtime_multiplier),
  );
  if (overtimeAmount > 0) {
    gross += overtimeAmount;
    taxableMonthly += overtimeAmount;
    esiWage += overtimeAmount;
    lines.push({ label: "Overtime", kind: "earning", amount: overtimeAmount, sort_order: 900 });
  }

  const pf = computePf(pfWage, s);
  const esi = computeEsi(esiWage, s);
  const pt = computeProfessionalTax(gross, s.pt_slabs);
  const tds = computeMonthlyTds(taxableMonthly * 12, s, input.remainingMonths ?? 12);
  const loan = rupees(Math.max(0, input.loanInstallment ?? 0));
  const reimb = rupees(Math.max(0, input.reimbursements ?? 0));

  if (pf.employee)
    lines.push({ label: "PF (employee)", kind: "deduction", amount: pf.employee, sort_order: 910 });
  if (esi.employee)
    lines.push({
      label: "ESI (employee)",
      kind: "deduction",
      amount: esi.employee,
      sort_order: 911,
    });
  if (pt) lines.push({ label: "Professional tax", kind: "deduction", amount: pt, sort_order: 912 });
  if (tds) lines.push({ label: "TDS", kind: "deduction", amount: tds, sort_order: 913 });
  if (loan)
    lines.push({ label: "Loan / advance", kind: "deduction", amount: loan, sort_order: 914 });
  if (reimb)
    lines.push({ label: "Reimbursements", kind: "earning", amount: reimb, sort_order: 920 });
  if (pf.employer)
    lines.push({ label: "PF (employer)", kind: "employer", amount: pf.employer, sort_order: 930 });
  if (esi.employer)
    lines.push({
      label: "ESI (employer)",
      kind: "employer",
      amount: esi.employer,
      sort_order: 931,
    });

  const totalDeductions = structuredDeductions + pf.employee + esi.employee + pt + tds + loan;
  const netPay = rupees(gross + reimb - totalDeductions);

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName ?? null,
    employeeCode: input.employeeCode ?? null,
    payableDays: paid,
    presentDays: input.presentDays ?? paid,
    lopDays: lop,
    paidLeaveDays: input.paidLeaveDays ?? 0,
    overtimeHours,
    overtimeAmount,
    grossEarnings: rupees(gross),
    totalDeductions: rupees(totalDeductions),
    netPay,
    pfEmployee: pf.employee,
    pfEmployer: pf.employer,
    esiEmployee: esi.employee,
    esiEmployer: esi.employer,
    professionalTax: pt,
    tds,
    loanDeduction: loan,
    reimbursements: reimb,
    employerCost: rupees(gross + reimb + pf.employer + esi.employer),
    lines: lines.sort((a, b) => a.sort_order - b.sort_order),
  };
}

export interface RunTotals {
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost: number;
}

export function summarizeRun(slips: readonly PayslipResult[]): RunTotals {
  return slips.reduce<RunTotals>(
    (acc, p) => ({
      employeeCount: acc.employeeCount + 1,
      totalGross: acc.totalGross + p.grossEarnings,
      totalDeductions: acc.totalDeductions + p.totalDeductions,
      totalNet: acc.totalNet + p.netPay,
      totalEmployerCost: acc.totalEmployerCost + p.employerCost,
    }),
    { employeeCount: 0, totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerCost: 0 },
  );
}

/** Number of days in a payroll period. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Months left in the Indian financial year (April–March), inclusive. */
export function remainingFyMonths(month: number): number {
  return month >= 4 ? 12 - month + 4 : 4 - month;
}

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function periodLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1] ?? month} ${year}`;
}
