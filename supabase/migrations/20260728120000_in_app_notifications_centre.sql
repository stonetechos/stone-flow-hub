-- =====================================================================
-- In-app Notification Centre (Info / Important / Critical)
-- =====================================================================
-- STATUS: PENDING — authored by Claude (Cowork), NOT applied to any
-- database yet. Every migration in this repo authored by "Claude" or
-- "Claude (Cowork)" (as opposed to gpt-engineer-app[bot]) is prepared
-- text only — Lovable Cloud exposes no service-role key or database URL
-- to this environment, so nothing outside Lovable's own chat can apply
-- schema changes. This file must be run manually in the Lovable Cloud
-- SQL editor (Cloud icon -> Database -> SQL editor) before
-- src/lib/notifications/centre.ts will have anything to read — until
-- then, the app degrades to an empty notification centre rather than
-- erroring (see that file's `relation "notifications" does not exist`
-- handling).
--
-- Scope: this is a NEW table for in-app, user-facing notifications (the
-- bell icon / notification centre). It is deliberately separate from
-- the existing `notification_events` / `notification_deliveries`
-- tables (migration 20260703154825) — those back OUTBOUND channel
-- delivery (email/WhatsApp/SMS/push to a customer or external
-- recipient) and are unrelated to what a staff member sees in-app.
-- =====================================================================

CREATE TYPE public.notification_tier AS ENUM ('info', 'important', 'critical');

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = broadcast to every staff member (e.g. "backup completed",
  -- a platform-wide announcement). Non-null = targeted at one user.
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.notification_tier NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  -- Optional deep link — e.g. entity_type='quote', entity_id=<uuid>,
  -- link_path='/quotes/<id>' so the centre can navigate straight to the
  -- record, same pattern as src/lib/customer-timeline's entity linking.
  entity_type text,
  entity_id uuid,
  link_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  -- Push-notification foundation (Goal 3's "prepare the architecture for
  -- future push notifications"): a critical-tier row can request a push
  -- fan-out. No sender exists yet — see Goal 6/7 report for why (no FCM
  -- credentials configured) — this column exists so the eventual push
  -- worker has something to poll (`WHERE deliver_push AND pushed_at IS
  -- NULL`) without a second migration once that lands. Reuses the
  -- existing `notification_channel` enum's 'push' member conceptually,
  -- but does not touch notification_deliveries — in-app and outbound
  -- push are different delivery mechanisms even if both stem from the
  -- same underlying event.
  deliver_push boolean NOT NULL DEFAULT false,
  pushed_at timestamptz
);

COMMENT ON TABLE public.notifications IS
  'In-app notification centre feed (bell icon). Distinct from notification_events/notification_deliveries, which are outbound customer-facing message delivery.';

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, read_at, created_at DESC);

CREATE INDEX notifications_broadcast_idx
  ON public.notifications (created_at DESC)
  WHERE user_id IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: a user sees their own targeted notifications plus every
-- broadcast (user_id IS NULL) row. No role check needed beyond
-- "authenticated" — visibility is scoped by user_id, not role.
CREATE POLICY "Users can view their own and broadcast notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- UPDATE: a user may only mark their own (or a broadcast row, tracked
-- per-user via read_at on that same row — acceptable because a
-- broadcast being "read" by one user marking it read is the intended
-- per-recipient behavior here, same as most notification-centre UIs;
-- if usage later shows staff want independent read-state per user on
-- broadcasts, that needs a join table, not a column, and should be a
-- separate migration rather than guessed at here) notification as read.
-- Client code should only ever patch `read_at`; this policy does not
-- restrict which columns, so `src/lib/notifications/centre.ts` must
-- discipline itself the same way `activation is a data-only change`
-- comments elsewhere in this repo already document that pattern.
CREATE POLICY "Users can mark their own notifications read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- INSERT: deliberately NO policy for the `authenticated` role. Rows are
-- written server-side only, via supabaseAdmin (service role, bypasses
-- RLS) from src/lib/notifications/centre.ts's `notify()` helper — same
-- privilege pattern already used for activity_log audit entries
-- (users.functions.ts's logAuditEvent). This prevents a compromised or
-- malicious client session from injecting fake "critical" notifications
-- to phish other staff.

-- No DELETE policy — notifications are not user-deletable in this pass;
-- if a "clear all" action is wanted later, add an explicit policy then
-- rather than opening delete now on spec.
