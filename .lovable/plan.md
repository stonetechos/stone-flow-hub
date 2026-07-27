## Diagnosis (verified, not assumed)

I hit the read-only diagnostic endpoint on every host that serves this project:

| Host | `SUPABASE_URL` | `SUPABASE_PUBLISHABLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | `LOVABLE_API_KEY` |
| --- | --- | --- | --- | --- |
| `stone-flow-hub.lovable.app` (Lovable published) | ✅ | ✅ | ✅ | ✅ |
| `project--109061a7-…lovable.app` (stable prod) | ✅ | ✅ | ✅ | ✅ |
| **`erp.stonetech.in` (custom domain)** | ❌ | ❌ | ❌ | ❌ |

The Supabase project itself is fine and the Lovable-managed hostnames are fully wired. The failure is scoped to the **custom domain Worker binding** — that deployment has zero env vars attached, which is exactly what `requireSupabaseAuth` and `supabaseAdmin` report on Users & Roles.

No code change fixes this. The env vars are Cloudflare Worker bindings applied at publish/domain-attach time; the sandbox has no access to Cloudflare or the Lovable hosting control plane.

## Plan

1. **Re-publish production.** A fresh publish re-applies the current secret set to every attached hostname, including custom domains. This alone often re-binds a custom-domain Worker that drifted.
2. **Re-verify from outside.** Curl `https://erp.stonetech.in/api/public/diagnostics/env-status` after publish. All five booleans (except `cron_secret`, which is a separate optional secret) should flip to `true`. Same check against `stone-flow-hub.lovable.app` as a control.
3. **Confirm Users & Roles in the browser** on `erp.stonetech.in` — the "backend connection isn't fully configured" panel should be gone.
4. **If step 2 still shows `false` on the custom domain only**, the binding is not being re-applied by publish. Escalation path (needs user action, not sandbox):
   - Project Settings → Domains → remove `erp.stonetech.in`, wait for detach, then re-add it (this recreates the Worker route + binding).
   - If that still fails, contact Lovable support with the diagnostic JSON above — the platform side needs to reattach the secret set to the custom-domain Worker.

## Guarantees

- No new Supabase project, no schema changes, no migrations.
- No changes to `.env`, `client.ts`, `client.server.ts`, `auth-middleware.ts`, or generated types.
- Only action taken in-app is `preview_ui--publish`; the diagnostic endpoint already exists.
- If diagnostic reveals a different host is broken (e.g. bindings vanish from the Lovable subdomain too), I stop and report rather than guess.
