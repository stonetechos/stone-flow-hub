/**
 * Employee Payments & Intermediate Advances Management Layer.
 *
 * Provides:
 * 1. Recording of intermediate payments, mid-month salary advances, and incentives.
 * 2. Real-time computation of remaining salary due after the month ends.
 * 3. Company-wide monthly salary liability & intermediate payout summaries.
 * 4. Automatic integration with payroll payslip generation.
 */

import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { daysInMonth, rupees, type StructureLine } from "./payroll-engine";
import { getPayrollSettings, type SalaryStructure, type SalaryStructureLine } from "./payroll-api";
import {
  recordEmployeePaymentServerFn,
  cancelEmployeePaymentServerFn,
  listEmployeePaymentsServerFn,
} from "./employee-payments.functions";

export type EmployeePaymentType =
  | "advance"
  | "salary_part"
  | "bonus"
  | "incentive"
  | "loan"
  | "settlement";

export type EmployeePaymentMethodId =
  | "bank_transfer"
  | "upi_personal_rishi"
  | "upi_personal_raman"
  | "cash"
  | "cheque"
  | "other";

export interface EmployeePaymentMethod {
  id: EmployeePaymentMethodId;
  label: string;
  account: string;
}

export const EMPLOYEE_PAYMENT_METHODS: readonly EmployeePaymentMethod[] = [
  {
    id: "bank_transfer",
    label: "BOB Current Account (Bank Transfer / NEFT / IMPS)",
    account: "BOB Current Account",
  },
  {
    id: "upi_personal_rishi",
    label: "UPI Personal - Rishi",
    account: "UPI Personal - Rishi",
  },
  {
    id: "upi_personal_raman",
    label: "UPI Personal - Raman",
    account: "UPI Personal - Raman",
  },
  {
    id: "cash",
    label: "Cash in Hand",
    account: "Cash",
  },
  {
    id: "cheque",
    label: "Bank Cheque",
    account: "Bank Cheque",
  },
  {
    id: "other",
    label: "Other Account / Method",
    account: "Other",
  },
] as const;

export interface EmployeePaymentTypeOption {
  id: EmployeePaymentType;
  label: string;
  defaultDeduct: boolean;
  description: string;
}

export const EMPLOYEE_PAYMENT_TYPES: readonly EmployeePaymentTypeOption[] = [
  {
    id: "advance",
    label: "Intermediate Advance",
    defaultDeduct: true,
    description: "Emergency or mid-month advance against current month salary",
  },
  {
    id: "salary_part",
    label: "Mid-Month Salary Part-Payment",
    defaultDeduct: true,
    description: "Partial salary disbursement paid ahead of month-end closing",
  },
  {
    id: "loan",
    label: "Staff Loan / Long-Term Advance",
    defaultDeduct: true,
    description: "Loan advance recovered across salary cycles",
  },
  {
    id: "incentive",
    label: "Sales / Site Incentive",
    defaultDeduct: false,
    description: "Performance incentive (paid in addition to base salary)",
  },
  {
    id: "bonus",
    label: "Special Bonus",
    defaultDeduct: false,
    description: "Festival or discretionary bonus",
  },
  {
    id: "settlement",
    label: "Exit / Full & Final Settlement",
    defaultDeduct: true,
    description: "Final settlement payout during exit",
  },
] as const;

