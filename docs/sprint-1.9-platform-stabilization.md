# Sprint 1.9 — Platform Stabilization

**Objective:** Make STOS production-ready. Platform fixes only — no new ERP
features. Every milestone below ends with typecheck/lint/test/build and its
own root cause / files changed / verification / remaining blockers record.

This sprint builds directly on the Sprint 1.8 platform stabilization audit
(`docs/sprint-1.8-platform-stabilization-audit.md`), which diagnosed but did
not fix anything. This sprint fixes what's fixable from this sandbox and
names precisely what isn't.

---

## Milestone 1 — Fix Users & Roles completely

### Root cause

Two independent things were true at once, and only one of them is a code
defect:

1. **The actual production failure is external, not code.** `erp.stonetech.in`'s
   Cloudflare Worker is missing the server-side Supabase environment
   variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and — for the
   admin operations specifically — `SUPABASE_SERVICE_ROLE_KEY`), even
   though the client-side pair (`VITE_SUPABASE_URL` /
   `VITE_SUPABASE_PUBLISHABLE_KEY`) is present and baked into the build.
   That's why the app shell loads normally but `requireSupabaseAuth` (the
   middleware gating `listAuthUsers`, `inviteUser`, `createUserWithPassword`,
   and every other admin server function in
   `src/lib/admin/users.functions.ts`) throws at request time. This cannot
   be fixed from this sandbox — it requires setting secrets in the Lovable
   Cloud / Cloudflare dashboard, which this sandbox has no credentials for.
   Flagged as a remaining blocker, not attempted.
2. **A genuine, fixable code defect: the failure had no dedicated UI.**
   The client-side equivalent of this exact failure (missing `VITE_*` vars)
   already gets a polished, on-brand full-screen `ConfigurationRequiredScreen`
   (`src/components/global/ConfigurationRequiredScreen.tsx`, added Sprint
   1.7 Part 1) — but the server-side equivalent had no matching treatment.
   It fell through to a generic `<div className="text-destructive">{toUserMessage(error)}</div>`,
   which is exactly what the user's screenshot showed: a raw
   `Error.message` string sitting in the middle of the Users & Roles table.
   Every full code-level audit pass (this milestone re-read
   `client.ts`/`auth-middleware.ts`/`client.server.ts`/`config-status.ts`/
   `users.functions.ts`/`admin/users.tsx` in full) found no other defect in
   the feature itself — permission checks, mutation handlers, and audit
   logging are all correct and match their Sprint 1.7 design docs.

### Fix

- **`src/lib/errors.ts`** — added `parseMissingSupabaseEnvError(err)`, a
  pure function that recognizes the exact message shape both
  `auth-middleware.ts` and `client.server.ts` throw (`"Missing Supabase
  environment variable(s): X, Y. Connect Supabase in Lovable Cloud."`) and
  extracts the missing variable names, or returns `null` for anything else.
  Deliberately parses the already-thrown error's own message instead of
  adding a new server round trip — the message already carries everything
  needed.
- **`src/components/global/ServerConfigurationErrorState.tsx`** (new) —
  the inline counterpart to `ConfigurationRequiredScreen`: same visual
  language and copy tone, scoped to a card/section rather than the whole
  viewport, since this failure is local to whichever page hit a gated
  server function rather than the entire app being down.
- **`src/routes/_authenticated/admin/users.tsx`** — when the combined
  `profiles`/`authUsers` query error matches
  `parseMissingSupabaseEnvError()`, the page now renders
  `ServerConfigurationErrorState` (with the exact missing-var list) instead
  of the raw error string. Falls back to the existing generic error
  rendering for every other error shape — unchanged behavior for anything
  that isn't this specific deployment-configuration failure.
- **`src/lib/errors.test.ts`** (new) — 7 unit tests for
  `parseMissingSupabaseEnvError`: single var, multiple vars (exact join
  format the two throw sites use), string input (not just `Error`),
  unrelated errors, non-Error/non-string values, and a message that merely
  mentions "Supabase environment variable(s)" in passing without matching
  the exact throw shape (guards against over-matching).

No changes to `client.ts`, `auth-middleware.ts`, or `client.server.ts`
themselves — all three are Lovable-generated ("do not edit it directly")
and their behavior (including the exact error message this fix now parses)
is correct as-is; only the *unhandled* end of that error was missing UI.

### Verification

```
npm run typecheck        clean
npm run typecheck:tests  clean
eslint (files touched)   clean (2 Prettier issues auto-fixed on first pass)
bun test                 323 pass, 0 fail (up from 316 — the 7 new tests)
npm run build             succeeds
```

### Remaining blockers

- **External, requires dashboard credentials this sandbox doesn't have:**
  the actual missing `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` secrets on the deployed Cloudflare Worker.
  Until an operator sets these in Lovable Cloud (Backend → Secrets, or the
  Cloudflare dashboard directly) and redeploys, Users & Roles — and every
  other admin server function — will still fail at request time. What
  changed this milestone is that the failure now explains itself clearly,
  in place, instead of leaking a raw error string.
- **Not addressed here, flagged for a future sprint:** the exact same
  "raw error string via `toUserMessage(error)`" pattern this milestone
  fixed for Users & Roles exists on roughly a dozen other routes
  (`vendors`, `projects`, `invoices`, `quotes`, `customers`, `settings`,
  `products`, `enquiries`, `followups`, `auth`, and others). None of those
  routes call `requireSupabaseAuth`-gated server functions today as
  centrally as Users & Roles does, so this sprint scoped the fix to the
  page the user actually reported. If any of those pages later grow a
  dependency on a gated server function, the same
  `parseMissingSupabaseEnvError` + `ServerConfigurationErrorState` pair is
  ready to reuse — rolling it out preemptively everywhere would be
  unrelated feature-adjacent work outside this milestone's scope.

