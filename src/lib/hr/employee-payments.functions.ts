import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
  });
