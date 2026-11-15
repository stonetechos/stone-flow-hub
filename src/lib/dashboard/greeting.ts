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

export const HINDI_NOCTURNAL_QUIPS = [
  "आधी रात को मार्बल तराश रहे हैं? ग्रेनाइट भी गहरी नींद में है! 🪨💤",
  "देर रात खदान की शिफ्ट? स्टोनमैन आपके इस अटूट परिश्रम को सलाम करता है! 🫡",
  "मान्यता है कि पत्थर के सबसे बेहतरीन फैसले आधी रात के बाद होते हैं। 🌙✨",
  "पत्थर कभी नहीं सोता, लेकिन इंसानों को तो सोना चाहिए! 😴🪨",
  "श्शश... सीएनसी मशीनें सपने देख रही हैं। आज रात क्या तराश रहे हैं? 🏗️",
  "सोने जाएं या स्टोन यार्ड फतह करें — दोनों में स्टोनमैन आपके साथ है! 🦉🪨",
] as const;

export const GUJARATI_NOCTURNAL_QUIPS = [
  "અડધી રાત્રે માર્બલ ઘડી રહ્યા છો? ગ્રેનાઇટ પણ ઘસઘસાટ ઊંઘે છે! 🪨💤",
  "મોડી રાતની ખાણ શિફ્ટ? સ્ટોનમેન તમારી આ અથાક મહેનતને સલામ કરે છે! 🫡",
  "કહેવાય છે કે પથ્થરના શ્રેષ્ઠ નિર્ણયો અડધી રાત પછી જ લેવાય છે. 🌙✨",
  "પથ્થર ક્યારેય ઊંઘતો નથી, પણ માણસોએ તો ઊંઘવું જોઈએ! 😴🪨",
  "શાંતિ... સીએનસી મશીનો સપના જોઈ રહ્યા છે. આજે રાત્રે શું ઘડાઈ રહ્યું છે? 🏗️",
  "ઊંઘવા જાઓ કે સ્ટોન યાર્ડ સર કરો — બંનેમાં સ્ટોનમેન તમારી સાથે છે! 🦉🪨",
] as const;

/**
 * Returns a funny nocturnal quip that rotates deterministically with day & hour.
 */
export function getNocturnalQuip(d: Date = new Date(), lang: string = "en"): string {
  const index = (d.getDate() + d.getHours()) % NOCTURNAL_QUIPS.length;
  if (lang.startsWith("hi")) {
    return HINDI_NOCTURNAL_QUIPS[index]!;
  }
  if (lang.startsWith("gu")) {
    return GUJARATI_NOCTURNAL_QUIPS[index]!;
  }
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
