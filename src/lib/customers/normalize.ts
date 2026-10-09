/**
 * Customer normalization and schema resilience helpers.
 *
 * Ensures `company_name` and `contact_person` are transparently preserved and read
 * whether they exist as dedicated PostgreSQL columns or in `external_ref` JSONB,
 * preventing 'column does not exist in schema cache' errors.
 */
import type { DbTable } from "@/lib/types";

export type CustomerDbRow = DbTable<"customers">;

export function isMissingCustomerColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  const code =
    "code" in err && typeof (err as { code?: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";
  const details =
    "details" in err && typeof (err as { details?: unknown }).details === "string"
      ? (err as { details: string }).details
      : "";

  return (
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("company_name") ||
    msg.includes("contact_person") ||
    details.includes("company_name") ||
    details.includes("contact_person") ||
    msg.includes("in the schema cache") ||
    msg.includes("does not exist")
  );
}

export function normalizeCustomerRow<
  T extends {
    external_ref?: unknown;
    company_name?: string | null;
    contact_person?: string | null;
  },
>(row: T | null | undefined): T {
  if (!row) return row as unknown as T;
  const ext = (row.external_ref as Record<string, unknown> | null) ?? {};
  return {
    ...row,
    company_name: row.company_name ?? (ext.company_name as string) ?? null,
    contact_person: row.contact_person ?? (ext.contact_person as string) ?? null,
  };
}

export function prepareCustomerExternalRef(
  existingExternalRef: unknown,
  fields: { company_name?: string | null; contact_person?: string | null },
): Record<string, unknown> {
  const base =
    existingExternalRef &&
    typeof existingExternalRef === "object" &&
    !Array.isArray(existingExternalRef)
      ? { ...(existingExternalRef as Record<string, unknown>) }
      : {};

  if (fields.company_name !== undefined) {
    base.company_name = fields.company_name || null;
  }
  if (fields.contact_person !== undefined) {
    base.contact_person = fields.contact_person || null;
  }
  return base;
}

export function stripMissingCustomerColumns<T extends Record<string, unknown>>(payload: T): T {
  const clone = { ...payload };
  delete clone.company_name;
  delete clone.contact_person;
  return clone;
}
