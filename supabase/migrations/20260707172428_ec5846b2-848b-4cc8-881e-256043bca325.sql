
ALTER VIEW public.customer_payment_dashboard SET (security_invoker = true);

ALTER FUNCTION public.assign_grn_no()                            SET search_path = public;
ALTER FUNCTION public.assign_installation_no()                   SET search_path = public;
ALTER FUNCTION public.assign_installation_team_code()            SET search_path = public;
ALTER FUNCTION public.assign_vendor_payment_no()                 SET search_path = public;
ALTER FUNCTION public.default_payment_schedule_for(text, numeric) SET search_path = public;
ALTER FUNCTION public.finalize_installation_on_signoff()         SET search_path = public;
ALTER FUNCTION public.sync_installation_progress_pct()           SET search_path = public;
ALTER FUNCTION public.sync_lifecycle_is_active()                 SET search_path = public;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS s, p.proname AS f,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public;',
                   r.s, r.f, r.args);
  END LOOP;
END $$;

DO $$
DECLARE
  internal text[] := ARRAY[
    'enforce_single_approved_quote',
    'grn_item_after_del',
    'grn_item_after_ins',
    'handle_new_user',
    'log_notification_event',
    'next_code',
    'procurement_lock_check',
    'recalc_vendor_performance',
    'sync_installation_from_sales_order',
    'trg_recalc_vendor_perf_po',
    'trg_recalc_vendor_perf_vq',
    'trg_recalc_vendor_perf_vr',
    'trg_receipt_alloc_sync',
    'vendor_ledger_upsert',
    'vendor_payment_after_del',
    'vendor_payment_after_ins'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS s, p.proname AS f,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.proname = ANY(internal)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated;',
                   r.s, r.f, r.args);
  END LOOP;
END $$;
