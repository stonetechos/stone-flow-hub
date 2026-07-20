/** Shared helpers for MCP tool handlers. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext, ToolHandlerResult } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAsUser } from "./supabase-user";

export function unauthenticated(): ToolHandlerResult {
  return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
}

export function forbidden(msg = "Staff role required."): ToolHandlerResult {
  return { content: [{ type: "text", text: msg }], isError: true };
}

export function errorResult(err: unknown): ToolHandlerResult {
  const text = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text }], isError: true };
}

export function jsonResult(payload: unknown): ToolHandlerResult {
  const structured =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : { value: payload };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: structured,
  };
}

export type StaffClientResult =
  | { ok: true; client: SupabaseClient<Database>; userId: string }
  | { ok: false; error: ToolHandlerResult };

/**
 * Verify the caller is authenticated and has staff access, then return a
 * Supabase client bound to their identity. Callers check `result.ok` and
 * return `result.error` directly on failure.
 */
export async function requireStaffClient(ctx: ToolContext): Promise<StaffClientResult> {
  const token = ctx.getToken();
  const userId = ctx.getUserId();
  if (!ctx.isAuthenticated() || !token || !userId) {
    return { ok: false, error: unauthenticated() };
  }
  const client = supabaseAsUser(token);
  const { data, error } = await client.rpc("has_staff_access", { _user_id: userId });
  if (error)
    return { ok: false, error: errorResult(new Error(`Role check failed: ${error.message}`)) };
  if (!data) return { ok: false, error: forbidden() };
  return { ok: true, client, userId };
}

/** Sanitize a search term for Supabase `.ilike()`/`.or()` filters. */
export function sanitize(term: string): string {
  return term
    .replace(/[,%()]/g, "")
    .trim()
    .slice(0, 100);
}
