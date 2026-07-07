/**
 * Customer Payment Schedules — the contractual milestone plan created when an
 * estimate is approved. Reused by Customer Payment Centre, Payment Dashboard,
 * Reminder Automation, and AI Collection Assistant.
 *
 * Zero schema duplication — everything lives on `customer_payment_schedules`
 * with lookups via the `customer_payment_dashboard` view.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface CustomerPaymentScheduleRow {
  id: string;
  customer_id: string;
  project_id: string | null;
  estimate_id: string | null;
  milestone_no: number;
  label: string;
  pct: number;
  amount: number;
  due_date: string | null;
  status: "pending" | "partial" | "paid" | "cancelled";
  paid_amount: number;
  last_reminder_stage: string | null;
  last_reminder_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentScheduleDashboardRow extends CustomerPaymentScheduleRow {
  customer_name: string | null;
  customer_code: string | null;
  project_name: string | null;
  estimate_no: string | null;
  balance_due: number;
  days_to_due: number | null;
  bucket: "paid" | "unscheduled" | "overdue" | "due_today" | "due_week" | "upcoming";
}

export type ScheduleMilestone = {
  label: string;
  pct: number;
  due_offset_days: number;
};

/** Approve estimate + materialise (or override) schedule. */
export async function approveEstimate(
  estimateId: string,
  override?: ScheduleMilestone[] | null,
): Promise<CustomerPaymentScheduleRow[]> {
  const { data, error } = await supabase.rpc(
    "approve_estimate" as never,
    {
      _estimate_id: estimateId,
      _override_schedule: (override ?? null) as never,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as CustomerPaymentScheduleRow[];
}

/** List schedule rows for an estimate / project / customer. */
export async function listSchedulesForEstimate(
  estimateId: string,
): Promise<CustomerPaymentScheduleRow[]> {
  const { data, error } = await supabase
    .from("customer_payment_schedules" as never)
    .select("*")
    .eq("estimate_id" as never, estimateId as never)
    .order("milestone_no", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as CustomerPaymentScheduleRow[];
}

export async function listSchedulesForCustomer(
  customerId: string,
): Promise<PaymentScheduleDashboardRow[]> {
  const { data, error } = await supabase
    .from("customer_payment_dashboard" as never)
    .select("*")
    .eq("customer_id" as never, customerId as never)
    .order("due_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PaymentScheduleDashboardRow[];
}

export async function listSchedulesForProject(
  projectId: string,
): Promise<PaymentScheduleDashboardRow[]> {
  const { data, error } = await supabase
    .from("customer_payment_dashboard" as never)
    .select("*")
    .eq("project_id" as never, projectId as never)
    .order("due_date", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PaymentScheduleDashboardRow[];
}

/** Full dashboard — one row per outstanding milestone across all customers. */
export async function listPaymentDashboard(): Promise<PaymentScheduleDashboardRow[]> {
  const { data, error } = await supabase
    .from("customer_payment_dashboard" as never)
    .select("*")
    .neq("status", "paid")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as PaymentScheduleDashboardRow[];
}

export async function recordSchedulePayment(
  scheduleId: string,
  amount: number,
  receiptNo?: string,
): Promise<CustomerPaymentScheduleRow> {
  const { data, error } = await supabase.rpc(
    "record_schedule_payment" as never,
    {
      _schedule_id: scheduleId,
      _amount: amount,
      _receipt_no: receiptNo ?? null,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CustomerPaymentScheduleRow;
}

/** Update a single milestone row (manual negotiation on due-date / amount). */
export async function updateSchedule(
  id: string,
  patch: Partial<
    Pick<CustomerPaymentScheduleRow, "due_date" | "amount" | "label" | "notes" | "status">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("customer_payment_schedules" as never)
    .update(patch as never)
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}

/** Run reminder generator on demand (cron calls the same fn). */
export async function generateRemindersNow(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_customer_payment_reminders" as never);
  if (error) throw new AppError(mapDbError(error));
  return Number(data ?? 0);
}
