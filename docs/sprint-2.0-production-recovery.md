# Sprint 2.0 — Production Recovery: Users & Roles

**Scope:** trace the complete production execution path for Users & Roles
only, determine the exact root cause among 5 named hypotheses, implement
whatever is fixable in code, and provide exact deployment steps for
whatever isn't. No other module investigated.

## Verdict

**Hypothesis 1 — the deployed Worker is genuinely missing
`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` at request time — is the only
hypothesis consistent with the evidence.** Hypotheses 2, 3, and 5 are
ruled out below by direct code inspection, not by elimination alone.
Hypothesis 4 (stale bundle) cannot be fully ruled out from this sandbox but
is folded into the recommended recovery steps regardless, since a
republish is required either way and costs nothing extra to include.

This is not a new conclusion — Sprint 1.9's Milestone 1 reached the same
verdict from the code side. What's new in this sprint: hypotheses 2/3/5
are now checked with direct evidence instead of assumed away, the exact
point of failure in the execution path is pinned down precisely, and a
diagnostic endpoint is implemented that will give a **definitive,
first-party** answer the moment someone with deployment access hits it —
closing the one gap no amount of static code review from this sandbox can
close.

## Execution path trace, with evidence at each hop

```
Users page (src/routes/_authenticated/admin/users.tsx)
  │  useServerFn(listAuthUsers) — line 169, 184
  ▼
TanStack server function (src/lib/admin/users.functions.ts:204)
  export const listAuthUsers = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])     ← line 205
    .handler(async ({ context }) => { ... })
  │
  ▼
requireSupabaseAuth (src/integrations/supabase/auth-middleware.ts:34-47)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
      `Connect Supabase in Lovable Cloud.`
    );
  }
  ═══ THIS IS WHERE THE OBSERVED FAILURE HAPPENS ═══
  The exact reported error text ("Missing Supabase environment
  variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in
  Lovable Cloud.") only exists in this one throw site, checking only this
  variable pair. client.server.ts's equivalent throw (below) checks a
  DIFFERENT pair (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and would
  produce different text — so the exact error text reported confirms the
  failure is happening HERE, in the middleware, before the handler body
  ever runs. client.server.ts, the Supabase Admin client, and the Auth API
  are never reached — execution stops at this throw.
  ▼  (never reached in the observed failure)
client.server.ts (src/integrations/supabase/client.server.ts:35-47)
  Same pattern, different variable pair (SUPABASE_SERVICE_ROLE_KEY, not
  PUBLISHABLE_KEY) — dynamically imported at line 208 of
  users.functions.ts, exactly like every other server-side call site in
  this repo (see Hypothesis 5 below).
  ▼  (never reached)
Cloudflare runtime → Environment variables → Supabase Admin client →
Auth API → Response
  Everything past requireSupabaseAuth's throw is moot for THIS failure —
  the request never gets there. The relevant "Cloudflare runtime →
  environment variables" hop is the one that already failed: whatever
  Cloudflare Worker environment `process.env.SUPABASE_URL` resolves
  against at request time does not have that variable set (or the
  Worker currently serving traffic doesn't have this deployment's secrets
  bound — see Hypothesis 4).
```

## Hypothesis-by-hypothesis

### 1. Is the Worker actually missing secrets? — **Most likely, and the only hypothesis the evidence supports**

Cannot be verified with 100% certainty from this sandbox (no live
Cloudflare/Lovable access), but every other hypothesis that could produce
this exact symptom is independently ruled out below, leaving this as the
only one left standing. Definitive confirmation now has a one-command
answer — see "Diagnostic endpoint" below.

### 2. Is only this server bundle missing them? — **Ruled out, architecturally**

