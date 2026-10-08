import type { TFunction } from "i18next";

export const NOCTURNAL_QUIPS = [
  "Burning the midnight marble? Even the granite is fast asleep! 🪨💤",
  "Late-night quarry shift? StoneMan salutes your sleepless grind! 🫡",
  "Legend says the finest stone decisions happen past midnight. 🌙✨",
  "Stone never sleeps, but humans are technically supposed to! 😴🪨",
  "Shhh... the CNC machines are dreaming. What are you crafting tonight? 🏗️",
  "Go to bed or conquer the stone yard — either way, StoneMan's got your back! 🦉🪨",
] as const;

/**
 * Returns true if the given hour falls in the nocturnal window (12:00 AM to 03:59:59 AM).
 */
export function isNocturnalHour(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h >= 0 && h < 4;
}

/**
 * Returns a funny nocturnal quip that rotates deterministically with day & hour.
 */
export function getNocturnalQuip(d: Date = new Date()): string {
  const index = (d.getDate() + d.getHours()) % NOCTURNAL_QUIPS.length;
  return NOCTURNAL_QUIPS[index]!;
}

/**
 * Returns the appropriate greeting string based on the time of day:
 * - 12:00 AM to 03:59 AM: "Yo, Nocturnal!!"
 * - 04:00 AM to 11:59 AM: "Good morning"
 * - 12:00 PM to 04:59 PM: "Good afternoon"
 * - 05:00 PM to 11:59 PM: "Good evening"
 */
export function greetingFor(
  d: Date,
  t: TFunction | ((key: string, defaultValue: string) => string) = (_: string, def: string) => def,
): string {
  const h = d.getHours();
  if (h >= 0 && h < 4) return t("dashboard.greeting.nocturnal", "Yo, Nocturnal!!");
  if (h < 12) return t("dashboard.greeting.morning", "Good morning");
  if (h < 17) return t("dashboard.greeting.afternoon", "Good afternoon");
  return t("dashboard.greeting.evening", "Good evening");
}
