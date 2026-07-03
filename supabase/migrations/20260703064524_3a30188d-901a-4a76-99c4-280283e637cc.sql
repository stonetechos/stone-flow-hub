CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
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
                        'quotes','sales_orders','purchase_orders','invoices') THEN
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
  END IF;

  v_summary := TG_TABLE_NAME || ' ' || v_action;

  INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary, actor_id)
  VALUES (TG_TABLE_NAME, v_entity_id, v_project_id, v_action, v_summary, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['quotes','sales_orders','purchase_orders','dispatches','invoices','payments']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_%s_activity ON public.%s', t, t);
    EXECUTE format(
      'CREATE TRIGGER log_%s_activity AFTER INSERT OR UPDATE OR DELETE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.log_activity()',
      t, t);
  END LOOP;
END$$;

-- Backfill activity for existing rows so the seeded workflow shows a full timeline
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'quotes', q.id, q.project_id, 'created', 'quotes created' FROM public.quotes q
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='quotes' AND a.entity_id=q.id);
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'sales_orders', s.id, s.project_id, 'created', 'sales_orders created' FROM public.sales_orders s
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='sales_orders' AND a.entity_id=s.id);
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'purchase_orders', p.id, p.project_id, 'created', 'purchase_orders created' FROM public.purchase_orders p
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='purchase_orders' AND a.entity_id=p.id);
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'dispatches', d.id, so.project_id, 'created', 'dispatches created'
  FROM public.dispatches d LEFT JOIN public.sales_orders so ON so.id=d.sales_order_id
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='dispatches' AND a.entity_id=d.id);
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'invoices', i.id, i.project_id, 'created', 'invoices created' FROM public.invoices i
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='invoices' AND a.entity_id=i.id);
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'payments', pm.id, inv.project_id, 'created', 'payments created'
  FROM public.payments pm LEFT JOIN public.invoices inv ON inv.id=pm.invoice_id
  WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.entity_type='payments' AND a.entity_id=pm.id);