/**
 * HR data access layer. Every call goes through the browser Supabase client
 * and therefore through RLS — these helpers shape queries, they do not
 * authorize. Zod schemas guard payloads before they reach the database.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbUpdate } from "@/lib/types";
import type {
  HrAttendanceDay,
  HrBranch,
  HrHoliday,
  HrLeaveBalance,
  HrLeaveRequest,
  HrLeaveType,
  HrPunch,
  HrShift,
  HrShiftAssignment,
  LeaveStatus,
  PunchDirection,
} from "./types";
import {
  branchSchema,
  shiftSchema,
  holidaySchema,
  leaveTypeSchema,
  leaveRequestSchema,
  punchSchema,
  type BranchInput,
  type ShiftInput,
  type HolidayInput,
  type LeaveTypeInput,
  type LeaveRequestInput,
  type PunchInput,
} from "./schema";

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as T;
}

// ---------------- Branches ----------------
export async function listBranches(): Promise<HrBranch[]> {
  const { data, error } = await supabase
    .from("hr_branches")
    .select("*")
    .order("name", { ascending: true });
  return unwrap<HrBranch[]>(data, error);
}

export async function upsertBranch(input: BranchInput, id?: string): Promise<HrBranch> {
  const v = branchSchema.parse(input);
  const q = id
    ? supabase.from("hr_branches").update(v).eq("id", id).select("*").single()
    : supabase.from("hr_branches").insert(v).select("*").single();
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as HrBranch;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from("hr_branches").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ---------------- Shifts ----------------
export async function listShifts(): Promise<HrShift[]> {
  const { data, error } = await supabase
    .from("hr_shifts")
    .select("*")
    .order("name", { ascending: true });
  return unwrap<HrShift[]>(data, error);
}

export async function upsertShift(input: ShiftInput, id?: string): Promise<HrShift> {
  const v = shiftSchema.parse(input);
  const q = id
    ? supabase.from("hr_shifts").update(v).eq("id", id).select("*").single()
    : supabase.from("hr_shifts").insert(v).select("*").single();
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as HrShift;
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from("hr_shifts").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function listShiftAssignments(): Promise<HrShiftAssignment[]> {
  const { data, error } = await supabase
    .from("hr_shift_assignments")
    .select("*")
    .order("effective_from", { ascending: false })
    .limit(500);
  return unwrap<HrShiftAssignment[]>(data, error);
}

export async function assignShift(input: {
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string | null;
}): Promise<HrShiftAssignment> {
  const { data, error } = await supabase
    .from("hr_shift_assignments")
    .insert({ ...input, effective_to: input.effective_to ?? null })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as HrShiftAssignment;
}

export async function removeShiftAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("hr_shift_assignments").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ---------------- Holidays ----------------
export async function listHolidays(year?: number): Promise<HrHoliday[]> {
  let q = supabase.from("hr_holidays").select("*").order("holiday_date", { ascending: true });
  if (year) q = q.gte("holiday_date", `${year}-01-01`).lte("holiday_date", `${year}-12-31`);
  const { data, error } = await q;
  return unwrap<HrHoliday[]>(data, error);
}

export async function upsertHoliday(input: HolidayInput, id?: string): Promise<HrHoliday> {
  const v = holidaySchema.parse(input);
  const q = id
    ? supabase.from("hr_holidays").update(v).eq("id", id).select("*").single()
    : supabase.from("hr_holidays").insert(v).select("*").single();
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as HrHoliday;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from("hr_holidays").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// ---------------- Attendance ----------------
export async function listPunches(params: {
  from: string;
  to: string;
  employeeId?: string | null;
}): Promise<HrPunch[]> {
  let q = supabase
    .from("hr_attendance_punches")
    .select("*")
    .gte("punch_at", `${params.from}T00:00:00`)
    .lte("punch_at", `${params.to}T23:59:59`)
    .order("punch_at", { ascending: false })
    .limit(1000);
  if (params.employeeId) q = q.eq("employee_id", params.employeeId);
  const { data, error } = await q;
  return unwrap<HrPunch[]>(data, error);
}

export async function recordPunch(input: PunchInput): Promise<HrPunch> {
  const v = punchSchema.parse(input);
  const { data, error } = await supabase
    .from("hr_attendance_punches")
    .insert(v)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as HrPunch;
}

export async function setPunchApproval(
  id: string,
  approval_status: "approved" | "rejected",
): Promise<void> {
  const { error } = await supabase
    .from("hr_attendance_punches")
    .update({ approval_status, approved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function listAttendanceDays(params: {
  from: string;
  to: string;
  employeeId?: string | null;
}): Promise<HrAttendanceDay[]> {
  let q = supabase
    .from("hr_attendance_days")
    .select("*")
    .gte("work_date", params.from)
    .lte("work_date", params.to)
    .order("work_date", { ascending: false })
    .limit(1000);
  if (params.employeeId) q = q.eq("employee_id", params.employeeId);
  const { data, error } = await q;
  return unwrap<HrAttendanceDay[]>(data, error);
}

// ---------------- Leave ----------------
export async function listLeaveTypes(): Promise<HrLeaveType[]> {
  const { data, error } = await supabase
    .from("hr_leave_types")
    .select("*")
    .order("name", { ascending: true });
  return unwrap<HrLeaveType[]>(data, error);
}

export async function upsertLeaveType(input: LeaveTypeInput, id?: string): Promise<HrLeaveType> {
  const v = leaveTypeSchema.parse(input);
  const q = id
    ? supabase.from("hr_leave_types").update(v).eq("id", id).select("*").single()
    : supabase.from("hr_leave_types").insert(v).select("*").single();
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as HrLeaveType;
}

export async function listLeaveRequests(params?: {
  status?: LeaveStatus | "all";
  employeeId?: string | null;
}): Promise<HrLeaveRequest[]> {
  let q = supabase
    .from("hr_leave_requests")
    .select("*")
    .order("from_date", { ascending: false })
    .limit(500);
  if (params?.status && params.status !== "all") q = q.eq("status", params.status);
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  const { data, error } = await q;
  return unwrap<HrLeaveRequest[]>(data, error);
}

export async function createLeaveRequest(input: LeaveRequestInput): Promise<HrLeaveRequest> {
  const v = leaveRequestSchema.parse(input);
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .insert({ ...v, status: "pending" })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as HrLeaveRequest;
}

export async function setLeaveStatus(
  id: string,
  status: LeaveStatus,
  rejection_reason?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const patch: DbUpdate<"hr_leave_requests"> = {
    status,
    ...(status === "manager_approved" ? { manager_action_at: now } : {}),
    ...(status === "approved" || status === "rejected" ? { hr_action_at: now } : {}),
    ...(rejection_reason ? { rejection_reason } : {}),
  };
  const { error } = await supabase.from("hr_leave_requests").update(patch).eq("id", id);

  if (error) throw new AppError(mapDbError(error));
}

export async function listLeaveBalances(year: number): Promise<HrLeaveBalance[]> {
  const { data, error } = await supabase
    .from("hr_leave_balances")
    .select("*")
    .eq("year", year)
    .limit(1000);
  return unwrap<HrLeaveBalance[]>(data, error);
}

/** Resolves the employee row linked to the signed-in user, if any. */
export async function getMyEmployee(userId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export type { PunchDirection };
