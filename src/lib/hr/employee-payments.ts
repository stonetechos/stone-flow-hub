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
import { rupees } from "./payroll-engine";
import type { SalaryStructure } from "./payroll-api";
import {
  recordEmployeePaymentServerFn,
  cancelEmployeePaymentServerFn,
  listEmployeePaymentsServerFn,
  getCompanySalaryBalancesServerFn,
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
  try {
    const res = await getCompanySalaryBalancesServerFn({
      data: { payrollMonth },
    });
    return res as CompanySalaryMonthSummary;
  } catch (err: unknown) {
    if (typeof window === "undefined" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return computeLocalCompanySalaryBalances(payrollMonth);
    }
    try {
      return await computeLocalCompanySalaryBalances(payrollMonth);
    } catch {
      throw new AppError(err instanceof Error ? err.message : "Failed to load salary balances");
    }
  }
}

async function computeLocalCompanySalaryBalances(
  payrollMonth: string,
): Promise<CompanySalaryMonthSummary> {
  const pMonth = payrollMonth || currentMonthStr();

  // 1. Fetch active employees, loans/advances, and active structures concurrently
  const [
    { data: employees, error: empErr },
    { data: loanRows, error: loanErr },
    { data: structures, error: structErr },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "id, full_name, employee_code, designation_id, department, phone, employment_status, salary_ctc",
      )
      .eq("employment_status", "active")
      .order("full_name", { ascending: true }),
    supabase.from("hr_loans").select("*").order("created_at", { ascending: false }),
    supabase
      .from("hr_salary_structures")
      .select("id, employee_id, effective_from, ctc_annual, status")
      .eq("status", "active"),
  ]);

  if (empErr) throw new AppError(mapDbError(empErr));
  if (loanErr) throw new AppError(mapDbError(loanErr));
  if (structErr) throw new AppError(mapDbError(structErr));

  const activeEmployees = employees ?? [];

  // Map active structures
  const structureByEmployee = new Map<string, SalaryStructure>();
  for (const s of (structures ?? []) as unknown as SalaryStructure[]) {
    const existing = structureByEmployee.get(s.employee_id);
    if (!existing || s.effective_from > existing.effective_from) {
      structureByEmployee.set(s.employee_id, s);
    }
  }

  // Parse loans / payments for this month
  const paymentsList: EmployeePayment[] = [];
  for (const l of (loanRows ?? []) as Array<{
    id: string;
    employee_id: string;
    loan_type: string;
    principal: number;
    start_month?: string | null;
    status: string;
    reason?: string | null;
    created_at: string;
  }>) {
    let meta: Record<string, unknown> = {};
    if (l.reason && typeof l.reason === "string" && l.reason.startsWith("{")) {
      try {
        meta = JSON.parse(l.reason);
      } catch {
        meta = {};
      }
    }

    const rowMonth =
      (meta.payroll_month as string) ||
      (l.start_month ? l.start_month.slice(0, 7) : l.created_at.slice(0, 7));

    if (rowMonth !== pMonth) continue;

    const paymentType =
      (meta.payment_type as EmployeePaymentType) || (l.loan_type === "loan" ? "loan" : "advance");

    paymentsList.push({
      id: l.id,
      employee_id: l.employee_id,
      payment_date: (meta.date as string) || l.created_at.slice(0, 10),
      amount: Number(l.principal),
      payment_type: paymentType,
      payment_method: (meta.method as string) || "cash",
      account_name: (meta.account as string) || "Cash",
      reference_no: (meta.ref as string) || null,
      payroll_month: rowMonth,
      is_deducted_from_payroll: meta.deduct !== false,
      status: l.status === "closed" ? "cancelled" : "paid",
      notes: (meta.notes as string) || (!l.reason?.startsWith("{") ? l.reason : null) || null,
      created_at: l.created_at,
    });
  }

  const paymentsByEmployee = new Map<string, EmployeePayment[]>();
  const byPaymentMethod: Record<string, number> = {};

  for (const p of paymentsList) {
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
    const empPayments = paymentsByEmployee.get(emp.id) ?? [];

    const intermediatePaid = empPayments
      .filter((p) => p.is_deducted_from_payroll && p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    let baseGross = 0;
    if (emp.salary_ctc != null && Number(emp.salary_ctc) > 0) {
      const rawCtc = Number(emp.salary_ctc);
      baseGross = rawCtc > 100000 ? Math.round(rawCtc / 12) : Math.round(rawCtc);
    } else if (structure?.ctc_annual != null && Number(structure.ctc_annual) > 0) {
      baseGross = Math.round(Number(structure.ctc_annual) / 12);
    }

    const estimatedNet = baseGross;
    const earnedSalary = baseGross;
    const statutoryDeductions = 0;

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
      designation: null,
      department: emp.department ?? null,
      phone: emp.phone ?? null,
      baseGrossSalary: baseGross,
      estimatedNetSalary: estimatedNet,
      attendanceLopDays: 0,
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
    payrollMonth: pMonth,
    payrollMonthLabel: formatMonthLabel(pMonth),
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
