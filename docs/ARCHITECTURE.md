# Stone Tech OS — Architecture

Version 1.0 Foundation baseline. This document describes the shipped system, not aspirations.

## High-Level Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Routing / SSR | TanStack Start v1 + TanStack Router (file-based) |
| Build | Vite 7 |
| Server runtime | Cloudflare Workers (nodejs_compat) |
| Data / Auth / Storage | Supabase (Lovable Cloud), Postgres 15 |
| Server RPC | `createServerFn` from `@tanstack/react-start` |
| Server HTTP (webhooks, cron) | TanStack server routes under `src/routes/api/public/*` |
| Client data | TanStack Query v5 (loader `ensureQueryData` + `useSuspenseQuery`) |
| Styling | Tailwind v4 (native `@import` + `@theme` in `src/styles.css`) |
| Components | shadcn/ui primitives in `src/components/ui/*` |
| AI | Lovable AI Gateway (`LOVABLE_API_KEY`) |

## Module Relationships

```text
                       ┌─────────────┐
                       │  Customer   │
                       └──────┬──────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
        ┌─────────┐                       ┌─────────┐
        │ Enquiry │────────────────────▶  │ Project │
        └────┬────┘                       └────┬────┘
             ▼                                 │
        ┌─────────┐    convert     ┌────────┐  │
        │ Estimate│───────────────▶│  Quote │  │
        └─────────┘                └────┬───┘  │
                                        │ approve
                                        ▼
                                   ┌─────────┐
                                   │ Sales   │◀─┐
                                   │ Order   │  │  Vendor RFQ / Vendor Quote
                                   └────┬────┘  │
                       ┌────────────────┼───────┴─────────┐
                       ▼                ▼                 ▼
                 ┌──────────┐    ┌──────────────┐   ┌──────────┐
                 │Purchase  │    │Manufacturing │   │Dispatch  │
                 │Order + GRN│   │+ QC + Pieces │   │/ Delivery│
                 └──────────┘    └──────────────┘   └────┬─────┘
                                                         ▼
                                                  ┌──────────────┐
                                                  │ Installation │
                                                  └──────┬───────┘
                                                         ▼
                              ┌─────────┐          ┌──────────┐          ┌──────────┐
                              │Follow-up│◀────────│ Invoice  │────────▶ │  Receipt │
                              └─────────┘          └──────────┘          └────┬─────┘
                                                                              ▼
                                                                       Customer Ledger
```

Inventory bridges Purchase → Manufacturing → Dispatch via `inventory_movements`.
Activity Log, Comments, Attachments, Notifications and Timeline are cross-cutting entity panels available on every business record.

## Frontend Structure

```text
src/
  routes/                 file-based routes (do NOT hand-edit routeTree.gen.ts)
    __root.tsx            root shell, head metadata, providers
    index.tsx             public landing (redirects to /auth or /dashboard)
    auth.tsx              public sign-in
    _authenticated/       protected subtree (ssr:false, session gate)
      route.tsx           auth gate + AppShell
      dashboard.tsx, customers/, enquiries/, projects/, estimates/,
      quotes/, sales-orders/, purchase-orders/, dispatch/, invoices/,
      receipts/, payments/, vendor-payments/, manufacturing/, grns/,
      installations/, installation-teams/, inventory/, ledger/,
      workforce-intelligence/, dashboards/, reports.tsx, masters/,
      settings.tsx, admin/, activity.tsx, notifications.tsx …
    api/public/           unauthenticated HTTP endpoints
      hooks/              cron/scheduler targets (daily-digest, dispatch-queue,
                          customer-payment-reminders, workforce-daily, whatsapp)
      webhooks/razorpay.ts
    vendor/               vendor portal (separate session model)
    lovable/email/        Lovable email queue + auth webhook glue
    pay.$linkId.tsx       public payment link

  components/
    ui/                   shadcn primitives (kept complete — reserved)
    layout/               AppShell, PageHeader, Stat, States (EmptyState/ErrorBlock/LoadingBlock)
    forms/                FormLayout, FormSection, FormGrid, FormActions,
                          EntityPicker, QuickForm, QuickCreateDialog, Field
    data/                 DataToolbar, DataTableShell, TablePagination,
                          ColumnsMenu, DensityMenu, ConfirmDialog, RowActions
    entity/               DetailPanels, TasksPanel, CommentsPanel, EntityTags,
                          RelatedList, StatusPill, FavoriteButton, DetailActionBar
    global/               GlobalSearchDialog (Ctrl+K), NotificationsBell,
                          QuickCreateMenu, Breadcrumbs, DemoBadge
    <module>/             feature components (dispatch, installation, manufacturing,
                          quotes, rfqs, vendors, customer-payments, dashboard,
                          copilot, projects, masters, mdm, ownership,
                          settings, guided-workflow, vendor-portal, procurement)

  lib/                    domain APIs + schemas, one folder per module
    <module>/api.ts       server-fn wrappers + Query keys
    <module>/schema.ts    Zod validators
    query-invalidation.ts single source of truth for cache invalidation
    query-keys.ts         canonical query key builders
    nav/                  sidebar catalog + per-user preferences
    ai/                   AI Gateway client + Copilot services
    notifications/        queue, providers, templates, dispatch server fns
    executive/            command centre, KPIs, forecast, intel
    workforce/            employees, capacities, rule engine, scoring
    intelligence/         business health, risk, scoring, actions

  hooks/                  use-roles, use-auth-ready, use-table-prefs,
                          use-debounced-value, use-hotkey, use-mobile,
                          use-guided-*, use-online-status, use-install-prompt
  integrations/supabase/  auto-generated client, types, middleware, attacher
  styles.css              Tailwind v4 tokens
  routeTree.gen.ts        auto-generated — never edit
  router.tsx / start.ts / server.ts   TanStack Start bootstrap
```