This project deploys as a single Cloudflare Worker (`cloudflare-module`
Nitro preset, confirmed in the Sprint 1.8/1.9 audits — one `index.mjs`,
one set of environment bindings for the entire Worker). There is no
per-route or per-bundle environment variable scoping mechanism anywhere in
this codebase's Cloudflare configuration (`wrangler.jsonc`, the
Nitro-generated `.output/server/wrangler.json`) — Cloudflare Workers
environment variables/secrets are bound at the Worker level, not per
handler or per file. Every one of the 18 `createServerFn` definitions
audited in Sprint 1.9 Milestone 2 shares the exact same
`requireSupabaseAuth` middleware instance (a single module-level export,
imported identically everywhere) — there is no code path by which one
server function's bundle could see a different `process.env` than
another's within the same deployed Worker. If this hypothesis were somehow
true despite the architecture, every one of those 18 functions — Copilot,
VIE quotation actions, notification dispatch, Razorpay payment links, not
just Users & Roles — would need to be failing identically, since they all
route through the identical check.

### 3. Is `requireSupabaseAuth` being executed in the wrong runtime? — **Ruled out**

The Users & Roles route (`src/routes/_authenticated/admin/users.tsx:117`)
sets `ssr: false`. This is not unique to Users & Roles or in any way
unusual: `ssr: false` is set on effectively every route under
`_authenticated/` (117 of the routes checked carry this exact flag —
grep confirms it's the standard pattern for authenticated pages, not an
admin-specific one). `ssr: false` controls whether the *route's React
component* renders on the server — it has no effect on where a
`createServerFn` executes. TanStack Start server functions are independent
RPC endpoints: calling one from client-side code (via `useServerFn`, as
`admin/users.tsx` does at line 169) issues a request to a server-side
handler that runs inside the same deployed Worker regardless of the
calling route's SSR setting. There is no separate "edge" vs. "node"
runtime split anywhere in this project's Nitro/Cloudflare configuration —
one preset (`cloudflare-module`), one Worker, one runtime for every server
function.

### 4. Is the deployment using an older Worker bundle? — **Cannot be fully ruled out; folded into the recovery steps regardless**

This sandbox has no way to compare "what's in this repo" against "what's
actually deployed to erp.stonetech.in" — that comparison requires Lovable
dashboard access this sandbox doesn't have. Two concrete, distinct ways
this hypothesis could be true, both worth checking:

- **Preview/Production skew.** `docs/DEPLOYMENT.md` documents that Lovable
  auto-builds Preview on every save but Production only updates on an
  explicit **Publish** click. If the Supabase secrets were added or
  corrected in Lovable Cloud's config *after* the last Production Publish,
  Preview would already reflect them (constantly rebuilt) while Production
  would still be running the older, unconfigured build until someone
  clicks Publish again. This is indistinguishable from Hypothesis 1 by
  symptom alone, but has a different fix (republish, not just configure).
- **Stale bundle predating a secrets change for any other reason** (a
  Worker version pinned/rolled back per `docs/DEPLOYMENT.md`'s Rollback
  section, a deploy that silently failed partway, etc.) — same
  observation applies.

