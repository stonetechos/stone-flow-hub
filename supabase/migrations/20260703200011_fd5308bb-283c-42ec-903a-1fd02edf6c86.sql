-- Milestone 4 hardening: remove legacy broad policies that undermined vendor isolation.
-- These allowed any authenticated user (including vendor users) to read all vendor quotes/requests.
DROP POLICY IF EXISTS "vq auth all" ON public.vendor_quotes;
DROP POLICY IF EXISTS "vr auth all" ON public.vendor_requests;

-- Ensure decision timestamps default cleanly (idempotent no-ops if already applied).
ALTER TABLE public.vendor_quotes
  ALTER COLUMN is_approved SET DEFAULT false;