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

/**
 * Phase G.8.9 Task A6: coarse failure classification for diagnostics and
 * logging. Deliberately separate from the user-facing message
 * (`toUserMessage`) — this is for telling apart *why* something failed in
 * production logs, not for what the user sees. Categories match the phase
 * spec's own list: programming bug vs backend failure vs permission issue
 * vs network interruption vs missing data vs expired authentication.
 */
export type FailureCategory =
  | "network"
  | "auth_expired"
  | "permission"
  | "not_found"
  | "backend"
  | "validation"
  | "programming_bug";

export function classifyFailure(err: unknown): FailureCategory {
  // A raw fetch/network failure never reaches AppError — the browser
  // throws before a response exists at all.
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return "network";
  if (
    err instanceof Error &&
    /networkerror|failed to fetch|load failed|ERR_INTERNET_DISCONNECTED|ERR_NETWORK/i.test(err.message)
  ) {
    return "network";
  }

  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";

  if (/jwt expired|invalid refresh token|refresh_token_not_found|session.*expired|not authenticated/i.test(message)) {
    return "auth_expired";
  }
  if (/row-level security|permission denied|insufficient_privilege|not executable by your role/i.test(message)) {
    return "permission";
  }
  if (/does not exist|not found/i.test(message)) return "not_found";
  if (/database is busy|operation timed out|constraint|invalid value|required field|too long for its field/i.test(message)) {
    return "validation";
  }
  if (err instanceof AppError) return "backend";

  // Not an AppError and not a recognized message pattern — most likely an
  // unhandled JS exception in render/component logic (e.g. the unguarded
  // `.data!` class of bug this phase fixed), not a backend response at all.
  return "programming_bug";
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

/** True in dev / non-production builds only — diagnostics are appended then.
 *  Published `*.lovable.app` / `*.lovableproject.com` hosts are treated as
 *  production and get generic errors so raw DB internals never leak to end
 *  users. */
function isDiagnosticsMode(): boolean {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      if (import.meta.env.DEV) return true;
      if (import.meta.env.MODE && import.meta.env.MODE !== "production") return true;
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    const host = window.location?.hostname ?? "";
    if (/^(localhost|127\.0\.0\.1)$/.test(host)) return true;
  }
  return false;
}


/**
 * Extract the failing database object (function, trigger, relation, constraint)
 * from a raw Postgres error so users see the *actual* cause, not a generic
 * "Permission denied".
 */
function extractDbObject(msg: string, details = "", hint = ""): string | null {
  const all = `${msg}\n${details}\n${hint}`;
  const patterns: Array<[RegExp, string]> = [
    [/permission denied for function\s+([a-zA-Z0-9_.]+)/i, "function"],
    [/permission denied for table\s+([a-zA-Z0-9_.]+)/i, "table"],
    [/permission denied for relation\s+([a-zA-Z0-9_.]+)/i, "relation"],
    [/permission denied for schema\s+([a-zA-Z0-9_.]+)/i, "schema"],
    [/permission denied for sequence\s+([a-zA-Z0-9_.]+)/i, "sequence"],
    [/function\s+([a-zA-Z0-9_.]+\([^)]*\))\s+does not exist/i, "function"],
    [/relation\s+"?([a-zA-Z0-9_.]+)"?\s+does not exist/i, "relation"],
    [/violates foreign key constraint\s+"([^"]+)"/i, "fk"],
    [/violates unique constraint\s+"([^"]+)"/i, "unique"],
    [/violates check constraint\s+"([^"]+)"/i, "check"],
    [/violates not-null constraint.*column\s+"([^"]+)"/is, "column"],
    [/null value in column\s+"([^"]+)"/i, "column"],
    [/new row violates row-level security policy(?:\s+for table\s+"([^"]+)")?/i, "rls"],
    [/in function\s+([a-zA-Z0-9_.]+)/i, "function"],
    [/in trigger\s+([a-zA-Z0-9_.]+)/i, "trigger"],
  ];
  for (const [re, kind] of patterns) {
    const m = all.match(re);
    if (m?.[1]) return `${kind}: ${m[1]}`;
    if (m && kind === "rls") return "rls policy";
  }
  return null;
}