Given either sub-case resolves the same way (configure the secret, then
publish/redeploy regardless of whether you believe it's already set), this
is folded into the deployment steps below rather than treated as a
separate fix path.

### 5. Is Users & Roles importing the wrong server/client entrypoint? — **Ruled out**

Every dynamic import of `client.server.ts` in this codebase — in
`users.functions.ts` (7 call sites, one per handler) and in the 4 other
files that use it (`customer-payment-reminders.ts`, `whatsapp.ts` x2,
`workforce-daily.ts`, `razorpay.ts`) — uses the byte-identical statement
`const { supabaseAdmin } = await import("@/integrations/supabase/client.server")`.
No alternate copy of `client.server.ts` exists in the repo, no path alias
resolves differently for this module, and `users.functions.ts` imports
`requireSupabaseAuth` from the same single file
(`@/integrations/supabase/auth-middleware`) every other server function
imports it from. There is no wrong-entrypoint mechanism available here —
and moot regardless, since the failure (per the execution-path trace
above) happens inside `requireSupabaseAuth` itself, before the handler
body's `client.server.ts` import is ever reached.

## Root cause

The deployed Cloudflare Worker's runtime environment does not have
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` set at request time (or is
running a build from before they were set/corrected — Hypothesis 4). This
is an infrastructure/deployment-configuration gap, not an application
defect: `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`),
`client.server.ts`, and every call site that uses them are all functioning
exactly as designed — correctly detecting a missing prerequisite and
failing loudly with an actionable message, rather than either crashing
unhelpfully or silently proceeding with an invalid client.

**Why "the remainder of the ERP works correctly" is consistent with this,
not evidence against it:** the large majority of this ERP's data
(customers, invoices, quotes, products, and most other business records)
is read and written directly from the browser via the publishable/anon
Supabase client under RLS (`src/integrations/supabase/client.ts`, using
`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` — baked into the
client bundle at build time, and confirmed present since the app shell
itself renders). That path never touches `process.env` at all, so it's
completely unaffected by a server-side secrets gap. Users & Roles is
unusual only in how *much* of its functionality specifically depends on
`createServerFn` + `requireSupabaseAuth` (listing `auth.users` via the
service-role Admin API isn't something the RLS-scoped anon/authenticated
client can do at all) — making it the most visible symptom of a gap that,
per Hypothesis 2's analysis, should affect all 18 server-function-gated
features identically, not just this one.

**One cheap, high-value confirmation available without dashboard access:**
try any other feature that calls a `requireSupabaseAuth`-gated server
function — the AI Copilot panel, creating a quotation via VIE/voice
capture, or a Razorpay payment link. If those also fail with the identical
"Missing Supabase environment variable(s)" message, that's independent,
immediate confirmation of this root cause with no code changes or
dashboard access needed at all.

## Files involved

- `src/routes/_authenticated/admin/users.tsx` — the page; not the source
  of the defect (confirmed correct in Sprint 1.9 Milestone 1 and
  re-confirmed here).
- `src/lib/admin/users.functions.ts` — the server functions; confirmed
  correct (Hypothesis 5).
- `src/integrations/supabase/auth-middleware.ts` — where the failure
  actually happens; confirmed correct (functioning as designed).
- `src/integrations/supabase/client.server.ts` — never reached in this
  failure; confirmed correct.
- `src/lib/env/config-status.ts` — the *client*-side equivalent gate;
  unrelated to this specific failure (checked in Sprint 1.9 Milestone 1)
  but included for completeness since it's the nearest analogous
  mechanism.
- **New this sprint:** `src/routes/api/public/diagnostics/env-status.ts` —
  the diagnostic endpoint implemented below.

## Whether the fix requires code, deployment, Cloudflare, Lovable, or Supabase

**A combination — and the code portion is complete; everything else is
external.**

- **Code:** nothing to fix (every file in the execution path is already
  correct — confirmed, not assumed, in this sprint). What *was*
  implemented in code is a diagnostic, not a fix for the root cause
  itself (see below).
- **Deployment / Lovable:** the actual fix. Set the missing secrets in
  Lovable Cloud's project configuration and publish/redeploy so the
  Cloudflare Worker picks them up.
- **Cloudflare:** downstream of the Lovable step — Lovable manages this
  project's Cloudflare Worker deployment (per `docs/DEPLOYMENT.md`), so
  there is no separate Cloudflare-console action needed beyond what
  Lovable's publish flow already handles, unless Lovable's publish
  doesn't actually propagate the secret (in which case direct Cloudflare
  dashboard access to the Worker's Settings → Variables would be the
  fallback — flagged in the steps below).
- **Supabase:** the *source* of the correct values — `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` need to come from this project's actual
  Supabase project settings, not be invented.

## What was implemented in code

**`src/routes/api/public/diagnostics/env-status.ts`** — a new, unauthenticated,
read-only diagnostic endpoint that reports ONLY boolean presence (never
values) of `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`/`CRON_SHARED_SECRET` (Sprint
1.9's cron fix), and `LOVABLE_API_KEY`, read directly from `process.env`
inside the live Worker at request time. Deliberately left unauthenticated:
gating it behind any of the very secrets it exists to check would make it
useless in exactly the failure mode it's meant to diagnose, and boolean
presence-only disclosure (no values, lengths, or prefixes) carries
negligible risk — comparable to an ordinary `/health` endpoint.

This is the one thing this sandbox could not resolve through code review
alone (whether the live Worker's environment actually has these variables)
made resolvable by anyone with just a browser or `curl`, no dashboard
login required:

```
curl https://erp.stonetech.in/api/public/diagnostics/env-status
```

If `supabase_url`/`supabase_publishable_key` come back `false`: Hypothesis
1/4 is fully confirmed, first-party, in seconds. If they come back `true`:
every hypothesis in this document is wrong and the real cause is something
neither this sprint nor Sprint 1.9 could detect from source code alone —
worth reporting back for a deeper investigation at that point, since it
would mean the error message itself is stale/cached somehow, which would
be a new and different problem.

## Exact deployment steps (for whoever has dashboard access)

1. **Confirm the correct values first.** In the Supabase dashboard for
   project `apaeysllltlhleocmdhv` (confirmed as this project's Supabase
   project ID via `supabase/config.toml` and `.lovable/mcp/manifest.json`
   in the Sprint 1.8 audit) → Project Settings → API: copy the Project URL
   (→ `SUPABASE_URL`) and the `anon`/publishable key (→
   `SUPABASE_PUBLISHABLE_KEY`). For the service-role key, same page's
   service_role secret (→ `SUPABASE_SERVICE_ROLE_KEY`) — treat this one as
   highly sensitive, never paste it anywhere other than the deployment
   platform's secret store.
2. **In Lovable Cloud** (per `docs/DEPLOYMENT.md`'s "Server (never in the
   browser)" env var list): open this project → Backend/Settings →
   Environment Variables/Secrets. Confirm whether `SUPABASE_URL` /
   `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are present at
   all. If missing, add them with the values from step 1. If present,
   compare their values against step 1 exactly — a stale or
   copy-pasted-wrong value would produce this same symptom.
3. **While there, also confirm `CRON_SECRET` (or `CRON_SHARED_SECRET`) is
   set** — needed for Sprint 1.9 Milestone 3's cron fix
   (`customer-payment-reminders`, `workforce-daily`) to actually run; a
   convenient one-stop check since you're already in this screen.
4. **Publish/redeploy** — even if step 2 found the values already present
   and correct, click **Publish** (per `docs/DEPLOYMENT.md`'s Deploy
   section) to rule out Hypothesis 4 (a build predating a secrets change).
   This is safe and non-destructive regardless of which hypothesis turns
   out to be true.
5. **Verify immediately, without needing to touch Users & Roles at all:**
   ```
   curl https://erp.stonetech.in/api/public/diagnostics/env-status
   ```
   Confirm `supabase_url`, `supabase_publishable_key`, and
   `supabase_service_role_key` all report `true`.
6. **Only then** load `/admin/users` in production and confirm the user
   list loads and "Add user" succeeds.
7. **If step 5 reports `true` but Users & Roles still fails** — stop and
   report back rather than guessing further. That combination would mean
   every hypothesis in this document is wrong, which is itself an
   important, different finding (likely something Cloudflare/Lovable-side
   this sandbox has no visibility into at all, e.g. multiple Worker
   environments/versions serving traffic inconsistently).

## Verification

```
npm run typecheck        clean (routeTree.gen.ts regenerated via `npm run
                          build` to register the new route — TanStack
                          Start's file-based router requires this; never
                          hand-edited)
npm run typecheck:tests  clean
eslint (files touched)   clean
bun test                 323 pass, 0 fail (unchanged — a route handler,
                          same test-coverage gap noted in Sprint 1.9
                          Milestone 3 applies here too)
npm run build             succeeds; new route confirmed present in the
                          generated route tree
```

## Remaining blockers

- **This sandbox cannot set the missing secrets, publish, or curl the live
  `erp.stonetech.in` deployment itself** — no Lovable/Cloudflare/Supabase
  dashboard credentials and no outbound network path to the live
  deployment from here. Steps 1-7 above require a human with that access.
- **Cannot push this sprint's commits to GitHub** — same standing
  limitation as every prior sprint in this engagement.
