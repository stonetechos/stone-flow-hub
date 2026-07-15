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

/** Indian mobile: 10 digits, optional +91 / leading 0 stripped. */
export const zMobile = zTrimmed
  .min(10, "Enter a valid mobile number")
  .max(15, "Mobile number is too long")
  .regex(/^[+\d\s-]+$/, "Use digits only");

export const zEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().email("Enter a valid email").nullable().optional(),
);

export const zUuid = z.string().uuid();
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

/** Normalize mobile to digits only for duplicate detection. */
export function normalizeMobile(v: string): string {
  return v.replace(/\D+/g, "").replace(/^0+/, "").slice(-10);
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
