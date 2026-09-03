/**
 * Unit tests for `parseMissingSupabaseEnvError`,
 * added alongside the fix for the "Missing Supabase environment
 * variable(s)" error leaking into the Users & Roles page as raw text (see
 * ServerConfigurationErrorState.tsx and admin/users.tsx). Pure string
 * parsing, no Supabase/module mocking needed.
 */
import { describe, test, expect } from "bun:test";
import { parseMissingSupabaseEnvError, toUserMessage, AppError } from "./errors";

describe("parseMissingSupabaseEnvError", () => {
  test("parses a single missing variable", () => {
    const err = new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL. Connect Supabase in Lovable Cloud.",
    );
    expect(parseMissingSupabaseEnvError(err)).toEqual(["SUPABASE_URL"]);
  });

  test("parses multiple missing variables, exactly as auth-middleware.ts/client.server.ts join them", () => {
    const err = new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in Lovable Cloud.",
    );
    expect(parseMissingSupabaseEnvError(err)).toEqual(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);
  });

  test("matches on a plain string, not just an Error instance", () => {
    expect(
      parseMissingSupabaseEnvError(
        "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY. Connect Supabase in Lovable Cloud.",
      ),
    ).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
  });

  test("returns null for an unrelated error message", () => {
    expect(parseMissingSupabaseEnvError(new Error("Network error"))).toBeNull();
    expect(
      parseMissingSupabaseEnvError(new AppError("Cannot delete the last active admin.")),
    ).toBeNull();
  });

  test("returns null for non-Error, non-string values", () => {
    expect(parseMissingSupabaseEnvError(null)).toBeNull();
    expect(parseMissingSupabaseEnvError(undefined)).toBeNull();
    expect(
      parseMissingSupabaseEnvError({
        message: "Missing Supabase environment variable(s): SUPABASE_URL.",
      }),
    ).toBeNull();
  });

  test("does not false-positive on a message that merely mentions Supabase env vars in passing", () => {
    expect(
      parseMissingSupabaseEnvError(
        new Error("Reminder: check the Supabase environment variable(s)."),
      ),
    ).toBeNull();
  });
});

describe("toUserMessage still surfaces the raw message for the missing-env-var case", () => {
  // toUserMessage itself is unchanged by this fix — callers decide whether
  // to special-case via parseMissingSupabaseEnvError before falling back to
  // it, exactly as admin/users.tsx now does.
  test("Error instances pass their message through unchanged", () => {
    const err = new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL. Connect Supabase in Lovable Cloud.",
    );
    expect(toUserMessage(err)).toBe(
      "Missing Supabase environment variable(s): SUPABASE_URL. Connect Supabase in Lovable Cloud.",
    );
  });
});
