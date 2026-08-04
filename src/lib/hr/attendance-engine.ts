/**
 * Attendance engine — pure, deterministic functions.
 *
 * No Supabase, no React: everything here is a function of its inputs so the
 * same rules can run in the browser (live preview of today's card), on the
 * server (nightly close-out) and in tests. Biometric, mobile and manual
 * punches all flow through the same reducer, which is what keeps a future
 * ZKTeco/eSSL connector from needing its own copy of the rules.
 */
import type { AttendanceStatus, HrPunch, HrShift, PunchDirection } from "./types";

const EARTH_RADIUS_M = 6_371_000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in metres between two coordinates. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeofenceResult {
  within: boolean;
  distanceM: number | null;
  /** True when the branch has no coordinates configured — punch is allowed. */
  unconfigured: boolean;
}

/**
 * Evaluates a punch location against a branch geofence. A branch without
 * coordinates is treated as "no fence", never as a blocked punch, so adding a
 * branch cannot silently lock its team out of attendance.
 */
export function evaluateGeofence(
  point: LatLng | null,
  branch: { latitude: number | null; longitude: number | null; geofence_radius_m: number } | null,
): GeofenceResult {
  if (!branch || branch.latitude === null || branch.longitude === null) {
    return { within: true, distanceM: null, unconfigured: true };
  }
  if (!point) return { within: false, distanceM: null, unconfigured: false };
  const d = distanceMeters(point, {
    latitude: Number(branch.latitude),
    longitude: Number(branch.longitude),
  });
  return {
    within: d <= Number(branch.geofence_radius_m || 0),
    distanceM: Math.round(d * 100) / 100,
    unconfigured: false,
  };
}

/** Minutes between two ISO timestamps, floored at 0. */
export function minutesBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms <= 0 ? 0 : Math.round(ms / 60_000);
}

export type PunchLike = Pick<HrPunch, "punch_at" | "direction"> & { is_duplicate?: boolean };

/**
 * Two punches in the same direction within this window are treated as the
 * same event (double tap on mobile, device retry on a late sync).
 */
export const DUPLICATE_WINDOW_MINUTES = 2;

/** Drops duplicate/near-duplicate punches and returns them in time order. */
export function dedupePunches<T extends PunchLike>(punches: readonly T[]): T[] {
  const sorted = [...punches]
    .filter((p) => !p.is_duplicate)
    .sort((a, b) => new Date(a.punch_at).getTime() - new Date(b.punch_at).getTime());
  const out: T[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.direction === p.direction &&
      minutesBetween(prev.punch_at, p.punch_at) <= DUPLICATE_WINDOW_MINUTES
    ) {
      continue;
    }
    out.push(p);
  }
  return out;
}

export interface DaySummary {
  firstIn: string | null;
  lastOut: string | null;
  workingMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeavingMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
}

export type ShiftRules = Pick<
  HrShift,
  | "start_time"
  | "end_time"
  | "grace_minutes"
  | "early_leaving_grace_minutes"
  | "half_day_hours"
  | "full_day_hours"
  | "overtime_enabled"
  | "overtime_after_minutes"
  | "weekly_offs"
>;

export interface DayContext {
  /** ISO date, e.g. "2026-08-04". */
  workDate: string;
  shift: ShiftRules | null;
  isHoliday?: boolean;
  /** Set when an approved leave covers the date. */
  leaveStatus?: Extract<AttendanceStatus, "on_leave" | "wfh" | "field_duty" | "tour" | "training" | "comp_off">;
}

function shiftInstant(workDate: string, time: string | null): number | null {
  if (!time) return null;
  return new Date(`${workDate}T${time}`).getTime();
}

function directionIsWork(d: PunchDirection): boolean {
  return d === "in" || d === "out";
}

/**
 * Reduces a day's punches into the daily attendance row. Break pairs are
 * subtracted from gross time; late/early/overtime come from the shift rules.
 */
