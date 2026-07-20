# Stone Tech OS — Deployment (v1.0)

Successor to `docs/deployment-guide.md` (kept for historical reference).

## Runtime

- Cloudflare Workers (nodejs_compat) — served via Lovable hosting.
- Supabase Postgres 15 + Storage + Auth (Lovable Cloud).
- AI: Lovable AI Gateway (no per-provider keys required).

## Environments

| Env           | URL                                     | Notes               |
| ------------- | --------------------------------------- | ------------------- |
| Preview       | `project--{project-id}-dev.lovable.app` | Auto-built on save  |
| Production    | `project--{project-id}.lovable.app`     | On **Publish**      |
| Custom domain | `erp.stonetech.in`                      | CNAME to production |

Preview and production share the same Supabase database. Destructive
scripts must gate on `is_demo=true` and admin role.

## Environment Variables

### Client (bundled, safe)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Server (never in the browser)

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — Lovable-managed; not user-accessible
- `LOVABLE_API_KEY` — **required** for AI Gateway
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
  — optional; without them, payment links stay in queued state
- `RESEND_API_KEY` — optional; without it, email deliveries queue
- `WHATSAPP_PHONE_ID` / `WHATSAPP_TOKEN` — optional; without them, WA
  deliveries queue
- `CRON_SHARED_SECRET` — required if you enable external cron hooks

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
the client bundle and Worker-compatible SSR bundle.

## Deploy

- **Publish** button in Lovable — snapshots the current build to
  `project--{project-id}.lovable.app` and the custom domain.
- Migrations are applied through `supabase--migration` (reviewed → run).
  All migrations are forward-only.

## Production Checklist

1. `bunx tsgo --noEmit` — 0 errors.
2. `bun run build` — succeeds; bundle sizes reviewed.
3. `security--run_security_scan` — 0 ERROR (WARN reviewed against
   `docs/rc2-security-report.md`).
4. Latest migration is applied on production DB.
5. Required secrets present: `LOVABLE_API_KEY` (+ any provider secrets you
   intend to use).
6. Storage bucket `stonetech-files` remains **private**.
7. RLS enabled on all `public.*` tables (verified in the SQL linter).
8. Auth: HIBP on, email verification on, anonymous sign-in off.
9. External cron pointed at:
   - `POST /api/public/hooks/daily-digest`
   - `POST /api/public/hooks/customer-payment-reminders`
   - `POST /api/public/hooks/dispatch-queue`
   - `POST /api/public/hooks/workforce-daily`
     (send `x-cron-secret: $CRON_SHARED_SECRET`)
10. Manual smoke: `/auth` loads, sign in, `/dashboard` renders, one create
    flow end-to-end (see `docs/rc1-manual-qa.md`).

## Post-Publish Verification

- Sign in as admin → run the manual QA checklist.
- Hit each `/api/public/hooks/*` endpoint from the scheduler and confirm
  `200`.
- Watch `message_queue` drain (or stay queued if provider secrets absent —
  expected).

## Rollback

Backend → Deployments → previous build → **Rollback**. Migrations are
additive; the DB stays compatible with the prior UI.
