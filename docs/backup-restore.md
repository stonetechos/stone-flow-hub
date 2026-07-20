# Backup & Restore

## Automatic

- **Postgres** — daily managed backups, 7-day retention (Lovable Cloud default).
- **Storage** — bucket `stonetech-files` replicated by the platform.

## Manual

- **Full CSV export** — `/settings/export` (admin only) writes a zip of every business table to storage.
- **SQL dump** — use the "Download SQL backup" action in the backend panel weekly, store off-site.

## Restore procedure

1. Open Backend → **Backups** → pick point-in-time.
2. Confirm restore into a preview branch first, verify data.
3. Promote to production when validated.
4. Re-run `reset_demo_data()` if demo rows resurfaced.

## Migration rollback

Migrations are additive and forward-only. To reverse a change:

1. Write a compensating migration (`DROP INDEX ...`, `ALTER ...`).
2. Never edit or delete existing files under `supabase/migrations/`.

## Version rollback

- Use Backend → **Deployments** → **Rollback** to any previous published build.
- Client and server functions redeploy together; no partial rollback.

## RPO / RTO

- RPO: ≤ 24 h (daily snapshots).
- RTO: ~30 min for full restore, ~5 min for build rollback.