export interface EmployeePayment {
  id: string;
  employee_id: string;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_type: EmployeePaymentType;
  payment_method: string;
  account_name: string | null;
  reference_no: string | null;
  payroll_month: string; // YYYY-MM
  is_deducted_from_payroll: boolean;
  status: "paid" | "pending" | "cancelled";
  notes: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EmployeePaymentInput {
  employee_id: string;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_type: EmployeePaymentType;
  payment_method: EmployeePaymentMethodId | string;
  account_name?: string | null;
  reference_no?: string | null;
  payroll_month?: string; // YYYY-MM
  is_deducted_from_payroll?: boolean;
  notes?: string | null;
}

export interface EmployeeSalaryMonthBalance {
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  phone: string | null;
  baseGrossSalary: number;
  estimatedNetSalary: number;
  attendanceLopDays: number;
  earnedSalary: number;
  statutoryDeductions: number;
  intermediatePaymentsCount: number;
  totalIntermediatePaid: number;
  remainingSalaryDue: number;
  advanceExcess: number;
  status: "pending_full" | "partially_paid" | "fully_paid" | "advance_excess";
  payments: EmployeePayment[];
}

export interface CompanySalaryMonthSummary {
  payrollMonth: string;
  payrollMonthLabel: string;
  totalActiveEmployees: number;
  totalMonthlySalaryLiability: number;
  totalIntermediatePaymentsPaid: number;
  totalSalaryRemainingToPay: number;
  employeesPendingCount: number;
  employeesFullyPaidCount: number;
  byPaymentMethod: Record<string, number>;
  balances: EmployeeSalaryMonthBalance[];
}

/** Formats YYYY-MM into human-readable e.g. "October 2026" */
export function formatMonthLabel(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [yearStr, monthNum] = monthStr.split("-");
  const d = new Date(Number(yearStr), Number(monthNum) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Returns current month in YYYY-MM format */
export function currentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Record an intermediate employee payment or advance.
 * Saves to hr_employee_payments and syncs with hr_loans for dual-compatibility.
 */
export async function recordEmployeePayment(input: EmployeePaymentInput): Promise<EmployeePayment> {
  const employeeId = input.employee_id?.trim();
  if (!employeeId) throw new AppError("Select an employee");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError("Payment amount must be greater than zero");
  }

  const paymentDate = input.payment_date?.trim() || new Date().toISOString().slice(0, 10);
  const payrollMonth = input.payroll_month?.trim() || paymentDate.slice(0, 7);
  const isDeducted = input.is_deducted_from_payroll ?? true;

  const resolvedAccount =
    input.account_name ||
    EMPLOYEE_PAYMENT_METHODS.find((m) => m.id === input.payment_method)?.account ||
    input.payment_method;

  try {
    const res = await recordEmployeePaymentServerFn({
      data: {
        employee_id: employeeId,
        payment_date: paymentDate,
        amount: input.amount,
        payment_type: input.payment_type,
        payment_method: input.payment_method,
        account_name: resolvedAccount,
        reference_no: input.reference_no?.trim() || null,
        payroll_month: payrollMonth,
        is_deducted_from_payroll: isDeducted,
        notes: input.notes?.trim() || null,
      },
    });
    return res as EmployeePayment;
  } catch (err: unknown) {
    if (typeof window === "undefined" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        id: `mock-${Date.now()}`,
        employee_id: employeeId,
        payment_date: paymentDate,
        amount: rupees(input.amount),
        payment_type: input.payment_type,
        payment_method: input.payment_method,
        account_name: resolvedAccount,
        reference_no: input.reference_no?.trim() || null,
        payroll_month: payrollMonth,
        is_deducted_from_payroll: isDeducted,
        status: "paid" as const,
        notes: input.notes?.trim() || null,
        created_at: new Date().toISOString(),
      };
    }
    throw new AppError(err instanceof Error ? err.message : "Failed to record employee payment");
  }
}

/**
 * List all employee payments and advances, with optional filtering.
 */
export async function listEmployeePayments(filters?: {
  employeeId?: string;
  payrollMonth?: string;
  status?: string;
}): Promise<EmployeePayment[]> {
  try {
    const res = await listEmployeePaymentsServerFn({ data: filters });
    return res as EmployeePayment[];
  } catch (err: unknown) {
    if (typeof window === "undefined" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }
    throw new AppError(err instanceof Error ? err.message : "Failed to list employee payments");
  }
}

/**
 * Cancel or delete an employee payment.
 */
export async function cancelEmployeePayment(id: string): Promise<void> {
  try {
    await cancelEmployeePaymentServerFn({ data: { id } });
  } catch (err: unknown) {
    if (typeof window === "undefined" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }
    throw new AppError(err instanceof Error ? err.message : "Failed to cancel employee payment");
  }
}

/**
 * Computes the real-time salary and remaining balance due after month ends
 * for all active employees for a given month.
 */
export async function listCompanySalaryBalances(
  payrollMonth: string,
): Promise<CompanySalaryMonthSummary> {
  const [yearStr, monthNumStr] = (payrollMonth || currentMonthStr()).split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const month = Number(monthNumStr) || new Date().getMonth() + 1;
  const calendarDays = daysInMonth(year, month);
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(calendarDays).padStart(2, "0")}`;

  // 1. Fetch employees, active structures, lines, attendance, and intermediate payments
  const [
    { data: employees, error: empErr },
    { data: structures, error: structErr },
    settings,
    payments,
    { data: attendance, error: attErr },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, employee_code, designation_id, department, phone, employment_status")
      .eq("employment_status", "active")
      .order("full_name", { ascending: true }),
    supabase.from("hr_salary_structures").select("*").eq("status", "active"),
    getPayrollSettings(),
    listEmployeePayments({ payrollMonth }),
    supabase
      .from("hr_attendance_days")
      .select("employee_id, work_date, status")
      .gte("work_date", fromDate)
      .lte("work_date", toDate),
  ]);

  if (empErr) throw new AppError(mapDbError(empErr));
  if (structErr) throw new AppError(mapDbError(structErr));
  if (attErr) throw new AppError(mapDbError(attErr));

  const activeEmployees = employees ?? [];

  // Map active structures
  const structureByEmployee = new Map<string, SalaryStructure>();
  for (const s of (structures ?? []) as SalaryStructure[]) {
    const existing = structureByEmployee.get(s.employee_id);
    if (!existing || s.effective_from > existing.effective_from) {
      structureByEmployee.set(s.employee_id, s);
    }
  }

  // Fetch structure lines
  const structureIds = [...structureByEmployee.values()].map((s) => s.id);
  let structureLines: SalaryStructureLine[] = [];
  if (structureIds.length > 0) {
    const { data: linesData } = await supabase
      .from("hr_salary_structure_lines")
      .select("*")
      .in("structure_id", structureIds)
      .order("sort_order", { ascending: true });
    structureLines = (linesData ?? []) as SalaryStructureLine[];
  }

  const linesByStructure = new Map<string, SalaryStructureLine[]>();
  for (const l of structureLines) {
    const arr = linesByStructure.get(l.structure_id) ?? [];
    arr.push(l);
    linesByStructure.set(l.structure_id, arr);
  }

  // Map loss of pay (LOP)
  const lopByEmployee = new Map<string, number>();
  for (const d of attendance ?? []) {
    if (d.status === "absent") {
      lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 1);
    } else if (d.status === "half_day") {
      lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 0.5);
    }
  }

  // Group payments by employee
  const paymentsByEmployee = new Map<string, EmployeePayment[]>();
  const byPaymentMethod: Record<string, number> = {};

  for (const p of payments) {
    if (p.status === "cancelled") continue;
    const arr = paymentsByEmployee.get(p.employee_id) ?? [];
    arr.push(p);
    paymentsByEmployee.set(p.employee_id, arr);

    const mKey = p.account_name || p.payment_method || "Other";
    byPaymentMethod[mKey] = (byPaymentMethod[mKey] ?? 0) + Number(p.amount);
  }

  const balances: EmployeeSalaryMonthBalance[] = [];
  let totalLiability = 0;
  let totalIntermediate = 0;
  let totalRemaining = 0;
  let pendingCount = 0;
  let fullyPaidCount = 0;

  for (const emp of activeEmployees) {
    const structure = structureByEmployee.get(emp.id);
    const lines = structure ? (linesByStructure.get(structure.id) ?? []) : [];
    const empPayments = paymentsByEmployee.get(emp.id) ?? [];

    // Sum intermediate payments marked for salary deduction
    const intermediatePaid = empPayments
      .filter((p) => p.is_deducted_from_payroll && p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    let baseGross = 0;
    let estimatedNet = 0;
    let earnedSalary = 0;
    let statutoryDeductions = 0;

    if (lines.length > 0) {
      let gross = 0;
      let pfWage = 0;
      let esiWage = 0;
      let structuredDeductions = 0;

      const lopDays = lopByEmployee.get(emp.id) ?? 0;
      const paidDays = Math.max(0, calendarDays - lopDays);
      const factor = paidDays / calendarDays;

      for (const l of lines) {
        const amt = Number(l.monthly_amount);
        if (l.kind === "earning") {
          gross += amt;
          if (l.pf_applicable) pfWage += amt;
          if (l.esi_applicable) esiWage += amt;
        } else {
          structuredDeductions += amt;
        }
      }

      baseGross = rupees(gross);
      earnedSalary = rupees(gross * factor);

      // Estimated PF / ESI / PT
      const pfEmp = settings.pf_limit_to_ceiling
        ? Math.min(pfWage, settings.pf_wage_ceiling) * (settings.pf_employee_pct / 100)
        : pfWage * (settings.pf_employee_pct / 100);

      const esiEmp =
        gross <= settings.esi_wage_ceiling ? (esiWage * settings.esi_employee_pct) / 100 : 0;

      const pt = gross >= 10000 ? 200 : gross >= 7500 ? 175 : 0;

      statutoryDeductions = rupees(structuredDeductions + pfEmp + esiEmp + pt);
      estimatedNet = rupees(earnedSalary - statutoryDeductions);
    } else if (structure?.ctc_annual) {
      // Structure without line items: fallback to standard monthly CTC
      baseGross = rupees(Number(structure.ctc_annual) / 12);
      earnedSalary = baseGross;
      estimatedNet = baseGross;
    } else {
      // Default placeholder if structure has not been set yet
      baseGross = 0;
      earnedSalary = 0;
      estimatedNet = 0;
    }

    const remainingDue = Math.max(0, estimatedNet - intermediatePaid);
    const advanceExcess = Math.max(0, intermediatePaid - estimatedNet);

    let status: EmployeeSalaryMonthBalance["status"] = "pending_full";
    if (intermediatePaid === 0) {
      status = "pending_full";
      if (estimatedNet > 0) pendingCount++;
    } else if (remainingDue === 0 && advanceExcess === 0) {
      status = "fully_paid";
      fullyPaidCount++;
    } else if (advanceExcess > 0) {
      status = "advance_excess";
      fullyPaidCount++;
    } else {
      status = "partially_paid";
      pendingCount++;
    }

    totalLiability += estimatedNet;
    totalIntermediate += intermediatePaid;
    totalRemaining += remainingDue;

    balances.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeCode: emp.employee_code ?? null,
      designation: null, // hydrated in view from designations table if needed
      department: emp.department ?? null,
      phone: emp.phone ?? null,
      baseGrossSalary: baseGross,
      estimatedNetSalary: estimatedNet,
      attendanceLopDays: lopByEmployee.get(emp.id) ?? 0,
      earnedSalary,
      statutoryDeductions,
      intermediatePaymentsCount: empPayments.length,
      totalIntermediatePaid: intermediatePaid,
      remainingSalaryDue: remainingDue,
      advanceExcess,
      status,
      payments: empPayments,
    });
  }

  return {
    payrollMonth,
    payrollMonthLabel: formatMonthLabel(payrollMonth),
    totalActiveEmployees: activeEmployees.length,
    totalMonthlySalaryLiability: rupees(totalLiability),
    totalIntermediatePaymentsPaid: rupees(totalIntermediate),
    totalSalaryRemainingToPay: rupees(totalRemaining),
    employeesPendingCount: pendingCount,
    employeesFullyPaidCount: fullyPaidCount,
    byPaymentMethod,
    balances,
  };
}

/**
 * Generate a professional WhatsApp message receipt for an employee payment.
 */
export function generateEmployeePaymentWhatsAppMessage(params: {
  employeeName: string;
  amount: number;
  paymentType: EmployeePaymentType;
  paymentMethod: string;
  paymentDate: string;
  referenceNo?: string | null;
  payrollMonth: string;
  totalPaidThisMonth: number;
  remainingSalaryDue: number;
  notes?: string | null;
}): string {
  const monthName = formatMonthLabel(params.payrollMonth);
  const typeLabel =
    EMPLOYEE_PAYMENT_TYPES.find((t) => t.id === params.paymentType)?.label || "Advance Payment";

  const lines: string[] = [
    `*STONE TECH — PAYMENT VOUCHER*`,
    `----------------------------------------`,
    `Employee: *${params.employeeName}*`,
    `Date: *${params.paymentDate}*`,
    `Month Cycle: *${monthName}*`,
    ``,
    `*PAYMENT DETAILS:*`,
    `• Amount Paid: *₹${params.amount.toLocaleString("en-IN")}*`,
    `• Type: ${typeLabel}`,
    `• Method / Account: ${params.paymentMethod}`,
    ...(params.referenceNo ? [`• Reference / UTR: ${params.referenceNo}`] : []),
    ...(params.notes ? [`• Remarks: ${params.notes}`] : []),
    ``,
    `*MONTH-END SALARY STATUS (${monthName}):*`,
    `• Total Intermediate Paid This Month: *₹${params.totalPaidThisMonth.toLocaleString("en-IN")}*`,
    `• Remaining Salary to be Paid after Month Ends: *₹${params.remainingSalaryDue.toLocaleString("en-IN")}*`,
    `----------------------------------------`,
    `_This is an official computer-generated receipt from Stone Tech OS (HR Operations)._`,
  ];

  return lines.join("\n");
}
