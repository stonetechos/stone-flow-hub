/**
 * Shape errors caught at trust boundaries (server fns, mutation handlers, RPCs).
 * Single helper keeps message normalization out of every catch block.
 */
import { ZodError } from "zod";

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
export function mapDbError(err: { code?: string; message?: string } | null): string {
  if (!err) return "Unknown database error";
  switch (err.code) {
    case "23505":
      return "A record with the same details already exists.";
    case "23503":
      return "This record is linked to other business transactions and cannot be removed until those are archived, reassigned, or deleted first.";
    case "23514":
      return "That value doesn't meet a required rule. Check the highlighted fields.";
    case "22P02":
      return "One of the fields has an invalid value.";
    case "42501":
      // Distinguish real permission denials from a stale/missing session.
      // The auth gate + attacher will redirect on missing session.
      return "Permission denied. Your role does not allow this action.";
    case "PGRST301":
    case "PGRST302":
      return "Your session has expired. Please sign in again.";
    case "PGRST116":
      return "Record not found.";
    default:
      if (/JWT|jwt|token/i.test(err.message ?? "")) {
        return "Your session has expired. Please sign in again.";
      }
      if (/Failed to fetch|NetworkError/i.test(err.message ?? "")) {
        return "Network error. Check your connection and try again.";
      }
      return err.message || "Database error";
  }
}
