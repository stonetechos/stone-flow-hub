/**
 * Attendance engine tests — the rules that payroll will eventually depend on
 * are pure functions, so they are verified here rather than through the UI.
 */
import { describe, expect, it } from "bun:test";
import {
  dedupePunches,
  distanceMeters,
  evaluateGeofence,
  formatMinutes,
  isWeeklyOff,
  minutesBetween,
  nextDirection,
  summarizeDay,
  type ShiftRules,
} from "@/lib/hr/attendance-engine";

const DATE = "2026-08-04"; // a Tuesday

const shift: ShiftRules = {
  start_time: "09:00:00",
  end_time: "18:00:00",
  grace_minutes: 10,
  early_leaving_grace_minutes: 10,
  half_day_hours: 4,
  full_day_hours: 8,
  overtime_enabled: true,
  overtime_after_minutes: 30,
  weekly_offs: [0],
};

const at = (t: string) => `${DATE}T${t}`;

describe("geofence", () => {
  it("measures distance between two points", () => {
    const d = distanceMeters(
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9816, longitude: 77.5946 },
    );
    expect(Math.round(d)).toBeGreaterThan(1000);
    expect(Math.round(d)).toBeLessThan(1200);
  });

  it("treats a branch without coordinates as unfenced", () => {
    const r = evaluateGeofence(
      { latitude: 1, longitude: 1 },
      { latitude: null, longitude: null, geofence_radius_m: 100 },
    );
    expect(r.within).toBe(true);
    expect(r.unconfigured).toBe(true);
  });

  it("flags a punch outside the radius", () => {
    const branch = { latitude: 12.9716, longitude: 77.5946, geofence_radius_m: 200 };
    expect(evaluateGeofence({ latitude: 12.9717, longitude: 77.5947 }, branch).within).toBe(true);
    expect(evaluateGeofence({ latitude: 12.99, longitude: 77.5946 }, branch).within).toBe(false);
  });

  it("blocks a punch with no location when a fence exists", () => {
    const r = evaluateGeofence(null, {
      latitude: 12.9,
      longitude: 77.5,
      geofence_radius_m: 100,
    });
    expect(r.within).toBe(false);
  });
});

describe("punch normalisation", () => {
  it("drops duplicate punches inside the window", () => {
    const out = dedupePunches([
      { punch_at: at("09:00:00"), direction: "in" },
      { punch_at: at("09:01:00"), direction: "in" },
      { punch_at: at("18:00:00"), direction: "out" },
    ]);
    expect(out).toHaveLength(2);
  });

  it("keeps repeated punches outside the window", () => {
    const out = dedupePunches([
      { punch_at: at("09:00:00"), direction: "in" },
      { punch_at: at("09:30:00"), direction: "in" },
    ]);
    expect(out).toHaveLength(2);
  });

  it("suggests the next expected action", () => {
    expect(nextDirection([])).toBe("in");
    expect(nextDirection([{ punch_at: at("09:00:00"), direction: "in" }])).toBe("out");
    expect(nextDirection([{ punch_at: at("13:00:00"), direction: "break_in" }])).toBe("break_out");
  });
});

describe("day summary", () => {
  it("computes a clean full day as present", () => {
    const s = summarizeDay(
      [
        { punch_at: at("09:00:00"), direction: "in" },
        { punch_at: at("13:00:00"), direction: "break_in" },
        { punch_at: at("13:30:00"), direction: "break_out" },
        { punch_at: at("18:00:00"), direction: "out" },
      ],
      { workDate: DATE, shift },
    );
    expect(s.workingMinutes).toBe(510);
    expect(s.breakMinutes).toBe(30);
    expect(s.lateMinutes).toBe(0);
    expect(s.status).toBe("present");
  });

  it("marks late arrivals beyond the grace period", () => {
    const s = summarizeDay(
      [
        { punch_at: at("09:25:00"), direction: "in" },
        { punch_at: at("18:00:00"), direction: "out" },
      ],
      { workDate: DATE, shift },
    );
    expect(s.lateMinutes).toBe(15);
    expect(s.status).toBe("late");
  });

  it("computes overtime only past the threshold", () => {
    const s = summarizeDay(
      [
        { punch_at: at("09:00:00"), direction: "in" },
        { punch_at: at("19:00:00"), direction: "out" },
      ],
      { workDate: DATE, shift },
    );
    expect(s.overtimeMinutes).toBe(120);
  });

  it("records early leaving", () => {
    const s = summarizeDay(
      [
        { punch_at: at("09:00:00"), direction: "in" },
        { punch_at: at("17:00:00"), direction: "out" },
      ],
      { workDate: DATE, shift },
    );
    expect(s.earlyLeavingMinutes).toBe(50);
    // 8h worked still clears the full-day bar; only the shift end was missed.
    expect(s.status).toBe("present");
  });

  it("treats no punches as absent", () => {
    expect(summarizeDay([], { workDate: DATE, shift }).status).toBe("absent");
  });

  it("prefers holiday and leave context over punch data", () => {
    expect(summarizeDay([], { workDate: DATE, shift, isHoliday: true }).status).toBe("holiday");
    expect(summarizeDay([], { workDate: DATE, shift, leaveStatus: "on_leave" }).status).toBe(
      "on_leave",
    );
  });

  it("marks a weekly off day as weekend", () => {
    const sunday = "2026-08-02";
    expect(summarizeDay([], { workDate: sunday, shift }).status).toBe("weekend");
    expect(isWeeklyOff(sunday, [0])).toBe(true);
  });
});

describe("helpers", () => {
  it("floors negative durations at zero", () => {
    expect(minutesBetween(at("10:00:00"), at("09:00:00"))).toBe(0);
  });

  it("formats minutes as hours", () => {
    expect(formatMinutes(510)).toBe("8h 30m");
    expect(formatMinutes(0)).toBe("0h 00m");
  });
});
