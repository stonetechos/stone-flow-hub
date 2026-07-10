
ALTER VIEW public.employees_sensitive SET (security_invoker = on);

REVOKE EXECUTE ON FUNCTION public.workforce_is_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workforce_upsert_task(text,text,uuid,text,public.workforce_task_priority,timestamptz,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workforce_close_task(text,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_employee_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_enquiry() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_po() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_dispatch() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_site_visit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_payment_schedule() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_wf_installation() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.workforce_is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
