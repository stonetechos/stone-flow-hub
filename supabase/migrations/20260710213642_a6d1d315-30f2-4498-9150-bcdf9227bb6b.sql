
-- 1) customer_receipts_since: add staff check
CREATE OR REPLACE FUNCTION public.customer_receipts_since(_customer_id uuid, _since timestamp with time zone)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN (
    SELECT COALESCE(SUM(amount), 0)::numeric
    FROM public.receipts
    WHERE customer_id = _customer_id
      AND status = 'confirmed'
      AND received_at >= COALESCE(_since, '1970-01-01'::timestamptz)
  );
END
$function$;

-- 2) dependency_summary: add staff check at top
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
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

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

-- 3) dispatch_items: replace overly permissive policy with staff-scoped policy (matches parent dispatches)
DROP POLICY IF EXISTS "Authenticated users manage dispatch items" ON public.dispatch_items;
CREATE POLICY "Staff manage dispatch items"
  ON public.dispatch_items
  FOR ALL
  TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
