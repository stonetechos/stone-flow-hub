
-- 1) Extend log_activity to derive project_id for the new tables
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
    -- receipts have no project_id column; derive via first allocation → invoice
    SELECT inv.project_id INTO v_project_id
      FROM public.receipt_allocations ra
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE ra.receipt_id = COALESCE(v_entity_id,
                                     (to_jsonb(OLD)->>'id')::uuid)
      LIMIT 1;
  END IF;

  v_summary := TG_TABLE_NAME || ' ' || v_action;

  INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary, actor_id)
  VALUES (TG_TABLE_NAME, v_entity_id, v_project_id, v_action, v_summary, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2) Register triggers on the new tables (idempotent)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['receipts','grns','vendor_payments','installations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_%s_activity ON public.%s', t, t);
    EXECUTE format(
      'CREATE TRIGGER log_%s_activity AFTER INSERT OR UPDATE OR DELETE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.log_activity()',
      t, t);
  END LOOP;
END$$;

-- 3) Backfill existing rows so timelines are consistent (idempotent)
INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'receipts', r.id,
       (SELECT inv.project_id
          FROM public.receipt_allocations ra
          JOIN public.invoices inv ON inv.id = ra.invoice_id
         WHERE ra.receipt_id = r.id
         LIMIT 1),
       'created', 'receipts created'
  FROM public.receipts r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_log a
     WHERE a.entity_type='receipts' AND a.entity_id=r.id);

INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'grns', g.id, g.project_id, 'created', 'grns created'
  FROM public.grns g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_log a
     WHERE a.entity_type='grns' AND a.entity_id=g.id);

INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'vendor_payments', v.id, v.project_id, 'created', 'vendor_payments created'
  FROM public.vendor_payments v
  WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_log a
     WHERE a.entity_type='vendor_payments' AND a.entity_id=v.id);

INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary)
SELECT 'installations', i.id, i.project_id, 'created', 'installations created'
  FROM public.installations i
  WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_log a
     WHERE a.entity_type='installations' AND a.entity_id=i.id);

-- 4) Extend dependency_summary + purge_entity to know enquiry + invoice
CREATE OR REPLACE FUNCTION public.dependency_summary(_entity_type text, _entity_id uuid)
 RETURNS TABLE(module text, count bigint, route text, blocking boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_table text;
  fk record;
  cnt bigint;
  lbl text;
  rt  text;
BEGIN
  base_table := CASE _entity_type
    WHEN 'customer'       THEN 'customers'
    WHEN 'vendor'         THEN 'vendors'
    WHEN 'project'        THEN 'projects'
    WHEN 'product'        THEN 'products'
    WHEN 'estimate'       THEN 'estimates'
    WHEN 'quote'          THEN 'quotes'
    WHEN 'sales_order'    THEN 'sales_orders'
    WHEN 'purchase_order' THEN 'purchase_orders'
    WHEN 'enquiry'        THEN 'enquiries'
    WHEN 'invoice'        THEN 'invoices'
    ELSE NULL
  END;
  IF base_table IS NULL THEN
    RETURN;
  END IF;

  FOR fk IN
    SELECT
      cl.relname    AS child_tbl,
      a.attname     AS child_col,
      c.confdeltype AS del_type
    FROM pg_constraint c
    JOIN pg_class cl    ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid  = cl.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND c.confrelid = ('public.' || base_table)::regclass
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format(
      'SELECT count(*)::bigint FROM public.%I WHERE %I = $1',
      fk.child_tbl, fk.child_col
    ) INTO cnt USING _entity_id;

    IF cnt > 0 THEN
      SELECT ml.label, ml.route INTO lbl, rt
        FROM public._mdm_module_label(fk.child_tbl) ml;
      IF lbl IS NULL THEN
        lbl := initcap(replace(fk.child_tbl, '_', ' '));
        rt  := '';
      END IF;

      module   := lbl;
      count    := cnt;
      route    := COALESCE(rt, '');
      blocking := fk.del_type IN ('r', 'a');
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END $function$;

CREATE OR REPLACE FUNCTION public.purge_entity(_entity_type text, _entity_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  blocking_total bigint;
  blocking_list text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'purge_entity: admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(d.count), 0),
         string_agg(d.module || ' (' || d.count || ')', ', ')
    INTO blocking_total, blocking_list
    FROM public.dependency_summary(_entity_type, _entity_id) d
    WHERE d.blocking;

  IF blocking_total > 0 THEN
    RAISE EXCEPTION
      'This record is linked to: %. Remove or reassign these first.',
      blocking_list
      USING ERRCODE = '23503';
  END IF;

  CASE _entity_type
    WHEN 'customer'       THEN DELETE FROM public.customers       WHERE id = _entity_id;
    WHEN 'vendor'         THEN DELETE FROM public.vendors         WHERE id = _entity_id;
    WHEN 'project'        THEN DELETE FROM public.projects        WHERE id = _entity_id;
    WHEN 'product'        THEN DELETE FROM public.products        WHERE id = _entity_id;
    WHEN 'estimate'       THEN DELETE FROM public.estimates       WHERE id = _entity_id;
    WHEN 'quote'          THEN DELETE FROM public.quotes          WHERE id = _entity_id;
    WHEN 'sales_order'    THEN DELETE FROM public.sales_orders    WHERE id = _entity_id;
    WHEN 'purchase_order' THEN DELETE FROM public.purchase_orders WHERE id = _entity_id;
    WHEN 'enquiry'        THEN DELETE FROM public.enquiries       WHERE id = _entity_id;
    WHEN 'invoice'        THEN DELETE FROM public.invoices        WHERE id = _entity_id;
    ELSE RAISE EXCEPTION 'purge_entity: unsupported entity_type %',
      _entity_type USING ERRCODE = '22023';
  END CASE;
END $function$;
