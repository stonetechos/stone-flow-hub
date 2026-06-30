/** Zod helpers shared across domain schemas. Trim, normalize, and treat empty as nullable. */
import { z } from "zod";

export const zTrimmed = z.string().trim();
export const zRequired = (label: string) =>
  zTrimmed.min(1, `${label} is required`);

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

/** Normalize mobile to digits only for duplicate detection. */
export function normalizeMobile(v: string): string {
  return v.replace(/\D+/g, "").replace(/^0+/, "").slice(-10);
}
