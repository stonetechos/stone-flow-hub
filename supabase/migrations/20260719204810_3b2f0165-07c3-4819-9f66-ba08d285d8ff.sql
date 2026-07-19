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
  request_id uuid not null,
  raw_text text not null,
  language text not null,
  canonical_text text not null,
  intent text not null,
  entities jsonb not null default '{}'::jsonb,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  execution_mode vie_execution_mode,
  plan jsonb,
  plan_blockers jsonb,
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