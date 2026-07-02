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
      return "Cannot complete: a linked record is missing.";
    case "42501":
      return "You don't have permission to do that.";
    case "PGRST301":
      return "Your session expired. Please sign in again.";
    default:
      return err.message || "Database error";
  }
}