---

## Milestone 2 — Verify Supabase server integration

Verification-only milestone: every check below passed. No code changes
were made because no genuine defect was found.

### What was verified

- **Env-var handling consistency.** Re-confirmed the three-way split
  (`client.ts`'s browser/SSR-fallback pair, `auth-middleware.ts`'s
  server-only pair, `client.server.ts`'s service-role pair) is internally
  consistent and matches `docs/DEPLOYMENT.md`'s documented split. This is
  the same finding Milestone 1 fixed the *symptom* of; the underlying
  three files are correct as designed.
- **Every `createServerFn` in the repo requires authentication.**
  Enumerated all 18 `createServerFn` definitions across 8 files
  (`copilot.functions.ts` x5, `nl-search.functions.ts`, `users.functions.ts`
  x7, `brief.functions.ts`, `ai-health.functions.ts`,
  `dispatch.functions.ts` x5, `vie.functions.ts` x3, `razorpay.functions.ts`
  x2, `site-ai.functions.ts`) — every single one carries
  `.middleware([requireSupabaseAuth])`. No unauthenticated privileged
  server function exists.
- **The 3 routes that legitimately bypass `requireSupabaseAuth`** (they
  can't use it — the caller is Razorpay/Meta/a cron scheduler, not one of
  our signed-in users) all verify a shared secret before touching
  `supabaseAdmin`:
  `src/routes/api/public/webhooks/razorpay.ts` (HMAC-SHA256 over the raw
  body via `RAZORPAY_WEBHOOK_SECRET`, `timingSafeEqual`),
  `src/routes/api/public/hooks/whatsapp.ts` (Meta's `X-Hub-Signature-256`
  HMAC via `WHATSAPP_APP_SECRET`, `timingSafeEqual`, plus a separate
  verify-token handshake for `GET`), and
  `src/routes/api/public/hooks/customer-payment-reminders.ts` (bearer
  `CRON_SECRET`, `timingSafeEqual` with an added HMAC-based
  length-side-channel guard). All three correctly use timing-safe
  comparison rather than `===`.
- **Service-role (`supabaseAdmin`) usage sites** — same 4 files identified
  in the Sprint 1.8 audit (`users.functions.ts` and the 3 webhook/hook
  routes above), re-confirmed as the complete set and all legitimate:
  admin operations and unauthenticated inbound webhooks are exactly the
  two cases that need to bypass RLS.
- **`has_role(uid, role)` / `has_any_role(uid, roles)`** — the
  security-definer functions every RLS policy and every server-side
  permission check ultimately calls. Read the current definition
  (`supabase/migrations/20260722160002_has_role_super_admin_inheritance.sql`,
  Sprint 1.7.1) in full: `SECURITY DEFINER` with `SET search_path = public`
  pinned explicitly — the standard defense against the classic Postgres
  search-path-hijack risk for `SECURITY DEFINER` functions. Logic correctly
  implements the one documented inheritance rule (`super_admin` satisfies
  an `admin` check) without loosening anything else, and preserves the
  earlier role-lookup disclosure guard (a caller looking up someone else's
  role must themselves hold admin-or-above).
- **RLS policy coverage** — re-ran the Sprint 1.8 audit's static check
  (every `CREATE TABLE` has a matching `ENABLE ROW LEVEL SECURITY`) and
  went one step further this time: checked every RLS-enabled table also
  has at least one matching `CREATE POLICY`, to catch the case where RLS
  is enabled but zero policies exist (which would silently deny *all*
  access, including to admins — a production correctness bug, not a
  security hole). Two passes of a regex-based scan produced false
  positives (16 "gaps" total across both attempts) purely from two
  different `CREATE POLICY` naming conventions in the migration history —
  quoted string names (`CREATE POLICY "Staff manage dispatch items" ON
  ...`) on multiple lines, and bare identifier names (`CREATE POLICY
  grn_items_staff ON public.grn_items FOR ALL ...`) on one line. Manually
  inspected every flagged table's migration source directly; all 16 do
  have a policy — this was a static-analysis limitation, not a real gap.
  No RLS coverage issue found.

### Files changed

None. This milestone found no genuine defect to fix.

### Verification

```
npm run typecheck        clean
npm run typecheck:tests  clean
eslint (full repo)       7409 pre-existing problems, unchanged from the
                          documented baseline (docs/CI_LINT_DEBT.md) —
                          zero new issues, since zero files changed
bun test                 323 pass, 0 fail (unchanged from Milestone 1)
npm run build             succeeds
```

### Remaining blockers

- **Live database state is unverifiable from this sandbox.** Everything
  above is a static analysis of the migration files in this repo. Whether
  the live Supabase project has actually applied every one of these
  migrations — especially given the branch divergence the Sprint 1.8 audit
  found (1 migration only on `origin/main`, 6 only on
  `feature/vie-quotation`) — cannot be checked without Supabase
  dashboard/CLI credentials, which this sandbox doesn't have.
- **Auth provider configuration** (HIBP/leaked-password protection, email
  verification settings, session/JWT lifetime) lives entirely in the
  Supabase dashboard and was not and cannot be checked from here.