/** Compact diagnostic suffix so devs immediately see the real DB object. */
function buildDiagnostic(err: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const parts: string[] = [];
  if (err.code) parts.push(`SQLSTATE ${err.code}`);
  const obj = extractDbObject(err.message ?? "", err.details ?? "", err.hint ?? "");
  if (obj) parts.push(obj);
  if (err.details) parts.push(`detail: ${err.details}`);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  return parts.length ? ` [${parts.join(" | ")}]` : "";
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

  // Only log raw DB internals in dev/local — never in the published app,
  // where they would leak table / constraint / RPC names to end users.
  const diagnostics = isDiagnosticsMode();
  if (diagnostics && typeof console !== "undefined") {
    recordDbErrorForDiagnostics(err);
    console.error("[db error]", {
      code: err.code,
      message: msg,
      details,
      hint,
      object: extractDbObject(msg, details, hint),
    });
  }


  const diag = isDiagnosticsMode() ? buildDiagnostic(err) : "";
  const withDiag = (base: string) => `${base}${diag}`;

  switch (err.code) {
    case "23505":
      return withDiag(details ? `Duplicate value: ${details}` : "A record with the same details already exists.");
    case "23503":
      return withDiag("This record is linked to other business transactions and cannot be removed until those are archived, reassigned, or deleted first.");
    case "23502":
      return withDiag(details ? `Required field missing: ${details}` : "A required field is missing.");
    case "23514":
      return withDiag(details ? `Constraint violation: ${details}` : "That value doesn't meet a required rule.");
    case "22P02":
      return withDiag(msg || "One of the fields has an invalid value.");
    case "22001":
      return withDiag("One of the values is too long for its field.");
    case "22007":
    case "22008":
      return withDiag("Invalid date or time value.");
    case "40001":
    case "40P01":
      return withDiag("The database is busy. Please try again.");
    case "57014":
      return withDiag("The operation timed out. Please try again.");
    case "42883":
      // undefined_function — often a missing overload; surface the raw message
      return withDiag(msg || "A required database function is missing.");
    case "42P01":
      return withDiag(msg || "A referenced table does not exist.");
    case "42703":
      return withDiag(msg || "A referenced column does not exist.");
    case "42501": {
      // 42501 conflates THREE distinct failures. Distinguish them precisely
      // and always include the failing object so we never hide the real cause.
      const obj = extractDbObject(msg, details, hint);
      if (/new row violates row-level security/i.test(combined)) {
        return withDiag(
          obj
            ? `Row-level security blocked this write (${obj}). Check owner/user fields.`
            : "Row-level security blocked this write. Check owner/user fields.",
        );
      }
      if (/permission denied for function/i.test(combined)) {
        return withDiag(
          obj
            ? `Database ${obj} is not executable by your role (missing EXECUTE grant or SECURITY DEFINER).`
            : "A database function is not executable by your role.",
        );
      }
      if (/permission denied|insufficient_privilege/i.test(combined)) {
        return withDiag(
          obj
            ? `Permission denied on ${obj}.`
            : msg || "Permission denied.",
        );
      }
      // Trigger RAISE with SQLSTATE 42501 and a custom message — surface it.
      return withDiag(msg || "Permission denied.");
    }
    case "P0001":
      return withDiag(msg || "Operation blocked by a database rule.");
    case "PGRST301":
    case "PGRST302":
      return "Your session has expired. Please sign in again.";
    case "PGRST116":
      return withDiag("Record not found.");
    case "PGRST204":
      return withDiag(msg || "Requested column or field does not exist.");
    default:
      if (/jwt|token expired|invalid token/i.test(msg)) {
        return "Your session has expired. Please sign in again.";
      }
      if (/failed to fetch|networkerror|network request failed/i.test(msg)) {
        return "Network error. Check your connection and try again.";
      }
      return withDiag(msg || "Unexpected error. Please try again.");
  }
}
