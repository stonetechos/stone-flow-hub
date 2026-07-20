/** Shared helpers for MCP tool handlers. */
import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseAsUser } from "./supabase-user";

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated." }],
    isError: true as const,
  };
}

export function forbidden(msg = "Staff role required.") {
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true as const,
  };
}

export function errorResult(err: unknown) {
  const text = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

/**
 * Verify the caller is authenticated and has staff access, then return a
 * Supabase client bound to their identity. Throws a tool-shaped error result
 * back to the caller when either check fails.
 */
export async function requireStaffClient(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) return { error: unauthenticated() };
  const client = supabaseAsUser(ctx.getToken());
  const { data, error } = await client.rpc("has_staff_access", { _user_id: ctx.getUserId() });
  if (error) return { error: errorResult(new Error(`Role check failed: ${error.message}`)) };
  if (!data) return { error: forbidden() };
  return { client, userId: ctx.getUserId() };
}

/** Sanitize a search term for Supabase `.ilike()`/`.or()` filters. */
export function sanitize(term: string): string {
  return term.replace(/[,%()]/g, "").trim().slice(0, 100);
}
