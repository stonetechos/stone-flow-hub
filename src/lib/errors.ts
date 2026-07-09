/**
 * Shape errors caught at trust boundaries (server fns, mutation handlers, RPCs).
 * Single helper keeps message normalization out of every catch block.
 */
import { ZodError } from "zod";
import { recordDbErrorForDiagnostics } from "@/lib/diagnostics/toast-diagnostics";

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code = "APP_ERROR", status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function toUserMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues.map((i) => i.message).join(" • ");
  }
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

/** Map Postgres / PostgREST errors to friendly text. */
export function mapDbError(
  err: { code?: string; message?: string; details?: string | null; hint?: string | null } | null,
): string {
  if (!err) return "Unknown database error";
  const msg = err.message ?? "";
  const details = err.details ?? "";
  const hint = err.hint ?? "";
  const combined = `${msg} ${details} ${hint}`.toLowerCase();

  // Log the raw error so devs can see the real reason regardless of what we surface.
  if (typeof console !== "undefined") {
    recordDbErrorForDiagnostics(err);
    console.error("[db error]", { code: err.code, message: msg, details, hint });
  }

  switch (err.code) {
    case "23505":
      return details ? `Duplicate value: ${details}` : "A record with the same details already exists.";
    case "23503":
      return "This record is linked to other business transactions and cannot be removed until those are archived, reassigned, or deleted first.";
    case "23502":
      return details ? `Required field missing: ${details}` : "A required field is missing.";
    case "23514":
      return details ? `Constraint violation: ${details}` : "That value doesn't meet a required rule. Check the highlighted fields.";
    case "22P02":
      return msg || "One of the fields has an invalid value.";
    case "22001":
      return "One of the values is too long for its field.";
    case "22007":
    case "22008":
      return "Invalid date or time value.";
    case "40001":
    case "40P01":
      return "The database is busy. Please try again.";
    case "57014":
      return "The operation timed out. Please try again.";
    case "42501":
      // RLS row-violation on insert/update also uses 42501 — surface distinctly.
      if (/new row violates row-level security/i.test(combined)) {
        return "This record can't be saved with the current values (row-level security). Check owner/user fields.";
      }
      if (/permission denied|insufficient_privilege/i.test(combined)) {
        return "Permission denied. Your role does not allow this action.";
      }
      // Some triggers RAISE with SQLSTATE 42501 but a custom message — show it.
      return msg || "Permission denied.";
    case "P0001":
      // RAISE EXCEPTION from a trigger/function — the message is the real reason.
      return msg || "Operation blocked by a database rule.";
    case "PGRST301":
    case "PGRST302":
      return "Your session has expired. Please sign in again.";
    case "PGRST116":
      return "Record not found.";
    case "PGRST204":
      return msg || "Requested column or field does not exist.";
    default:
      if (/jwt|token expired|invalid token/i.test(msg)) {
        return "Your session has expired. Please sign in again.";
      }
      if (/failed to fetch|networkerror|network request failed/i.test(msg)) {
        return "Network error. Check your connection and try again.";
      }
      // Preserve the actual database/RPC/trigger message rather than a generic label.
      return msg || "Unexpected error. Please try again.";
  }
}
