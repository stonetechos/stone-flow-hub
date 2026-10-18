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

    // 1. Try to insert into hr_employee_payments if table exists
    let createdPaymentId: string | null = null;
    let paymentRecord: Record<string, unknown> | null = null;

    try {
      const { data: inserted, error: payErr } = await (
        supabaseAdmin.from("hr_employee_payments" as never) as unknown as {
          insert: (p: unknown) => {
            select: (c: string) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        }
      )
        .insert({
          employee_id: data.employee_id,
          payment_date: paymentDate,
          amount: amountNum,
          payment_type: data.payment_type,
          payment_method: data.payment_method,
          account_name: resolvedAccount,
          reference_no: data.reference_no?.trim() || null,
          payroll_month: payrollMonth,
          is_deducted_from_payroll: isDeducted,
          status: "paid",
          notes: data.notes?.trim() || null,
          created_by: uid,
        })
        .select("*")
        .maybeSingle();

      if (!payErr && inserted) {
        createdPaymentId = (inserted as { id: string }).id;
        paymentRecord = inserted as Record<string, unknown>;
      }
    } catch {
      // hr_employee_payments table migration not present, fallback cleanly
    }

    // 2. Insert into hr_loans (native table) to guarantee persistence and payroll integration
    const loanReason = JSON.stringify({
      source: "hr_employee_payments",
      payment_id: createdPaymentId,
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

    if (loanErr && !paymentRecord) {
      throw new Error(`Failed to save payment: ${loanErr.message}`);
    }

    const finalId =
      createdPaymentId || (loanRow as { id: string } | null)?.id || `gen-${Date.now()}`;

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

    // Cancel in hr_employee_payments if table exists
    try {
      await (
        supabaseAdmin.from("hr_employee_payments" as never) as unknown as {
          update: (u: unknown) => { eq: (c: string, v: string) => Promise<unknown> };
        }
      )
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", data.id);
    } catch {
      // Ignore
    }

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
  const seenIds = new Set<string>();

  // 1. Try hr_employee_payments
  try {
    type DynamicQuery = {
      select: (s: string) => DynamicQuery;
      order: (c: string, o?: { ascending: boolean }) => DynamicQuery;
      eq: (c: string, v: unknown) => DynamicQuery;
      then: (
        fn: (res: { data: unknown; error: unknown }) => void,
      ) => Promise<{ data: unknown; error: unknown }>;
    };

    let q = (supabaseAdmin.from("hr_employee_payments" as never) as unknown as DynamicQuery)
      .select("*")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
    if (filters.payrollMonth) q = q.eq("payroll_month", filters.payrollMonth);
    if (filters.status) q = q.eq("status", filters.status);

    const { data: rows, error } = await q;
    if (!error && Array.isArray(rows)) {
      for (const row of rows) {
        paymentsList.push(row as (typeof paymentsList)[0]);
        seenIds.add((row as { id: string }).id);
      }
    }
  } catch {
    // Table doesn't exist yet, continue
  }

  // 2. Query hr_loans using supabaseAdmin
  try {
    let lq = supabaseAdmin
      .from("hr_loans" as never)
      .select("*")
      .order("created_at" as never, { ascending: false });

    if (filters.employeeId) {
      lq = lq.eq("employee_id" as never, filters.employeeId as never);
    }

    const { data: loanRows, error: loanErr } = await lq;
    if (!loanErr && Array.isArray(loanRows)) {
      for (const l of loanRows as Array<{
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

        const linkedId = (meta.payment_id as string) || l.id;
        if (seenIds.has(linkedId)) continue;

        const pMonth =
          (meta.payroll_month as string) ||
          (l.start_month ? l.start_month.slice(0, 7) : l.created_at.slice(0, 7));

        if (filters.payrollMonth && pMonth !== filters.payrollMonth) continue;
        if (filters.status && l.status !== filters.status && filters.status !== "paid") continue;

        const paymentType =
          (meta.payment_type as
            | "advance"
            | "salary_part"
            | "bonus"
            | "incentive"
            | "loan"
            | "settlement") || (l.loan_type === "loan" ? "loan" : "advance");

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
        seenIds.add(l.id);
      }
    }
  } catch {
    // Ignore
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
    const calendarDays = new Date(year, month, 0).getDate();
    const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const toDate = `${year}-${String(month).padStart(2, "0")}-${String(calendarDays).padStart(2, "0")}`;

    // 1. Concurrent server-side fetches
    const [empRes, structRes, settingsRes, attRes] = await Promise.all([
      supabaseAdmin
        .from("employees" as never)
        .select(
          "id, full_name, employee_code, designation_id, department, phone, employment_status" as never,
        )
        .eq("employment_status" as never, "active" as never)
        .order("full_name" as never, { ascending: true }),
      supabaseAdmin
        .from("hr_salary_structures" as never)
        .select("*" as never)
        .eq("status" as never, "active" as never),
      supabaseAdmin
        .from("hr_payroll_settings" as never)
        .select("*" as never)
        .maybeSingle(),
      supabaseAdmin
        .from("hr_attendance_days" as never)
        .select("employee_id, work_date, status" as never)
        .gte("work_date" as never, fromDate as never)
        .lte("work_date" as never, toDate as never),
    ]);

    const activeEmployees = (empRes.data ?? []) as Array<{
      id: string;
      full_name: string;
      employee_code: string | null;
      designation_id: string | null;
      department: string | null;
      phone: string | null;
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

    const structureIds = [...structureByEmployee.values()].map((s) => s.id);
    let structureLines: Array<{
      structure_id: string;
      kind: "earning" | "deduction";
      monthly_amount: number;
      pf_applicable: boolean;
      esi_applicable: boolean;
      sort_order: number;
    }> = [];

    if (structureIds.length > 0) {
      try {
        const { data: linesData } = await supabaseAdmin
          .from("hr_salary_structure_lines" as never)
          .select(
            "structure_id, kind, monthly_amount, pf_applicable, esi_applicable, sort_order" as never,
          )
          .in("structure_id" as never, structureIds as never)
          .order("sort_order" as never, { ascending: true });
        if (Array.isArray(linesData)) {
          structureLines = linesData as typeof structureLines;
        }
      } catch {
        // Fallback gracefully
      }
    }

    const linesByStructure = new Map<string, typeof structureLines>();
    for (const l of structureLines) {
      const arr = linesByStructure.get(l.structure_id) ?? [];
      arr.push(l);
      linesByStructure.set(l.structure_id, arr);
    }

    // Attendance loss of pay (LOP)
    const lopByEmployee = new Map<string, number>();
    for (const d of (attRes.data as Array<{ employee_id: string; status: string }> | null) ?? []) {
      if (d.status === "absent") {
        lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 1);
      } else if (d.status === "half_day") {
        lopByEmployee.set(d.employee_id, (lopByEmployee.get(d.employee_id) ?? 0) + 0.5);
      }
    }

    // Intermediate payments & advances (from hr_employee_payments and hr_loans)
    const paymentsList = await fetchPaymentsInternal(supabaseAdmin, { payrollMonth });
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

    const settingsData = settingsRes.data as Record<string, unknown> | null;
    const pf_employee_pct = Number(settingsData?.pf_employee_pct ?? 12);
    const pf_wage_ceiling = Number(settingsData?.pf_wage_ceiling ?? 15000);
    const pf_limit_to_ceiling = Boolean(settingsData?.pf_limit_to_ceiling ?? true);
    const esi_employee_pct = Number(settingsData?.esi_employee_pct ?? 0.75);
    const esi_wage_ceiling = Number(settingsData?.esi_wage_ceiling ?? 21000);

    const balances = [];
    let totalLiability = 0;
    let totalIntermediate = 0;
    let totalRemaining = 0;
    let pendingCount = 0;
    let fullyPaidCount = 0;

    for (const emp of activeEmployees) {
      const structure = structureByEmployee.get(emp.id);
      const lines = structure ? (linesByStructure.get(structure.id) ?? []) : [];
      const empPayments = paymentsByEmployee.get(emp.id) ?? [];

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

        baseGross = Math.round(gross);
        earnedSalary = Math.round(gross * factor);

        const pfEmp = pf_limit_to_ceiling
          ? Math.min(pfWage, pf_wage_ceiling) * (pf_employee_pct / 100)
          : pfWage * (pf_employee_pct / 100);

        const esiEmp = gross <= esi_wage_ceiling ? (esiWage * esi_employee_pct) / 100 : 0;
        const pt = gross >= 10000 ? 200 : gross >= 7500 ? 175 : 0;

        statutoryDeductions = Math.round(structuredDeductions + pfEmp + esiEmp + pt);
        estimatedNet = Math.round(earnedSalary - statutoryDeductions);
      } else if (structure?.ctc_annual) {
        baseGross = Math.round(Number(structure.ctc_annual) / 12);
        earnedSalary = baseGross;
        estimatedNet = baseGross;
      }

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
        attendanceLopDays: lopByEmployee.get(emp.id) ?? 0,
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
