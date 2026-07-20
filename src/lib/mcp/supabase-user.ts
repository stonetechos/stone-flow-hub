/**
 * Build a Supabase client authenticated as the MCP caller.
 *
 * The MCP server verifies the caller's OAuth bearer via mcp-js and hands us a
 * verified user id + raw access token. We forward the raw token so every query
 * runs under RLS as that user — exactly like a normal signed-in request.
 *
 * Runs inside the MCP tool handler only; do NOT import from client code.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function supabaseAsUser(accessToken: string): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // New-format opaque keys must not be sent as a Bearer token; the user
        // token is what identifies the caller and drives RLS.
        if (isNewSupabaseApiKey(key)) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
