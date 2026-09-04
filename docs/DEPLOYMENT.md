# Stone Tech OS — Deployment (v2.0)

Successor to `docs/deployment-guide.md` and DEPLOYMENT v1.0 (kept for
historical reference). v2.0 replaces Lovable's Publish button, Lovable's AI
Gateway, and Lovable's auth-email relay with a self-owned pipeline: GitHub
Actions deploys directly to Cloudflare, AI calls go to OpenRouter, and
auth/transactional emails go through Resend. Nothing in production now
requires a Lovable account, dashboard, or billing relationship — see
`engineering/erp-domain-boot-screen-diagnosis-2026-09-04.md` (Claude
Project) for the incident that motivated this and
`engineering/deploy-independence-runbook-2026-09-04.md` for the one-time
cutover steps (Cloudflare API token, GitHub secrets, Resend domain
verification, Supabase Auth Hook reconfiguration).

`@lovable.dev/vite-tanstack-config` and `@lovable.dev/mcp-js` remain as
plain npm dependencies (the Vite/Nitro build preset and the app's own `/mcp`
feature, respectively) — kept deliberately, since they're published
packages with no runtime call-out to Lovable's account/servers, unlike the
three above which required an active Lovable relationship to keep working.

## Runtime

- Cloudflare Workers (nodejs_compat), deployed directly via Wrangler from
  GitHub Actions.
- Supabase Postgres 15 + Storage + Auth (a normal Supabase project — SQL
  Editor and dashboard access work exactly as with any other Supabase
  project).
- AI: OpenRouter (OpenAI-compatible chat completions,
  `OPENROUTER_API_KEY`).
- Auth/transactional email: Resend (`RESEND_API_KEY`), receiving Supabase's
  native Auth "Send Email" webhook directly.

## Environments

| Env           | URL                 | Notes                                             |
| ------------- | ------------------- | -------------------------------------------------- |
| Production    | `*.workers.dev`      | Every push to `main` that passes CI, via `deploy.yml` |
| Custom domain | `erp.stonetech.in`   | Attached to the Worker as a Cloudflare custom domain (`routes` in the generated wrangler config — see `scripts/prepare-wrangler-deploy.mjs`) |

There is no separate Preview environment in this pipeline (Lovable's
Preview/Production split is gone). A pull request only runs CI
(typecheck/lint/test/build) — nothing is deployed until it merges to
`main`. If a PR-preview deploy is wanted later, `wrangler versions upload`
against a PR branch is the natural extension; not built yet.

## Environment Variables

### Client (bundled, safe — baked into the JS bundle at build time)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Set as **GitHub Actions repo secrets** (Settings → Secrets and variables →
Actions) — `deploy.yml`'s build step injects them via `env:`. Because
these are compiled into the bundle at build time, changing one requires a
new deploy (a new push to `main`), not just updating the secret.

### Server (never in the browser — pushed to the Worker as Wrangler secrets on every deploy)

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` — **required** for every AI feature (Copilot, Growth
  Advisory, VIE, the daily digest)
- `RESEND_API_KEY` — **required** for auth emails (signup/reset/magic
  link/invite) and for the `dispatch.server.ts` transactional-email
  provider
- `SUPABASE_AUTH_HOOK_SECRET` — **required**; the Standard Webhooks secret
  Supabase generates when you point its Auth "Send Email" hook at
  `POST /api/public/hooks/auth-email` (Supabase dashboard → Authentication
  → Hooks). Verifies that hook deliveries genuinely came from this
  Supabase project.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` —
  optional; without them, payment links stay in queued state
- `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` /
  `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` — optional;
  without them, WhatsApp deliveries queue
- `CRON_SECRET` (alias: `CRON_SHARED_SECRET`) — required to enable
  `customer-payment-reminders` and `workforce-daily`, the two cron
  endpoints that require a shared-secret bearer/`x-cron-secret` header (see
  the Production Checklist below), and also gates the email-template
  preview endpoint (`/api/public/hooks/email-preview`). Both cron endpoints
  accept either name, `CRON_SECRET` checked first — set one, not both.

