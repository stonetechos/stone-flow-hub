import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recordEmployeePaymentInputSchema = z.object({
  employee_id: z.string().uuid("Invalid employee ID"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  payment_type: z.enum(["advance", "salary_part", "bonus", "incentive", "loan", "settlement"]),
  payment_method: z.string().min(1, "Payment method is required"),
  account_name: z.string().nullable().optional(),
  reference_no: z.string().nullable().optional(),
  payroll_month: z.string().nullable().optional(),
  is_deducted_from_payroll: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export type RecordEmployeePaymentInput = z.infer<typeof recordEmployeePaymentInputSchema>;

export const recordEmployeePaymentServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => recordEmployeePaymentInputSchema.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    const paymentDate = data.payment_date.trim();
    const payrollMonth = data.payroll_month?.trim() || paymentDate.slice(0, 7);
    const isDeducted = data.is_deducted_from_payroll ?? true;
    const resolvedAccount = data.account_name?.trim() || "Cash";
    const amountNum = Math.round(data.amount);

    // Save directly to hr_loans to guarantee persistence and payroll integration
    const loanReason = JSON.stringify({
      source: "hr_employee_payments",
      payment_type: data.payment_type,
      method: data.payment_method,
      account: resolvedAccount,
      ref: data.reference_no?.trim() || null,
      date: paymentDate,
      payroll_month: payrollMonth,
      deduct: isDeducted,
      notes: data.notes?.trim() || null,
    });

    const loanPayload = {
      employee_id: data.employee_id,
      loan_type: data.payment_type === "loan" ? "loan" : "advance",
      principal: amountNum,
      installment_amount: isDeducted ? amountNum : 0,
      installments_total: 1,
      installments_paid: 0,
      outstanding: isDeducted ? amountNum : 0,
      start_month: `${payrollMonth}-01`,
      status: "active",
      reason: loanReason,
      approved_by: uid,
    };

    const { data: loanRow, error: loanErr } = await supabaseAdmin
      .from("hr_loans" as never)
      .insert(loanPayload as never)
      .select("*")
      .single();

    if (loanErr) {
      throw new Error(`Failed to save payment: ${loanErr.message}`);
    }

    const finalId = (loanRow as { id: string } | null)?.id || `gen-${Date.now()}`;

    return {
      id: finalId,
      employee_id: data.employee_id,
      payment_date: paymentDate,
      amount: amountNum,
      payment_type: data.payment_type,
      payment_method: data.payment_method,
      account_name: resolvedAccount,
      reference_no: data.reference_no?.trim() || null,
      payroll_month: payrollMonth,
      is_deducted_from_payroll: isDeducted,
      status: "paid" as const,
      notes: data.notes?.trim() || null,
      created_at:
        (loanRow as { created_at?: string } | null)?.created_at || new Date().toISOString(),
    };
  });

export const cancelEmployeePaymentServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Close in hr_loans
    await supabaseAdmin
      .from("hr_loans" as never)
      .update({ status: "closed", updated_at: new Date().toISOString() } as never)
      .eq("id" as never, data.id as never);

    return { success: true };
  });

async function fetchPaymentsInternal(
  supabaseAdmin: SupabaseClient,
  filters: { employeeId?: string; payrollMonth?: string; status?: string },
) {
  const paymentsList: Array<{
    id: string;
    employee_id: string;
    payment_date: string;
    amount: number;
    payment_type: "advance" | "salary_part" | "bonus" | "incentive" | "loan" | "settlement";
    payment_method: string;
    account_name: string;
    reference_no: string | null;
    payroll_month: string;
    is_deducted_from_payroll: boolean;
    status: "pending" | "paid" | "cancelled";
    notes: string | null;
    created_at: string;
    updated_at?: string;
  }> = [];

  let lq = supabaseAdmin
    .from("hr_loans" as never)
    .select("*" as never)
    .order("created_at" as never, { ascending: false });

  if (filters.employeeId) {
    lq = lq.eq("employee_id" as never, filters.employeeId as never);
  }

  const { data: loanRows, error: loanErr } = await lq;
  if (!loanErr && Array.isArray(loanRows)) {
    for (const l of loanRows as unknown as Array<{
      id: string;
      employee_id: string;
      loan_type: string;
      principal: number;
      start_month?: string | null;
      status: string;
      reason?: string | null;
      created_at: string;
      updated_at?: string;
    }>) {
      let meta: Record<string, unknown> = {};
      if (l.reason && typeof l.reason === "string" && l.reason.startsWith("{")) {
        try {
          meta = JSON.parse(l.reason);
        } catch {
          meta = {};
        }
      }

      const pMonth =
        (meta.payroll_month as string) ||
        (l.start_month ? l.start_month.slice(0, 7) : l.created_at.slice(0, 7));

      if (filters.payrollMonth && pMonth !== filters.payrollMonth) continue;
      if (filters.status && l.status !== filters.status && filters.status !== "paid") continue;

      const paymentType =
        (meta.payment_type as
          "advance" | "salary_part" | "bonus" | "incentive" | "loan" | "settlement") ||
        (l.loan_type === "loan" ? "loan" : "advance");

      const paymentMethod = (meta.method as string) || "cash";
      const accountName = (meta.account as string) || "Cash";

      paymentsList.push({
        id: l.id,
        employee_id: l.employee_id,
        payment_date: (meta.date as string) || l.created_at.slice(0, 10),
        amount: Number(l.principal),
        payment_type: paymentType,
        payment_method: paymentMethod,
        account_name: accountName,
        reference_no: (meta.ref as string) || null,
        payroll_month: pMonth,
        is_deducted_from_payroll: meta.deduct !== false,
        status: l.status === "closed" ? "cancelled" : "paid",
        notes: (meta.notes as string) || (!l.reason?.startsWith("{") ? l.reason : null) || null,
        created_at: l.created_at,
        updated_at: l.updated_at,
      });
    }
  }

  return paymentsList.sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
  );
}

