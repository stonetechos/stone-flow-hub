/**
 * Production Recovery.
 *
 * Read-only diagnostic for the exact question this sprint exists to answer:
 * "is the deployed Cloudflare Worker actually missing the server-side
 * Supabase environment variables, or is something else going on?" Every
 * other way to answer that from this sandbox is a dead end — there are no
 * Cloudflare/Lovable/Supabase dashboard credentials here, so the only way
 * to get a definitive, first-party answer is to ask the live Worker
 * itself, from inside its own runtime, at request time.
 *
 * Reports ONLY boolean presence of each variable name — never a value, a
 * length, a prefix, or any other derived hint. This is deliberately safe
 * to leave reachable without authentication: knowing that a variable named
 * `SUPABASE_SERVICE_ROLE_KEY` is-or-isn't set discloses nothing usable
 * about its value, and gating this endpoint behind one of the very secrets
 * it exists to check would make it useless in exactly the failure mode it
 * needs to diagnose (if CRON_SECRET were also missing, a CRON_SECRET-gated
 * diagnostic endpoint would itself refuse to answer).
 *
 * Usage: `curl https://erp.stonetech.in/api/public/diagnostics/env-status`
 * against the LIVE deployment. If `supabase_url` / `supabase_publishable_key`
 * report `false`, that is definitive, first-party confirmation that the
 * deployed Worker's environment is missing what `requireSupabaseAuth`
 * needs (auth-middleware.ts) — the root cause behind Users & Roles'
 * "Missing Supabase environment variable(s)" error. If they report `true`,
 * the failure is NOT a missing-secret problem and points at something this
 * sandbox could not detect via static code review alone (a stale deployed
 * bundle predating a recent secret change, or a Cloudflare environment
 * binding scoped to the wrong Worker environment) — see
 * docs/sprint-2.0-production-recovery.md for the full decision tree.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diagnostics/env-status")({
  server: {
    handlers: {
      GET: async () => {
        const present = (name: string): boolean => !!process.env[name];

        const body = {
          // Checked by auth-middleware.ts's requireSupabaseAuth — gates
          // every admin/AI/VIE/notification/payment server function,
          // Users & Roles included. This is the pair whose absence
          // produces the exact "Missing Supabase environment variable(s):
          // SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY" error.
          supabase_url: present("SUPABASE_URL"),
          supabase_publishable_key: present("SUPABASE_PUBLISHABLE_KEY"),
          // Checked separately by client.server.ts's supabaseAdmin —
          // needed once requireSupabaseAuth already let the request
          // through, for the actual privileged auth.admin.* calls.
          supabase_service_role_key: present("SUPABASE_SERVICE_ROLE_KEY"),
          // The two cron endpoints accept either
          // name; reported together since either being present is enough.
          cron_secret: present("CRON_SECRET") || present("CRON_SHARED_SECRET"),
          // AI gateway (OpenRouter, replacing Lovable's AI Gateway).
          openrouter_api_key: present("OPENROUTER_API_KEY"),
          // Auth-email pipeline (Supabase's native Send Email Hook, direct
          // to this Worker, replacing Lovable's relay) and its sender.
          resend_api_key: present("RESEND_API_KEY"),
          supabase_auth_hook_secret: present("SUPABASE_AUTH_HOOK_SECRET"),
          checked_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
