/**
 * Payroll data access layer.
 *
 * Reads and writes go through the browser Supabase client, so RLS decides who
 * may see or change a payslip — these helpers only shape queries and sequence
 * the run. All arithmetic lives in `payroll-engine.ts`.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import {
  DEFAULT_PAYROLL_SETTINGS,
  computePayslip,
  daysInMonth,
  grossFromLines,
  remainingFyMonths,
  summarizeRun,
  type PayrollSettings,
  type PayslipResult,
  type PtSlab,
  type StructureLine,
} from "./payroll-engine";

export type SalaryComponent = DbTable<"hr_salary_components">;
export type SalaryStructure = DbTable<"hr_salary_structures">;
export type SalaryStructureLine = DbTable<"hr_salary_structure_lines">;
export type PayrollRun = DbTable<"hr_payroll_runs">;
export type Payslip = DbTable<"hr_payslips">;
export type PayslipLineRow = DbTable<"hr_payslip_lines">;
export type HrLoan = DbTable<"hr_loans">;
export type HrReimbursement = DbTable<"hr_reimbursements">;

export type PayrollRunStatus = "draft" | "pending_approval" | "approved" | "paid" | "cancelled";

function guard<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as T;
}

// ------------------------------------------------------------- settings
export async function getPayrollSettings(): Promise<PayrollSettings> {
  const { data, error } = await supabase.from("hr_payroll_settings").select("*").maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) return DEFAULT_PAYROLL_SETTINGS;
  return {
    pf_employee_pct: Number(data.pf_employee_pct),
    pf_employer_pct: Number(data.pf_employer_pct),
    pf_wage_ceiling: Number(data.pf_wage_ceiling),
    pf_limit_to_ceiling: data.pf_limit_to_ceiling,
    esi_employee_pct: Number(data.esi_employee_pct),
    esi_employer_pct: Number(data.esi_employer_pct),
    esi_wage_ceiling: Number(data.esi_wage_ceiling),
    pt_slabs: (Array.isArray(data.pt_slabs)
      ? data.pt_slabs
      : DEFAULT_PAYROLL_SETTINGS.pt_slabs) as PtSlab[],
    tds_enabled: data.tds_enabled,
    standard_deduction: Number(data.standard_deduction),
    overtime_multiplier: Number(data.overtime_multiplier),
  };
}

export async function savePayrollSettings(patch: Partial<PayrollSettings>): Promise<void> {
  const { error } = await supabase
    .from("hr_payroll_settings")
    .update({ ...patch, pt_slabs: patch.pt_slabs as never })
    .eq("id", true);
  if (error) throw new AppError(mapDbError(error));
}

// ------------------------------------------------------------- components
export async function listSalaryComponents(): Promise<SalaryComponent[]> {
  const { data, error } = await supabase
    .from("hr_salary_components")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return guard<SalaryComponent[]>(data, error);
}

export interface SalaryComponentInput {
  name: string;
  kind: "earning" | "deduction";
  calc_type: "fixed" | "percent_of_basic" | "percent_of_ctc" | "balance";
  value: number;
  is_taxable: boolean;
  pf_applicable: boolean;
  esi_applicable: boolean;
  sort_order?: number;
}

export async function upsertSalaryComponent(
  input: SalaryComponentInput,
  id?: string,
): Promise<SalaryComponent> {
  const name = input.name.trim();
  if (!name) throw new AppError("Component name is required");
  if (!Number.isFinite(input.value) || input.value < 0)
    throw new AppError("Component value must be zero or more");
  const payload = { ...input, name };
  const q = id
    ? supabase.from("hr_salary_components").update(payload).eq("id", id).select("*").single()
    : supabase.from("hr_salary_components").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as SalaryComponent;
}

export async function deleteSalaryComponent(id: string): Promise<void> {
  const { error } = await supabase.from("hr_salary_components").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ------------------------------------------------------------- structures
export interface StructureWithLines {
  structure: SalaryStructure;
  lines: SalaryStructureLine[];
}

export async function listSalaryStructures(employeeId?: string): Promise<SalaryStructure[]> {
  let q = supabase
    .from("hr_salary_structures")
    .select("*")
    .order("effective_from", { ascending: false })
    .limit(500);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  return guard<SalaryStructure[]>(data, error);
}

export async function getStructureLines(structureId: string): Promise<SalaryStructureLine[]> {
  const { data, error } = await supabase
    .from("hr_salary_structure_lines")
    .select("*")
    .eq("structure_id", structureId)
    .order("sort_order", { ascending: true });
  return guard<SalaryStructureLine[]>(data, error);
}

/** Saves a structure and replaces its lines; older ones become `superseded`. */
export async function saveSalaryStructure(input: {
  employee_id: string;
  effective_from: string;
  ctc_annual: number;
  lines: readonly StructureLine[];
  notes?: string | null;
}): Promise<SalaryStructure> {
  if (!input.employee_id) throw new AppError("Select an employee");
  if (!Number.isFinite(input.ctc_annual) || input.ctc_annual <= 0)
    throw new AppError("Annual CTC must be greater than zero");
  if (input.lines.length === 0) throw new AppError("Add at least one salary component");

  const { error: supersedeError } = await supabase
    .from("hr_salary_structures")
    .update({ status: "superseded" })
    .eq("employee_id", input.employee_id)
    .eq("status", "active");
  if (supersedeError) throw new AppError(mapDbError(supersedeError));

  const { data, error } = await supabase
    .from("hr_salary_structures")
    .insert({
      employee_id: input.employee_id,
      effective_from: input.effective_from,
      ctc_annual: input.ctc_annual,
      status: "active",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const structure = data as SalaryStructure;
  const { error: linesError } = await supabase.from("hr_salary_structure_lines").insert(
    input.lines.map((l, i) => ({
      structure_id: structure.id,
      component_id: l.component_id ?? null,
      label: l.label,
      kind: l.kind,
      monthly_amount: l.monthly_amount,
      is_taxable: l.is_taxable,
      pf_applicable: l.pf_applicable,
      esi_applicable: l.esi_applicable,
      sort_order: l.sort_order ?? i,
    })),
  );
  if (linesError) throw new AppError(mapDbError(linesError));
  return structure;
}

// ------------------------------------------------------------- loans
export async function listLoans(employeeId?: string): Promise<HrLoan[]> {
  let q = supabase
    .from("hr_loans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  return guard<HrLoan[]>(data, error);
}

export async function createLoan(input: {
  employee_id: string;
  loan_type: "advance" | "loan";
  principal: number;
  installments_total: number;
  start_month: string;
  reason?: string | null;
}): Promise<HrLoan> {
  if (!input.employee_id) throw new AppError("Select an employee");
  if (!(input.principal > 0)) throw new AppError("Principal must be greater than zero");
  if (!(input.installments_total >= 1)) throw new AppError("At least one instalment is required");
  const installment = Math.round(input.principal / input.installments_total);
  const { data, error } = await supabase
    .from("hr_loans")
    .insert({
      ...input,
      reason: input.reason ?? null,
      installment_amount: installment,
      outstanding: input.principal,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as HrLoan;
}

export async function closeLoan(id: string): Promise<void> {
  const { error } = await supabase.from("hr_loans").update({ status: "closed" }).eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ------------------------------------------------------------- reimbursements
export async function listReimbursements(params?: {
  status?: "pending" | "approved" | "rejected" | "paid" | "all";
  employeeId?: string;
}): Promise<HrReimbursement[]> {
  let q = supabase
    .from("hr_reimbursements")
    .select("*")
    .order("claim_date", { ascending: false })
    .limit(500);
  if (params?.status && params.status !== "all") q = q.eq("status", params.status);
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  const { data, error } = await q;
  return guard<HrReimbursement[]>(data, error);
}

export async function createReimbursement(input: {
  employee_id: string;
  claim_date: string;
  category: string;
  amount: number;
  description?: string | null;
}): Promise<HrReimbursement> {
  if (!input.employee_id) throw new AppError("Select an employee");
  if (!(input.amount > 0)) throw new AppError("Claim amount must be greater than zero");
  const { data, error } = await supabase
    .from("hr_reimbursements")
    .insert({ ...input, description: input.description ?? null, status: "pending" })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as HrReimbursement;
}

export async function setReimbursementStatus(
  id: string,
  status: "approved" | "rejected" | "paid",
  rejection_reason?: string,
): Promise<void> {
  const { error } = await supabase
    .from("hr_reimbursements")
    .update({
      status,
      approved_at: new Date().toISOString(),
      ...(rejection_reason ? { rejection_reason } : {}),
    })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ------------------------------------------------------------- runs
export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const { data, error } = await supabase
    .from("hr_payroll_runs")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(200);
  return guard<PayrollRun[]>(data, error);
}

export async function getPayrollRun(id: string): Promise<PayrollRun | null> {
  const { data, error } = await supabase
    .from("hr_payroll_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data as PayrollRun | null;
}

export async function listPayslips(runId: string): Promise<Payslip[]> {
  const { data, error } = await supabase
    .from("hr_payslips")
    .select("*")
    .eq("run_id", runId)
    .order("employee_name", { ascending: true });
  return guard<Payslip[]>(data, error);
}

export async function listPayslipLines(payslipId: string): Promise<PayslipLineRow[]> {
  const { data, error } = await supabase
    .from("hr_payslip_lines")
    .select("*")
    .eq("payslip_id", payslipId)
    .order("sort_order", { ascending: true });
  return guard<PayslipLineRow[]>(data, error);
}

export async function createPayrollRun(input: {
  period_month: number;
  period_year: number;
  branch_id?: string | null;
  notes?: string | null;
}): Promise<PayrollRun> {
  const { data, error } = await supabase
    .from("hr_payroll_runs")
    .insert({
      period_month: input.period_month,
      period_year: input.period_year,
      branch_id: input.branch_id ?? null,
      notes: input.notes ?? null,
      run_code: `PAY-${input.period_year}-${String(input.period_month).padStart(2, "0")}`,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as PayrollRun;
}

export async function setPayrollRunStatus(id: string, status: PayrollRunStatus): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("hr_payroll_runs")
    .update({
      status,
      ...(status === "approved" ? { approved_at: now } : {}),
      ...(status === "paid" ? { paid_at: now } : {}),
    })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export interface ProcessResult {
  processed: number;
  skipped: string[];
}

/**
 * Recomputes every payslip in a run from live salary structures, attendance
 * and pending deductions. Idempotent: existing payslips for the run are
 * replaced, so HR can re-process after fixing attendance. Locked once the run
 * has been approved.
 */
export async function processPayrollRun(runId: string): Promise<ProcessResult> {
  const run = await getPayrollRun(runId);
  if (!run) throw new AppError("Payroll run not found");
  if (run.status === "approved" || run.status === "paid")
    throw new AppError("This run is approved and can no longer be recalculated");

  const settings = await getPayrollSettings();
  const calendar = daysInMonth(run.period_year, run.period_month);
  const from = `${run.period_year}-${String(run.period_month).padStart(2, "0")}-01`;
  const to = `${run.period_year}-${String(run.period_month).padStart(2, "0")}-${String(calendar).padStart(2, "0")}`;

  const [{ data: employees, error: empError }, { data: structures, error: structError }] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, employee_code, employment_status, branch_id"),
      supabase.from("hr_salary_structures").select("*").eq("status", "active"),
    ]);
  if (empError) throw new AppError(mapDbError(empError));
  if (structError) throw new AppError(mapDbError(structError));

  const active = (employees ?? []).filter(
    (e) => e.employment_status === "active" && (!run.branch_id || e.branch_id === run.branch_id),
  );
  if (active.length === 0) throw new AppError("No active employees match this payroll period");

  const structureByEmployee = new Map<string, SalaryStructure>();
  for (const s of (structures ?? []) as SalaryStructure[]) {
    const existing = structureByEmployee.get(s.employee_id);
    if (!existing || s.effective_from > existing.effective_from)
      structureByEmployee.set(s.employee_id, s);
  }

  const structureIds = [...structureByEmployee.values()].map((s) => s.id);
  const [linesRes, attendanceRes, loansRes, reimbRes] = await Promise.all([
    structureIds.length
      ? supabase.from("hr_salary_structure_lines").select("*").in("structure_id", structureIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("hr_attendance_days")
      .select("employee_id, work_date, status, overtime_minutes")
      .gte("work_date", from)
      .lte("work_date", to),
    supabase.from("hr_loans").select("*").eq("status", "active"),
    supabase.from("hr_reimbursements").select("*").eq("status", "approved"),
  ]);
  if (linesRes.error) throw new AppError(mapDbError(linesRes.error));
  if (attendanceRes.error) throw new AppError(mapDbError(attendanceRes.error));
  if (loansRes.error) throw new AppError(mapDbError(loansRes.error));
  if (reimbRes.error) throw new AppError(mapDbError(reimbRes.error));

  const linesByStructure = new Map<string, SalaryStructureLine[]>();
  for (const l of (linesRes.data ?? []) as SalaryStructureLine[]) {
    const arr = linesByStructure.get(l.structure_id) ?? [];
    arr.push(l);
    linesByStructure.set(l.structure_id, arr);
  }

  const lopByEmployee = new Map<string, number>();
  const presentByEmployee = new Map<string, number>();
  const otMinutesByEmployee = new Map<string, number>();
  for (const d of attendanceRes.data ?? []) {
    if (d.status === "absent")
      lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 1);
    if (d.status === "half_day")
      lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 0.5);
    if (d.status !== "absent")
      presentByEmployee.set(d.employee_id, (presentByEmployee.get(d.employee_id) ?? 0) + 1);
    if (d.overtime_minutes)
      otMinutesByEmployee.set(
        d.employee_id,
        (otMinutesByEmployee.get(d.employee_id) ?? 0) + Number(d.overtime_minutes),
      );
  }

  const loanByEmployee = new Map<string, HrLoan>();
  for (const l of (loansRes.data ?? []) as HrLoan[])
    if (!loanByEmployee.has(l.employee_id)) loanByEmployee.set(l.employee_id, l);

  const reimbByEmployee = new Map<string, number>();
  for (const r of (reimbRes.data ?? []) as HrReimbursement[])
    reimbByEmployee.set(
      r.employee_id,
      (reimbByEmployee.get(r.employee_id) ?? 0) + Number(r.amount),
    );

  const results: PayslipResult[] = [];
  const skipped: string[] = [];

  for (const emp of active) {
    const structure = structureByEmployee.get(emp.id);
    const lines = structure ? (linesByStructure.get(structure.id) ?? []) : [];
    if (!structure || lines.length === 0) {
      skipped.push(emp.full_name ?? emp.id);
      continue;
    }
    const engineLines: StructureLine[] = lines.map((l) => ({
      component_id: l.component_id,
      label: l.label,
      kind: l.kind as "earning" | "deduction",
      monthly_amount: Number(l.monthly_amount),
      is_taxable: l.is_taxable,
      pf_applicable: l.pf_applicable,
      esi_applicable: l.esi_applicable,
      sort_order: l.sort_order,
    }));
    const loan = loanByEmployee.get(emp.id);
    results.push(
      computePayslip({
        employeeId: emp.id,
        employeeName: emp.full_name,
        employeeCode: emp.employee_code,
        lines: engineLines,
        calendarDays: calendar,
        lopDays: lopByEmployee.get(emp.id) ?? 0,
        presentDays: presentByEmployee.get(emp.id) ?? 0,
        overtimeHours: (otMinutesByEmployee.get(emp.id) ?? 0) / 60,
        loanInstallment: loan
          ? Math.min(Number(loan.installment_amount), Number(loan.outstanding))
          : 0,
        reimbursements: reimbByEmployee.get(emp.id) ?? 0,
        settings,
        remainingMonths: remainingFyMonths(run.period_month),
      }),
    );
  }

  if (results.length === 0)
    throw new AppError("No employee has an active salary structure — set one up before processing");

  // Replace any previous computation for this run.
  const { error: clearError } = await supabase.from("hr_payslips").delete().eq("run_id", runId);
  if (clearError) throw new AppError(mapDbError(clearError));

  const { data: inserted, error: insertError } = await supabase
    .from("hr_payslips")
    .insert(
      results.map((p) => ({
        run_id: runId,
        employee_id: p.employeeId,
        employee_name: p.employeeName,
        employee_code: p.employeeCode,
        payable_days: p.payableDays,
        present_days: p.presentDays,
        lop_days: p.lopDays,
        paid_leave_days: p.paidLeaveDays,
        overtime_hours: p.overtimeHours,
        overtime_amount: p.overtimeAmount,
        gross_earnings: p.grossEarnings,
        total_deductions: p.totalDeductions,
        net_pay: p.netPay,
        pf_employee: p.pfEmployee,
        pf_employer: p.pfEmployer,
        esi_employee: p.esiEmployee,
        esi_employer: p.esiEmployer,
        professional_tax: p.professionalTax,
        tds: p.tds,
        loan_deduction: p.loanDeduction,
        reimbursements: p.reimbursements,
        employer_cost: p.employerCost,
      })),
    )
    .select("id, employee_id");
  if (insertError) throw new AppError(mapDbError(insertError));

  const idByEmployee = new Map((inserted ?? []).map((r) => [r.employee_id, r.id]));
  const lineRows = results.flatMap((p) =>
    p.lines.map((l) => ({
      payslip_id: idByEmployee.get(p.employeeId)!,
      label: l.label,
      kind: l.kind,
      amount: l.amount,
      sort_order: l.sort_order,
    })),
  );
  if (lineRows.length) {
    const { error: lineError } = await supabase.from("hr_payslip_lines").insert(lineRows);
    if (lineError) throw new AppError(mapDbError(lineError));
  }

  const totals = summarizeRun(results);
  const { error: runError } = await supabase
    .from("hr_payroll_runs")
    .update({
      employee_count: totals.employeeCount,
      total_gross: totals.totalGross,
      total_deductions: totals.totalDeductions,
      total_net: totals.totalNet,
      total_employer_cost: totals.totalEmployerCost,
      processed_at: new Date().toISOString(),
      status: "pending_approval",
    })
    .eq("id", runId);
  if (runError) throw new AppError(mapDbError(runError));

  return { processed: results.length, skipped };
}

export { grossFromLines };
