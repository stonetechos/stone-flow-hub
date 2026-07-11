# Stone Tech OS — Security (v1.0)

## Row-Level Security

- **RLS enabled on every `public.*` table** (126 tables, 268 policies).
- Every table also has explicit `GRANT` statements — Supabase does not grant
  Data API access by default in the `public` schema.
- Owner-scoped policies use `auth.uid() = <owner column>`; team-scoped
  policies use `public.has_role(auth.uid(), <role>)`.
- Public read endpoints (payment-link view, email unsubscribe) use narrow
  `TO anon` SELECT policies on specific columns only.

## Role Model

- Roles live only in `public.user_roles`. Never on `profiles` or `users`.
- Canonical check: `public.has_role(_user_id uuid, _role app_role)` —
  `SECURITY DEFINER`, `STABLE`, `SET search_path = public`.
- `app_role` enum: `admin`, `manager`, `sales`, `operations`, `finance`,
  `installer`, `vendor` (see `supabase/migrations/*_roles_*.sql`).
- UI role gating uses `<Can>` + `useRoles()` (`src/hooks/use-roles.tsx`).

## SECURITY DEFINER Functions

- All privileged helpers pin `SET search_path = public` and have
  `EXECUTE` revoked from `anon`.
- `has_role()` is the single source of truth for role checks; other RLS
  policies must call it (never inline `SELECT ... FROM user_roles`) to
  avoid recursion.
- See `docs/rc2-security-report.md` for the hardening pass applied at RC-2.

## Authentication

- Supabase Auth. Email/password + Google OAuth (via Lovable broker —
  `lovable.auth.signInWithOAuth('google', …)`).
- Anonymous sign-ins **disabled** (verified RC-2).
- HIBP password check **enabled**.
- Email verification **required**.
- `_authenticated` layout is `ssr: false` and gates the whole subtree
  client-side; server functions re-validate via
  `requireSupabaseAuth` middleware attached in `src/start.ts`.
- Public route loaders never call `requireSupabaseAuth` functions
  (would 401 during SSR prerender).

## Server-Side Access Model

| Client | When | RLS |
|---|---|---|
| `@/integrations/supabase/client` | Browser components | As user |
| Server publishable (in-handler) | Public read fns / server routes | As anon |
| `requireSupabaseAuth` (server fn) | User-scoped writes/reads | As user |
| `supabaseAdmin` (`client.server.ts`) | Verified webhooks + admin ops | BYPASSED |

`SUPABASE_SERVICE_ROLE_KEY` is server-only and never surfaces to the
browser. `supabaseAdmin` is imported lazily inside handlers in
`.functions.ts` modules so it never leaks into client bundles.

## Storage

- Bucket `stonetech-files` — **private**. Access via signed URLs generated
  server-side. Every file row is tracked in `file_objects` with owner and
  entity link.

## Webhooks & Public Endpoints (`/api/public/*`)

- **Razorpay** (`/api/public/webhooks/razorpay`) — HMAC-SHA256 signature
  verified with `timingSafeEqual` before any DB write.
- **Cron hooks** (`/api/public/hooks/*`) — protected by a shared secret
  header verified inside each handler.
- No user PII returned from any public endpoint.

## Recent Hardening (RC-1 → v1.0)

- RC-2: SECURITY DEFINER hardening, `search_path` pinned, anon EXECUTE
  revoked, 17 accepted WARN documented.
- RC-3: 21 performance indexes on hot filter/join paths (no security
  regressions).
- Post-RC-4: nav-preferences render loop fix (`src/lib/nav/preferences.ts`)
  and duplicate-`activity_log` cleanup migration
  (`20260711185413_...`). Trigger logic unchanged.

## Accepted Security Exceptions

Documented in `docs/rc2-security-report.md`:

- 17 Supabase linter WARN: `authenticated can execute SECURITY DEFINER` —
  accepted because every one of those functions is idempotent, scoped to
  the caller's `auth.uid()`, and used by legitimate UI flows.

## Not Supported on Lovable Cloud

- `SUPABASE_SERVICE_ROLE_KEY` and DB password are not exposed to users.
- No `pg_cron` — schedule external hits against `/api/public/hooks/*`.
- No direct Supabase Dashboard access — all backend surfaces are inside
  the Lovable app.
