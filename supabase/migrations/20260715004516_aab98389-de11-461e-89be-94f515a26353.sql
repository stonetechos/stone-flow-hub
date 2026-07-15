-- Phase G.8.7 Task 4 — Extend the unified insight lifecycle
--
-- G.8.6 Task 3 shipped insight_states with 5 statuses (new, seen,
-- acknowledged, resolved, dismissed). This phase's spec calls for a
-- 7-state shared lifecycle: the same 5 plus Expired and Snoozed (with
-- "Future reminder" as a snooze-until-a-chosen-date, not an 8th status —
-- see the design note in the phase deliverable for why that's the
-- smallest correct modeling: a reminder IS a snooze, just one where the
-- until-date was chosen by the user rather than a default duration).
--
-- Additive only: widens the existing CHECK constraint and adds one
-- nullable column. No existing row's status changes meaning, no existing
-- consumer breaks — `snoozed_until` is simply NULL for every row written
-- before this migration.

ALTER TABLE public.insight_states
  DROP CONSTRAINT insight_states_status_check;

ALTER TABLE public.insight_states
  ADD CONSTRAINT insight_states_status_check
  CHECK (status IN ('new', 'seen', 'acknowledged', 'resolved', 'dismissed', 'expired', 'snoozed'));

ALTER TABLE public.insight_states
  ADD COLUMN snoozed_until timestamptz;

COMMENT ON COLUMN public.insight_states.snoozed_until IS
  'Only meaningful when status = ''snoozed''. The insight is hidden from every "active" consumer view until this timestamp, then reverts to being surfaced again (as if newly seen). Also used for user-chosen "remind me on this date" reminders — same mechanism, the until-date is just user-picked instead of a default duration.';
