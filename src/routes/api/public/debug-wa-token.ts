/**
 * TEMPORARY diagnostic endpoint — verifies the WHATSAPP_ACCESS_TOKEN
 * currently loaded in the backend by calling Meta's /debug_token.
 * Returns only non-sensitive fields plus a SHA-256 fingerprint of the
 * token (first 16 hex chars) so the caller can confirm identity without
 * exposing the secret. Delete after use.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

export const Route = createFileRoute("/api/public/debug-wa-token")({
  server: {
    handlers: {
      GET: async () => {
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!token) {
          return new Response(
            JSON.stringify({ ok: false, error: "WHATSAPP_ACCESS_TOKEN not set in backend env" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
        const fingerprint = createHash("sha256").update(token).digest("hex").slice(0, 16);
        const tokenPreview = `${token.slice(0, 8)}…${token.slice(-6)} (len=${token.length})`;

        const url = `https://graph.facebook.com/v25.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
        const r = await fetch(url);
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;

        return new Response(
          JSON.stringify(
            {
              ok: r.ok,
              http_status: r.status,
              backend_token_fingerprint_sha256_16: fingerprint,
              backend_token_preview: tokenPreview,
              debug_token: j,
            },
            null,
            2,
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
