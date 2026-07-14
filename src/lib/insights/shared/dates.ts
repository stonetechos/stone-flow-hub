/**
 * Pure date-math helpers for insight providers — day-difference only.
 *
 * Display/relative-string formatting (e.g. "3d ago") already lives in
 * `@/lib/format` (`formatRelative`, `formatDate`) — this module
 * intentionally does not duplicate that. It only answers "how many whole
 * days" questions, which every Sales Intelligence provider needs for its
 * threshold rules.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(value: string | Date): number {
  return typeof value === "string" ? new Date(value).getTime() : value.getTime();
}

function toMsNow(now: number | Date): number {
  return typeof now === "number" ? now : now.getTime();
}

/** Whole days between `from` and `now` (now - from). Negative if `from` is in the future. */
export function daysSince(from: string | Date, now: number | Date = Date.now()): number {
  const fromMs = toMs(from);
  if (!Number.isFinite(fromMs)) return 0;
  return Math.floor((toMsNow(now) - fromMs) / DAY_MS);
}

/** Whole days between `now` and a future `to` date (to - now). Negative if already past. */
export function daysUntil(to: string | Date, now: number | Date = Date.now()): number {
  return -daysSince(to, now);
}

/** True if `value` falls on the same local calendar day as `reference`. */
export function isSameCalendarDay(value: string | Date, reference: Date = new Date()): boolean {
  const d = typeof value === "string" ? new Date(value) : value;
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

/** Local start-of-day, N days offset from `reference` (0 = today, 1 = tomorrow, -1 = yesterday). */
export function startOfDayOffset(offsetDays: number, reference: Date = new Date()): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}
