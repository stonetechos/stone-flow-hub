# Deployment Guide

## Stack

- TanStack Start v1 (React 19, Vite 7) — SSR + client bundle
- Cloudflare Workers runtime (nodejs_compat)
- Supabase (Lovable Cloud) — Postgres 15, Storage, Auth
- AI Gateway (Lovable) — `LOVABLE_API_KEY`

## Environments

| Env        | URL                                     | Notes              |
| ---------- | --------------------------------------- | ------------------ |
| Preview    | `project--{project-id}-dev.lovable.app` | Auto on every save |
| Production | `project--{project-id}.lovable.app`     | On **Publish**     |

Preview and production share the **same Supabase database**. Isolate destructive scripts with `is_demo=true` flag and role gating.

## Publish checklist

1. RC-1 → RC-4 reports reviewed (`docs/rc*-*.md`).
2. All Supabase migrations applied (`supabase/migrations/` — 48 files at v1.0.0).
3. Secrets present: `LOVABLE_API_KEY` (mandatory), plus any provider secret you intend to activate.
4. Storage bucket `stonetech-files` is **private** (verified).
5. RLS enabled on all `public.*` tables (verified).
6. Auth: HIBP on, email verification on, anonymous sign-in off (RC-2).
7. Scheduled jobs pointed at `/api/public/hooks/*`.
8. `security--run_security_scan` returns 0 ERROR.
9. Click **Publish**.

## Post-publish

- Verify `/auth` loads, `/dashboard` reachable.
- Sign in as `admin`, run the manual QA checklist (`docs/rc1-manual-qa.md`).
- Hit `POST /api/public/hooks/daily-digest` from your scheduler and confirm 200.

## Rollback

Backend → Deployments → previous build → **Rollback**. Migrations are additive; the DB stays compatible with the prior UI.
