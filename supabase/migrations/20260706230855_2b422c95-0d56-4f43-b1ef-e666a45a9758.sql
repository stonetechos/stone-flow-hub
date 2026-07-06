
-- Trigger-only helpers: no direct client execution
REVOKE EXECUTE ON FUNCTION public.next_code(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_project_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_product_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_customer_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_vendor_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_enquiry_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_rfq_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_quote_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_invoice_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_payment_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_payment_link_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_po_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_so_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_stock_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_dispatch_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_mfg_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_enquiry_stage_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_quote_totals(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_quote_item_touch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_quote_item_recalc() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_invoice_item_touch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_invoice_item_recalc() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_payment_recalc() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_totals(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_vendor_performance(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vr() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vq() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_po() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_single_approved_quote() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_edit_approved_quote() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_production_stages() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_notification_event(notification_event, text, uuid, jsonb) FROM anon, PUBLIC;

-- RLS helpers and RPCs remain callable by signed-in users only (revoke anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_staff_access(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_vendor_of(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_vendor_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_rfq(uuid, uuid[], date, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_to_manufacturing(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recommend_vendors_for_rfq(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, date) FROM anon, PUBLIC;
