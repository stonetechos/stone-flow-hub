/**
 * Human Resources — shared row/enum types.
 * Sourced from the generated Supabase schema so the app can never drift from
 * the database. Domain logic lives in `attendance-engine.ts` (pure) and data
 * access in `api.ts`.
 */
import type { DbTable, DbInsert, DbEnum } from "@/lib/types";

export type HrBranch = DbTable<"hr_branches">;
export type HrShift = DbTable<"hr_shifts">;
export type HrShiftAssignment = DbTable<"hr_shift_assignments">;
export type HrHoliday = DbTable<"hr_holidays">;
export type HrDevice = DbTable<"hr_attendance_devices">;
export type HrPunch = DbTable<"hr_attendance_punches">;
export type HrAttendanceDay = DbTable<"hr_attendance_days">;
export type HrLeaveType = DbTable<"hr_leave_types">;
export type HrLeaveBalance = DbTable<"hr_leave_balances">;
export type HrLeaveRequest = DbTable<"hr_leave_requests">;

export type HrPunchInsert = DbInsert<"hr_attendance_punches">;

export type ShiftType = DbEnum<"hr_shift_type">;
export type PunchDirection = DbEnum<"hr_punch_direction">;
export type PunchSource = DbEnum<"hr_punch_source">;
export type ApprovalStatus = DbEnum<"hr_approval_status">;
export type AttendanceStatus = DbEnum<"hr_attendance_status">;
export type LeaveStatus = DbEnum<"hr_leave_status">;
export type DeviceVendor = DbEnum<"hr_device_vendor">;

export const SHIFT_TYPES: readonly ShiftType[] = [
  "general",
  "night",
  "flexible",
  "rotational",
] as const;

export const PUNCH_DIRECTIONS: readonly PunchDirection[] = [
  "in",
  "out",
  "break_in",
  "break_out",
] as const;

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "half_day",
  "holiday",
  "weekend",
  "on_leave",
  "wfh",
  "field_duty",
  "tour",
  "training",
  "comp_off",
] as const;

export const LEAVE_STATUSES: readonly LeaveStatus[] = [
  "draft",
  "pending",
  "manager_approved",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const DEVICE_VENDORS: readonly DeviceVendor[] = [
  "zkteco",
  "essl",
  "matrix",
  "other",
] as const;

/** Human labels — keep in one place so tables, badges and filters agree. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half day",
  holiday: "Holiday",
  weekend: "Weekend",
  on_leave: "On leave",
  wfh: "Work from home",
  field_duty: "Field duty",
  tour: "Tour",
  training: "Training",
  comp_off: "Comp off",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  manager_approved: "Manager approved",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const PUNCH_DIRECTION_LABEL: Record<PunchDirection, string> = {
  in: "Clock in",
  out: "Clock out",
  break_in: "Break start",
  break_out: "Break end",
};
