/**
 * HR payload validation. Every write in `api.ts` parses through one of these
 * schemas so bad input fails in the client with a readable message rather
 * than as a database constraint error.
 */
import { z } from "zod";

const optionalText = z.string().trim().optional().nullable();

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  code: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  geofence_radius_m: z.number().int().min(10).max(50_000).default(200),
  is_active: z.boolean().default(true),
  notes: optionalText,
});
export type BranchInput = z.input<typeof branchSchema>;

export const shiftSchema = z.object({
  name: z.string().trim().min(1, "Shift name is required"),
  code: optionalText,
  shift_type: z.enum(["general", "night", "flexible", "rotational"]).default("general"),
  start_time: optionalText,
  end_time: optionalText,
  break_minutes: z.number().int().min(0).max(480).default(60),
  grace_minutes: z.number().int().min(0).max(180).default(10),
  early_leaving_grace_minutes: z.number().int().min(0).max(180).default(10),
  half_day_hours: z.number().min(0).max(24).default(4),
  full_day_hours: z.number().min(0).max(24).default(8),
  weekly_offs: z.array(z.number().int().min(0).max(6)).default([0]),
  overtime_enabled: z.boolean().default(false),
  overtime_after_minutes: z.number().int().min(0).max(480).default(30),
  is_active: z.boolean().default(true),
  notes: optionalText,
});
export type ShiftInput = z.input<typeof shiftSchema>;

export const holidaySchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required"),
  holiday_date: z.string().min(1, "Date is required"),
  branch_id: z.string().uuid().nullable().optional(),
  is_optional: z.boolean().default(false),
  notes: optionalText,
});
export type HolidayInput = z.input<typeof holidaySchema>;

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, "Leave type name is required"),
  code: optionalText,
  is_paid: z.boolean().default(true),
  accrual_per_year: z.number().min(0).max(365).default(0),
  carry_forward: z.boolean().default(false),
  max_carry_forward: z.number().min(0).max(365).default(0),
  requires_approval: z.boolean().default(true),
  max_consecutive_days: z.number().int().min(1).max(365).nullable().optional(),
  is_active: z.boolean().default(true),
  notes: optionalText,
});
export type LeaveTypeInput = z.input<typeof leaveTypeSchema>;

export const leaveRequestSchema = z
  .object({
    employee_id: z.string().uuid("Select an employee"),
    leave_type_id: z.string().uuid("Select a leave type"),
    from_date: z.string().min(1, "From date is required"),
    to_date: z.string().min(1, "To date is required"),
    days: z.number().min(0.5).max(365).default(1),
    is_half_day: z.boolean().default(false),
    reason: optionalText,
    manager_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.to_date >= v.from_date, {
    message: "End date cannot be before start date",
    path: ["to_date"],
  });
export type LeaveRequestInput = z.input<typeof leaveRequestSchema>;

export const punchSchema = z.object({
  employee_id: z.string().uuid(),
  direction: z.enum(["in", "out", "break_in", "break_out"]),
  source: z.enum(["biometric", "mobile", "web", "manual", "import"]).default("mobile"),
  punch_at: z.string().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  device_id: z.string().uuid().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  gps_accuracy_m: z.number().nullable().optional(),
  battery_pct: z.number().int().min(0).max(100).nullable().optional(),
  network_status: optionalText,
  device_info: optionalText,
  photo_url: optionalText,
  within_geofence: z.boolean().nullable().optional(),
  distance_m: z.number().nullable().optional(),
  reason: optionalText,
  approval_status: z
    .enum(["not_required", "pending", "approved", "rejected"])
    .default("not_required"),
});
export type PunchInput = z.input<typeof punchSchema>;
