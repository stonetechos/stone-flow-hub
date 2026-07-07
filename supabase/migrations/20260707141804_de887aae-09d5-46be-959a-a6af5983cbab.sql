
-- 1) SECURITY DEFINER view -> switch to security_invoker
ALTER VIEW public.customer_ledger SET (security_invoker = on);

-- 2) Lock down SECURITY DEFINER functions: revoke PUBLIC, grant only where needed.
-- Trigger + admin functions: no direct execute grants.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_single_approved_quote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_vendor_perf_po() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_vendor_perf_vq() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_vendor_perf_vr() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_receipt_alloc_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_vendor_performance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_notification_event(public.notification_event, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_demo_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon, authenticated;

-- RLS/session helpers: callable by signed-in users only (used by policies).
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

REVOKE ALL ON FUNCTION public.current_demo_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_demo_mode() TO authenticated;

REVOKE ALL ON FUNCTION public.current_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_vendor_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_vendor_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_vendor_of(uuid, uuid) TO authenticated;

-- Staff RPCs: authenticated only; functions still enforce role checks internally.
REVOKE ALL ON FUNCTION public.recommend_vendors_for_rfq(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_vendors_for_rfq(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.send_to_manufacturing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_to_manufacturing(uuid) TO authenticated;

-- 3) Drop the broken dispatches vendor policy (permanently AND false).
DROP POLICY IF EXISTS "disp_vendor_read" ON public.dispatches;

-- 4) Explicit staff-only INSERT policy on vendor_users (in addition to existing ALL policy).
DROP POLICY IF EXISTS "vu_staff_insert" ON public.vendor_users;
CREATE POLICY "vu_staff_insert" ON public.vendor_users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));
