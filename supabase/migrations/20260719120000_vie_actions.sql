-- Vedora Intelligence Engine (VIE) — Phase 1 persistence.
-- See ADR-0001 (Stone Tech OS project docs: engineering/ADR-0001-...) for
-- the full design rationale, including why `intent` is TEXT rather than an
-- enum, and why execution-policy thresholds live in app_settings instead of
-- a new table.

create type vie_execution_mode as enum ('auto', 'confirm', 'draft');

create type vie_action_status as enum (
  'pending',
  'planned',
  'awaiting_confirmation',
  'draft',
  'confirmed',
  'executing',
  'applied',
  'rejected',
  'failed'
);

create table public.vie_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),

  -- Idempotency key: the client generates one UUID per submission attempt.
  -- A retried/duplicated request with the same (created_by, request_id)
  -- pair never creates a second row (see vie.functions.ts).
  request_id uuid not null,

  -- VIE output (understanding) — produced by understand.ts, never a write.
  raw_text text not null,
  language text not null,
  canonical_text text not null,
  -- Deliberately TEXT, not an enum: new intents are additive and
  -- module-registered via the Action Registry, so adding one should never
  -- require a migration to this table. Validity is enforced in application
  -- code by the VieIntent union in src/lib/vie/types.ts.
  intent text not null,
  entities jsonb not null default '{}'::jsonb,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),

  -- Planner output — produced by planner/index.ts, never a write.
  execution_mode vie_execution_mode,
  plan jsonb,
  plan_blockers jsonb,

  -- Workflow Engine output / lifecycle — produced by workflowEngine.ts,
  -- the only place in this feature that writes to a business table (via
  -- the module handlers under src/lib/vie/actions/).
  status vie_action_status not null default 'pending',
  linked_record_type text,
  linked_record_id uuid,
  applied_at timestamptz,
  error_message text,

  constraint vie_actions_created_by_request_id_key unique (created_by, request_id)
);

create index vie_actions_status_idx on public.vie_actions (status);
create index vie_actions_created_by_idx on public.vie_actions (created_by);

alter table public.vie_actions enable row level security;

-- Staff-only, matching every other AI endpoint (requireStaff /
-- has_staff_access()). Not scoped to created_by = auth.uid(): staff already
-- share visibility across the rest of this ERP's business data, and a
-- manager reviewing a teammate's pending AI actions is an expected use case.
create policy "staff can read vie_actions"
  on public.vie_actions for select
  to authenticated
  using (has_staff_access(auth.uid()));

create policy "staff can insert vie_actions"
  on public.vie_actions for insert
  to authenticated
  with check (has_staff_access(auth.uid()));

create policy "staff can update vie_actions"
  on public.vie_actions for update
  to authenticated
  using (has_staff_access(auth.uid()))
  with check (has_staff_access(auth.uid()));
