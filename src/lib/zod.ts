/** Zod helpers shared across domain schemas. Trim, normalize, and treat empty as nullable. */
import { z } from "zod";

export const zTrimmed = z.string().trim();
export const zRequired = (label: string) => zTrimmed.min(1, `${label} is required`);

/** Empty string becomes null — matches what most DB columns want. */
export const zOptional = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().nullable().optional(),
  );

/** Mobile: supports 10-digit Indian numbers as well as international numbers with country codes (+E.164). */
export const zMobile = zTrimmed
  .min(7, "Enter a valid mobile number")
  .max(25, "Mobile number is too long")
  .regex(/^[+\d\s-]+$/, "Use digits only");

export const zOptionalMobile = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .min(7, "Enter a valid mobile number")
    .max(25, "Mobile number is too long")
    .regex(/^[+\d\s-]+$/, "Use digits only")
    .nullable()
    .optional(),
);

export const zEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().email("Enter a valid email").nullable().optional(),
);

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (val: unknown): val is string =>
  typeof val === "string" && UUID_REGEX.test(val.trim());

export const zUuid = z.string().uuid();

/**
 * Optional UUID validator: empty strings, null, undefined, or non-UUID catalog slugs
 * (e.g. "sp_stone_veneer") safely resolve to null to avoid Postgres & Zod "Invalid uuid" crashes.
 */
export const zOptionalUuid = z.preprocess((v) => {
  if (v === undefined) return undefined;
  if (typeof v === "string") {
    const trimmed = v.trim();
    return UUID_REGEX.test(trimmed) ? trimmed : null;
  }
  return v == null ? null : v;
}, z.string().uuid().nullable().optional());

export const zMoney = z.coerce.number().nonnegative("Must be 0 or more");

/** Empty-or-null-safe wrapper: uppercases + trims, then either passes
 *  through as null (matches zOptional's empty->null convention) or must
 *  match `pattern`. Shared by the GSTIN/PAN/IFSC validators below so the
 *  "optional but well-formed when present" behavior is defined once. */
function zPattern(pattern: RegExp, message: string) {
  return z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim().toUpperCase();
      return t === "" ? null : t;
    },
    z.union([z.string().regex(pattern, message), z.null()]).optional(),
  );
}

/** Indian GSTIN: 2-digit state code + 10-char PAN + 1-digit entity number
 *  + literal 'Z' + 1 checksum alphanumeric. Empty stays optional — a
 *  profile can be saved before GSTIN is known — but a non-empty value
 *  must be well-formed (Company Profile Task 9). */
export const zGstin = zPattern(
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  "Enter a valid 15-character GSTIN",
);

/** Indian PAN: 5 letters + 4 digits + 1 letter. */
export const zPan = zPattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN");

/** Indian bank IFSC: 4 letters (bank code) + '0' + 6 alphanumeric (branch code). */
export const zIfsc = zPattern(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid 11-character IFSC code");

/** Indian HSN code: 4 to 8 numeric digits (chapters, headings, sub-headings, tariffs). */
export const zHsn = zPattern(/^[0-9]{4,8}$/, "Enter a valid 4 to 8 digit HSN code");

/**
 * Normalize mobile for storage and duplicate detection.
 * - Standard Indian numbers (10 digits, +91, leading 0) -> 10 digits (e.g. "9876543210")
 * - International numbers (e.g. "+265995429998", "+14155552671") -> E.164 "+<country><digits>"
 */
export function normalizeMobile(v?: string | null): string {
  if (!v) return "";
  const trimmed = v.trim();
  const digits = trimmed.replace(/\D+/g, "");
  if (!digits) return "";

  // 1. Indian numbers with +91 or 91 country code (12 digits): strip 91 -> 10 digits
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // 2. Indian numbers with leading 0 (11 digits): strip 0 -> 10 digits
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  // 3. Standard 10-digit Indian numbers: return 10 digits
  if (digits.length === 10 && !trimmed.startsWith("+")) {
    return digits;
  }

  // 4. International numbers (e.g. +265995429998, 265995429998, +14155552671):
  // Return in clean E.164-compatible format with leading '+'
  if (trimmed.startsWith("+") || digits.length > 10) {
    return `+${digits}`;
  }

  return digits;
}

/** Extract raw digits from any phone input, stripping spaces, hyphens, plus signs, brackets. */
export function extractPhoneDigits(v?: string | null): string {
  if (!v) return "";
  return v.replace(/\D+/g, "");
}

/**
 * Strip characters with PostgREST filter-syntax meaning from a search string,
 * so untrusted input cannot break out of an `.ilike()` value inside an `.or()` filter.
 */
export function sanitizeSearch(v: string, max = 80): string {
  return v
    .replace(/[,()%*:."\\]/g, "")
    .trim()
    .slice(0, max);
}