All of the above (except the client `VITE_*` three) are also set as
**GitHub Actions repo secrets**; `deploy.yml` pushes them to the Worker via
`wrangler secret bulk` on every deploy, so the Worker's secret set always
matches what's in GitHub — no separate manual `wrangler secret put` step
needed for routine changes (only for the one-time Cloudflare API token
itself, which the workflow needs in order to authenticate at all —
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`, also GitHub repo secrets).

Client env is loaded via `import.meta.env.VITE_*`. Server env is read via
`process.env.*` **inside `.handler()` bodies only** — never at module scope
of shared files.

## Build

```bash
bun install
bun run build       # production
bun run build:dev   # preview / SSR-safe smoke
```

Vite plugin `@tailwindcss/vite` handles Tailwind v4. TanStack Start's Vite
plugin generates `src/routeTree.gen.ts` (never hand-edited) and emits both
the client bundle and Worker-compatible SSR bundle. Nitro's
`cloudflare-module` preset also generates `.output/server/wrangler.json` —
this is the config that's actually deployed (see the header comment in the
repo-root `wrangler.jsonc` for why it differs).

## Deploy

- `.github/workflows/deploy.yml` runs automatically after CI (`ci.yml`)
  succeeds on `main`: builds with the `VITE_*` secrets, patches the
  generated wrangler config to attach `erp.stonetech.in`
  (`scripts/prepare-wrangler-deploy.mjs`), pushes the server secrets
  (`scripts/wrangler-secrets-payload.mjs` + `wrangler secret bulk`), then
  `wrangler deploy`.
- No manual "Publish" step. Merging to `main` (through CI) is the deploy
  trigger.
- Migrations are pasted into the Supabase SQL Editor by hand and reviewed
  before running — this hasn't changed. All migrations are forward-only.

## Production Checklist

1. `npx tsc --noEmit` — 0 errors.
2. `bun run build` — succeeds; bundle sizes reviewed.
3. Latest migration is applied on production DB (Supabase SQL Editor).
4. Required GitHub Actions secrets present: `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `OPENROUTER_API_KEY`,
   `RESEND_API_KEY`, `SUPABASE_AUTH_HOOK_SECRET` (+ any optional provider
   secrets you intend to use).
5. Storage bucket `stonetech-files` remains **private**.
6. RLS enabled on all `public.*` tables (verified in the SQL linter).
7. Auth: HIBP on, email verification on, anonymous sign-in off.
8. Resend's sending domain (`erp.stonetech.in` or a `notify.` subdomain of
   it) is verified in the Resend dashboard (SPF/DKIM DNS records added).
9. Supabase Authentication → Hooks → Send Email hook points at
   `https://erp.stonetech.in/api/public/hooks/auth-email`, with the
   Standard Webhooks secret it generated saved as
   `SUPABASE_AUTH_HOOK_SECRET`. Verified via Supabase's own "Send test
   request" button before relying on it for real users.
10. External cron pointed at:
    - `POST /api/public/hooks/daily-digest`
      (send `apikey: $SUPABASE_SERVICE_ROLE_KEY`)
    - `POST /api/public/hooks/customer-payment-reminders`
      (send `x-cron-secret: $CRON_SECRET`)
    - `POST /api/public/hooks/dispatch-queue`
      (send an admin/Super Admin user's access token as
      `Authorization: Bearer …`)
    - `POST /api/public/hooks/workforce-daily`
      (send `x-cron-secret: $CRON_SECRET`)
    - `POST /api/public/hooks/email-queue-process` (send
      `x-cron-secret: $CRON_SECRET`) — drains the auth/transactional email
      queue to Resend; needs its own scheduled trigger same as the others
11. Manual smoke: `/auth` loads, sign in, `/dashboard` renders, one create
    flow end-to-end (see `docs/rc1-manual-qa.md`), one real signup/password
    reset to confirm Resend delivery.

## Post-Deploy Verification

- `curl https://erp.stonetech.in/api/public/diagnostics/env-status` — all
  fields `true` (or the ones you intend to use).
- Sign in as admin → run the manual QA checklist.
- Hit each `/api/public/hooks/*` endpoint from the scheduler and confirm
  `200`.
- Watch `message_queue` drain (or stay queued if provider secrets absent —
  expected).

## Rollback

`wrangler rollback` against the Worker (Cloudflare keeps prior deployment
versions), or re-run `deploy.yml` against an earlier commit
(`workflow_dispatch` with a `ref`, or revert-and-push). Migrations are
additive; the DB stays compatible with the prior UI.