## Backend Structure

- **`createServerFn`** — every app-internal DB read/write. Files named
  `*.functions.ts` live in `src/lib/**` and are safe for the client bundle
  (only handler bodies are stripped).
- **`requireSupabaseAuth`** middleware — attaches the signed-in user's
  bearer token to a server function; RLS applies as that user.
- **`supabaseAdmin`** (`client.server.ts`) — service-role client, imported
  lazily inside handlers for privileged/webhook work only.
- **Server routes** (`src/routes/api/public/*`) — Razorpay webhook, cron
  hooks, WhatsApp inbound. All verify signatures/secrets before writes.
- **Supabase database** — 126 tables, 199 triggers, 127 functions, 268 RLS
  policies, 468 indexes. All roles managed via `user_roles` +
  `has_role(uuid, app_role)` security-definer function.
- **Storage bucket** `stonetech-files` (private, RLS-scoped).
- **AI Gateway** — chat, embeddings, image analysis via `LOVABLE_API_KEY`;
  no per-provider keys required.

## PWA (Phase G.10A)

- `public/manifest.json`, `public/sw.js`, `public/offline.html`, `public/icons/*`
  — static, not built by a Vite plugin. `src/lib/pwa/register-service-worker.ts`
  registers the worker client-side from `__root.tsx`.
- **Hard boundary**: the service worker never intercepts Supabase
  (`*.supabase.co`) or same-origin `/api/*` requests — those stay
  network-only so RLS/auth behave identically online or with a worker
  installed. Only the static app shell (JS/CSS/fonts/icons) is cached,
  stale-while-revalidate.
- `src/lib/pwa/sync-queue.ts` — an IndexedDB pending-operations primitive
  + Background Sync registration. Foundation only: no mutation call site
  enqueues into it yet. A later phase would need to wire specific writes
  (estimates, quotes, dispatches, …) through it to get true offline
  editing.
- `src/hooks/use-online-status.ts` / `use-install-prompt.ts` +
  `src/components/layout/SyncStatusIndicator.tsx` — connectivity pill and
  install affordance mounted once in `AppShell`'s topbar.
- Icon source: `scripts/pwa/icon-source.svg` reproduces the existing
  `AppShell` sidebar gem badge (not a new mark); regenerate PNGs with
  `python3 scripts/pwa/generate_icons.py`.
- Android TWA/Bubblewrap packaging is explicitly out of scope here — next
  phase. Prep tracked in `docs/android-twa-prep.md` (package name, manifest
  readiness, Digital Asset Links status).

## Cross-Cutting Conventions

- All entity selects use `<EntityPicker>` (`src/components/forms/EntityPicker.tsx`).
- All full-page create/edit routes use `<FormLayout>` + `<FormSection>` + `<FormGrid>` + sticky `<FormActions>`.
- All list pages use `<DataToolbar>` + `<DataTableShell>` + `<TablePagination>` + `useTablePrefs`.
- All mutations invalidate through helpers in `src/lib/query-invalidation.ts`.
- All routes with a loader define `errorComponent` + `notFoundComponent`.
- All destructive actions go through `<ConfirmDialog>` or `<SafeDeleteDialog>`.