export function summarizeDay(punches: readonly PunchLike[], ctx: DayContext): DaySummary {
  const ordered = dedupePunches(punches);
  const work = ordered.filter((p) => directionIsWork(p.direction));
  const firstIn = work.find((p) => p.direction === "in")?.punch_at ?? null;
  const lastOut = [...work].reverse().find((p) => p.direction === "out")?.punch_at ?? null;

  // Gross paired in→out time.
  let gross = 0;
  let openIn: string | null = null;
  for (const p of work) {
    if (p.direction === "in") openIn = openIn ?? p.punch_at;
    else if (openIn) {
      gross += minutesBetween(openIn, p.punch_at);
      openIn = null;
    }
  }

  // Break pairs.
  let breakMinutes = 0;
  let openBreak: string | null = null;
  for (const p of ordered) {
    if (p.direction === "break_in") openBreak = openBreak ?? p.punch_at;
    else if (p.direction === "break_out" && openBreak) {
      breakMinutes += minutesBetween(openBreak, p.punch_at);
      openBreak = null;
    }
  }

  const workingMinutes = Math.max(0, gross - breakMinutes);
  const shift = ctx.shift;

  let lateMinutes = 0;
  let earlyLeavingMinutes = 0;
  if (shift && firstIn) {
    const start = shiftInstant(ctx.workDate, shift.start_time);
    if (start !== null) {
      const diff = Math.round((new Date(firstIn).getTime() - start) / 60_000);
      lateMinutes = Math.max(0, diff - (shift.grace_minutes ?? 0));
    }
  }
  if (shift && lastOut) {
    const end = shiftInstant(ctx.workDate, shift.end_time);
    if (end !== null) {
      const diff = Math.round((end - new Date(lastOut).getTime()) / 60_000);
      earlyLeavingMinutes = Math.max(0, diff - (shift.early_leaving_grace_minutes ?? 0));
    }
  }

  let overtimeMinutes = 0;
  if (shift?.overtime_enabled) {
    const fullDay = Number(shift.full_day_hours ?? 8) * 60;
    const excess = workingMinutes - fullDay;
    if (excess >= (shift.overtime_after_minutes ?? 0)) overtimeMinutes = excess;
  }

  const status = deriveStatus({ workingMinutes, lateMinutes, ctx });

  return {
    firstIn,
    lastOut,
    workingMinutes,
    breakMinutes,
    lateMinutes,
    earlyLeavingMinutes,
    overtimeMinutes,
    status,
  };
}

function deriveStatus(input: {
  workingMinutes: number;
  lateMinutes: number;
  ctx: DayContext;
}): AttendanceStatus {
  const { ctx, workingMinutes, lateMinutes } = input;
  if (ctx.leaveStatus) return ctx.leaveStatus;
  if (ctx.isHoliday) return "holiday";
  if (isWeeklyOff(ctx.workDate, ctx.shift?.weekly_offs ?? null)) return "weekend";
  if (workingMinutes <= 0) return "absent";
  const halfDay = Number(ctx.shift?.half_day_hours ?? 4) * 60;
  const fullDay = Number(ctx.shift?.full_day_hours ?? 8) * 60;
  if (workingMinutes < halfDay) return "absent";
  if (workingMinutes < fullDay) return "half_day";
  return lateMinutes > 0 ? "late" : "present";
}

/** `weekly_offs` holds JS day numbers (0 = Sunday). */
export function isWeeklyOff(workDate: string, weeklyOffs: number[] | null): boolean {
  if (!weeklyOffs || weeklyOffs.length === 0) return false;
  const day = new Date(`${workDate}T00:00:00`).getDay();
  return weeklyOffs.includes(day);
}

/** "7h 45m" — used everywhere hours are rendered so the format never drifts. */
export function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0h 00m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Next expected action for the mobile clock card. */
export function nextDirection(punches: readonly PunchLike[]): PunchDirection {
  const ordered = dedupePunches(punches);
  const last = ordered[ordered.length - 1];
  if (!last) return "in";
  switch (last.direction) {
    case "in":
      return "out";
    case "out":
      return "in";
    case "break_in":
      return "break_out";
    case "break_out":
      return "out";
  }
}
