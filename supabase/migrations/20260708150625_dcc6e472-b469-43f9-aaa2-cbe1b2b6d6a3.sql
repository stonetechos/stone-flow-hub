
REVOKE ALL ON FUNCTION public.record_project_milestone(uuid, text, timestamptz, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suggest_stage(uuid, uuid, public.lead_stage, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suggest_stage_for_project(uuid, public.lead_stage, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_sv_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_rfq_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_vq_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_prod_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_dispatch_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_install_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_quote_milestone() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_receipt_advance() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_project_milestone(uuid, text, timestamptz, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suggest_stage(uuid, uuid, public.lead_stage, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suggest_stage_for_project(uuid, public.lead_stage, text, text, text, uuid) TO authenticated, service_role;
