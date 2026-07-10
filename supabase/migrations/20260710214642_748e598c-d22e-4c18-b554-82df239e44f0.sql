
-- 1) convert_quote_to_sales_order: add staff-only check, preserve all existing logic
CREATE OR REPLACE FUNCTION public.convert_quote_to_sales_order(p_quote_id uuid)
 RETURNS sales_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote public.quotes;
  v_so    public.sales_orders;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote % not found', p_quote_id USING ERRCODE='P0002'; END IF;

  SELECT * INTO v_so FROM public.sales_orders
    WHERE quote_id = p_quote_id
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_so; END IF;

  INSERT INTO public.sales_orders(
    so_no, quote_id, project_id, customer_id, status, order_date, delivery_date, notes
  ) VALUES (
    '', v_quote.id, v_quote.project_id, v_quote.customer_id, 'draft',
    CURRENT_DATE, v_quote.valid_until, v_quote.notes
  ) RETURNING * INTO v_so;

  INSERT INTO public.sales_order_items(
    sales_order_id, product_id, product_name, description, category, stone_type, finish,
    unit, quantity, unit_price, discount_pct, tax_pct, fulfilment, sort_order
  )
  SELECT
    v_so.id, qi.product_id, p.name, qi.description, pc.name,
    COALESCE(st.name, p.stone_type::text), p.finish::text,
    qi.unit, qi.quantity, qi.unit_price, 0, qi.tax_pct, qi.fulfilment, qi.sort_order
  FROM public.quote_items qi
  LEFT JOIN public.products p ON p.id = qi.product_id
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.stone_types st ON st.id = p.stone_type_id
  WHERE qi.quote_id = v_quote.id
  ORDER BY qi.sort_order;

  SELECT * INTO v_so FROM public.sales_orders WHERE id = v_so.id;
  RETURN v_so;
END $function$;

REVOKE EXECUTE ON FUNCTION public.convert_quote_to_sales_order(uuid) FROM anon, PUBLIC;

-- 2) record_installation_material: add staff-only check, preserve all existing logic
CREATE OR REPLACE FUNCTION public.record_installation_material(
  p_installation_id uuid, p_product_id uuid, p_kind text, p_qty numeric,
  p_unit text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_description text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row_id UUID;
  v_mv_type TEXT;
  v_dir TEXT;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN RAISE EXCEPTION 'quantity must be positive'; END IF;
  IF p_kind NOT IN ('dispatched','received','installed','damaged','returned') THEN
    RAISE EXCEPTION 'invalid kind %', p_kind;
  END IF;

  SELECT id INTO v_row_id
  FROM public.installation_materials
  WHERE installation_id = p_installation_id
    AND product_id IS NOT DISTINCT FROM p_product_id
  LIMIT 1;

  IF v_row_id IS NULL THEN
    INSERT INTO public.installation_materials
      (installation_id, product_id, unit, description,
       qty_dispatched, qty_received, qty_installed, qty_damaged, qty_returned, notes)
    VALUES
      (p_installation_id, p_product_id, p_unit, p_description,
       CASE WHEN p_kind='dispatched' THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='received'   THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='installed'  THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='damaged'    THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='returned'   THEN p_qty ELSE 0 END,
       p_notes)
    RETURNING id INTO v_row_id;
  ELSE
    UPDATE public.installation_materials
       SET qty_dispatched = qty_dispatched + CASE WHEN p_kind='dispatched' THEN p_qty ELSE 0 END,
           qty_received   = qty_received   + CASE WHEN p_kind='received'   THEN p_qty ELSE 0 END,
           qty_installed  = qty_installed  + CASE WHEN p_kind='installed'  THEN p_qty ELSE 0 END,
           qty_damaged    = qty_damaged    + CASE WHEN p_kind='damaged'    THEN p_qty ELSE 0 END,
           qty_returned   = qty_returned   + CASE WHEN p_kind='returned'   THEN p_qty ELSE 0 END,
           notes = COALESCE(p_notes, notes)
     WHERE id = v_row_id;
  END IF;

  v_mv_type := CASE p_kind
    WHEN 'dispatched' THEN 'dispatch'
    WHEN 'received'   THEN 'transfer'
    WHEN 'installed'  THEN 'production_consumption'
    WHEN 'damaged'    THEN 'adjustment'
    WHEN 'returned'   THEN 'return'
  END;
  v_dir := CASE p_kind
    WHEN 'received' THEN 'in'
    WHEN 'returned' THEN 'in'
    ELSE 'out'
  END;

  INSERT INTO public.inventory_movements
    (product_id, movement_type, direction, quantity, unit,
     source_type, source_id, ref_no, notes, moved_at)
  VALUES
    (p_product_id, v_mv_type, v_dir, p_qty, p_unit,
     'installation', p_installation_id,
     (SELECT installation_no FROM public.installations WHERE id = p_installation_id),
     COALESCE(p_notes, 'Installation ' || p_kind), now());

  RETURN v_row_id;
END;
$function$;

-- 3) Trigger helper hardening: revoke direct API execute; triggers still fire (owner runs them).
REVOKE EXECUTE ON FUNCTION public.trg_dispatch_fill_from_so() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sales_order_header_recalc() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sales_order_item_recalc() FROM anon, authenticated, PUBLIC;