export const listEmployeePaymentsServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        employeeId: z.string().uuid().optional(),
        payrollMonth: z.string().optional(),
        status: z.string().optional(),
      })
      .optional()
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const filters = data || {};
    return fetchPaymentsInternal(supabaseAdmin, filters);
  });

export const getCompanySalaryBalancesServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        payrollMonth: z.string().optional(),
      })
      .optional()
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payrollMonth = data?.payrollMonth || new Date().toISOString().slice(0, 7);
    const [yearStr, monthNumStr] = payrollMonth.split("-");
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthNumStr) || new Date().getMonth() + 1;

    // 1. Concurrent server-side fetches — 3 fast indexed queries executed in parallel
    const [empRes, loanRes, structRes] = await Promise.all([
      supabaseAdmin
        .from("employees" as never)
        .select(
          "id, full_name, employee_code, designation_id, department, phone, employment_status, salary_ctc" as never,
        )
        .eq("employment_status" as never, "active" as never)
        .order("full_name" as never, { ascending: true }),
      supabaseAdmin
        .from("hr_loans" as never)
        .select("*" as never)
        .order("created_at" as never, { ascending: false }),
      supabaseAdmin
        .from("hr_salary_structures" as never)
        .select("id, employee_id, effective_from, ctc_annual, status" as never)
        .eq("status" as never, "active" as never),
    ]);

    const activeEmployees = (empRes.data ?? []) as Array<{
      id: string;
      full_name: string;
      employee_code: string | null;
      designation_id: string | null;
      department: string | null;
      phone: string | null;
      salary_ctc?: number | null;
    }>;

    const rawStructures = (structRes.data ?? []) as Array<{
      id: string;
      employee_id: string;
      effective_from: string;
      ctc_annual?: number | null;
      status: string;
    }>;

    const structureByEmployee = new Map<string, (typeof rawStructures)[0]>();
    for (const s of rawStructures) {
      const existing = structureByEmployee.get(s.employee_id);
      if (!existing || s.effective_from > existing.effective_from) {
        structureByEmployee.set(s.employee_id, s);
      }
    }

    // Process loans / payments for this month in memory
    const paymentsList: Array<{
      id: string;
      employee_id: string;
      payment_date: string;
      amount: number;
      payment_type: "advance" | "salary_part" | "bonus" | "incentive" | "loan" | "settlement";
      payment_method: string;
      account_name: string;
      reference_no: string | null;
      payroll_month: string;
      is_deducted_from_payroll: boolean;
      status: "pending" | "paid" | "cancelled";
      notes: string | null;
      created_at: string;
    }> = [];

    const loanRows = (loanRes.data ?? []) as unknown as Array<{
      id: string;
      employee_id: string;
      loan_type: string;
      principal: number;
      start_month?: string | null;
      status: string;
      reason?: string | null;
      created_at: string;
    }>;

    for (const l of loanRows) {
      let meta: Record<string, unknown> = {};
      if (l.reason && typeof l.reason === "string" && l.reason.startsWith("{")) {
        try {
          meta = JSON.parse(l.reason);
        } catch {
          meta = {};
        }
      }

      const pMonth =
        (meta.payroll_month as string) ||
        (l.start_month ? l.start_month.slice(0, 7) : l.created_at.slice(0, 7));

      if (pMonth !== payrollMonth) continue;

      const paymentType =
        (meta.payment_type as
          "advance" | "salary_part" | "bonus" | "incentive" | "loan" | "settlement") ||
        (l.loan_type === "loan" ? "loan" : "advance");

      const paymentMethod = (meta.method as string) || "cash";
      const accountName = (meta.account as string) || "Cash";

      paymentsList.push({
        id: l.id,
        employee_id: l.employee_id,
        payment_date: (meta.date as string) || l.created_at.slice(0, 10),
        amount: Number(l.principal),
        payment_type: paymentType,
        payment_method: paymentMethod,
        account_name: accountName,
        reference_no: (meta.ref as string) || null,
        payroll_month: pMonth,
        is_deducted_from_payroll: meta.deduct !== false,
        status: l.status === "closed" ? "cancelled" : "paid",
        notes: (meta.notes as string) || (!l.reason?.startsWith("{") ? l.reason : null) || null,
        created_at: l.created_at,
      });
    }

    const paymentsByEmployee = new Map<string, typeof paymentsList>();
    const byPaymentMethod: Record<string, number> = {};

    for (const p of paymentsList) {
      if (p.status === "cancelled") continue;
      const arr = paymentsByEmployee.get(p.employee_id) ?? [];
      arr.push(p);
      paymentsByEmployee.set(p.employee_id, arr);

      const mKey = p.account_name || p.payment_method || "Other";
      byPaymentMethod[mKey] = (byPaymentMethod[mKey] ?? 0) + Number(p.amount);
    }

    const balances = [];
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

      let status = "pending_full";
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
        status: status as "pending_full" | "partially_paid" | "fully_paid" | "advance_excess",
        payments: empPayments,
      });
    }

    const dDate = new Date(year, month - 1, 1);
    const payrollMonthLabel = dDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return {
      payrollMonth,
      payrollMonthLabel,
      totalActiveEmployees: activeEmployees.length,
      totalMonthlySalaryLiability: totalLiability,
      totalIntermediatePaymentsPaid: totalIntermediate,
      totalSalaryRemainingToPay: totalRemaining,
      employeesPendingCount: pendingCount,
      employeesFullyPaidCount: fullyPaidCount,
      byPaymentMethod,
      balances,
    };
  });
