
-- lock search_path on every function we created
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.assign_customer_code() SET search_path = public;
ALTER FUNCTION public.assign_project_code() SET search_path = public;
ALTER FUNCTION public.assign_product_code() SET search_path = public;
ALTER FUNCTION public.assign_vendor_code() SET search_path = public;
ALTER FUNCTION public.assign_enquiry_code() SET search_path = public;
ALTER FUNCTION public.assign_rfq_code() SET search_path = public;
ALTER FUNCTION public.log_enquiry_stage_change() SET search_path = public;
ALTER FUNCTION public.log_activity() SET search_path = public;

-- revoke anon execute on internal helpers
REVOKE EXECUTE ON FUNCTION public.next_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_code(text) TO authenticated, service_role;
