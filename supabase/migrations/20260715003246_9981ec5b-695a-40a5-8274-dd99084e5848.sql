-- Phase G.8.6 Task 3 — Unified Insight Alert Lifecycle
--
-- The G.8.5 audit found that "seen/dismissed" state for an insight is
-- tracked independently per surface: DangerNotifications.tsx keeps a
-- sessionStorage-only set (lost on new browser session, never shared),
-- while Copilot's Insights panel, EntityInsightPanel (customer/vendor
-- pages), and the business-health dashboard all re-render the exact same
-- signal with no memory of it at all. A user can act on an insight in one
-- surface and still see it flagged as new everywhere else.
--
-- This migration adds one small, user-scoped lifecycle table so every
-- consumer of the existing Insight Provider registry (lib/insights/*) can
-- read and write the same New -> Seen -> Acknowledged -> Resolved /
-- Dismissed state. It does not touch insight *generation* (the providers
-- themselves are untouched, pure, deterministic) — only what a given user
-- has already done about a given insight.
--
-- Key design choice: insights are computed on the fly (not stored rows),
-- but every Insight already carries a stable compound identity —
-- `source` (provider id) + `id` (stable within that provider) — used
-- throughout lib/insights/quality/* for de-dupe and by InsightList for
-- React keys. This table reuses that exact same key rather than inventing
-- a new one, per the "reuse first" principle.
--
-- Modeled directly on the existing `favorites` table (same user-scoped,
-- RLS-by-auth.uid() shape) rather than a new pattern.

CREATE TABLE public.insight_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_source text NOT NULL,
  insight_id text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'acknowledged', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, insight_source, insight_id)
);

CREATE INDEX insight_states_user_idx ON public.insight_states(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_states TO authenticated;
GRANT ALL ON public.insight_states TO service_role;

ALTER TABLE public.insight_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own insight states" ON public.insight_states
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own insight states" ON public.insight_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own insight states" ON public.insight_states
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own insight states" ON public.insight_states
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reuses the existing generic updated_at trigger function (see e.g.
-- trg_grn_updated, trg_vpay_updated, trg_refund_updated) rather than
-- defining a new one.
CREATE TRIGGER trg_insight_states_updated
  BEFORE UPDATE ON public.insight_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
