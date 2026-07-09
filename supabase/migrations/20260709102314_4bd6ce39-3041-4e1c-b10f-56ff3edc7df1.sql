
CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action public.activity_action;
  v_entity_id uuid;
  v_project_id uuid;
  v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_entity_id := NEW.id;
  ELSE
    v_action := 'deleted';
    v_entity_id := OLD.id;
  END IF;

  IF TG_TABLE_NAME IN ('enquiries','followups','rfqs','site_visits','project_notes',
                        'quotes','sales_orders','purchase_orders','invoices',
                        'grns','vendor_payments','installations') THEN
    IF TG_OP = 'DELETE' THEN
      v_project_id := (to_jsonb(OLD)->>'project_id')::uuid;
    ELSE
      v_project_id := (to_jsonb(NEW)->>'project_id')::uuid;
    END IF;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_project_id := v_entity_id;
  ELSIF TG_TABLE_NAME = 'dispatches' THEN
    SELECT so.project_id INTO v_project_id
      FROM public.sales_orders so
      WHERE so.id = COALESCE((to_jsonb(NEW)->>'sales_order_id')::uuid,
                             (to_jsonb(OLD)->>'sales_order_id')::uuid);
  ELSIF TG_TABLE_NAME = 'payments' THEN
    SELECT inv.project_id INTO v_project_id
      FROM public.invoices inv
      WHERE inv.id = COALESCE((to_jsonb(NEW)->>'invoice_id')::uuid,
                              (to_jsonb(OLD)->>'invoice_id')::uuid);
  ELSIF TG_TABLE_NAME = 'receipts' THEN
    SELECT inv.project_id INTO v_project_id
      FROM public.receipt_allocations ra
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE ra.receipt_id = COALESCE(v_entity_id,
                                     (to_jsonb(OLD)->>'id')::uuid)
      LIMIT 1;
  END IF;

  v_summary := TG_TABLE_NAME || ' ' || v_action;

  -- Audit trail is best-effort. It must NEVER abort the business mutation
  -- that produced it. Any failure here (RLS, constraint, missing session)
  -- is captured and logged so the parent transaction still commits.
  BEGIN
    INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary, actor_id)
    VALUES (TG_TABLE_NAME, v_entity_id, v_project_id, v_action, v_summary, auth.uid());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'log_activity(%,%): audit insert failed: % (%)',
      TG_TABLE_NAME, v_action, SQLERRM, SQLSTATE;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
