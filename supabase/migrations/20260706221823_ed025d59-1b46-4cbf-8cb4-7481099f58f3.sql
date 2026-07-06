-- Module 3C: Send-to-Manufacturing automation + smart RFQ vendor recommendation
-- Two idempotent RPCs; do not touch existing schema.

CREATE OR REPLACE FUNCTION public.send_to_manufacturing(p_sales_order_id uuid)
RETURNS SETOF public.production_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_so public.sales_orders;
  v_quote_id uuid;
  v_customer_id uuid;
  v_project_id uuid;
  v_delivery date;
  v_created int := 0;
  r RECORD;
  v_po public.production_orders;
BEGIN
  SELECT * INTO v_so FROM public.sales_orders WHERE id = p_sales_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found' USING ERRCODE = 'P0002';
  END IF;

  v_quote_id := v_so.quote_id;
  v_customer_id := v_so.customer_id;
  v_project_id := v_so.project_id;
  v_delivery := v_so.delivery_date;

  IF v_quote_id IS NULL THEN
    RAISE EXCEPTION 'Sales order has no linked quote to source line-items from' USING ERRCODE = 'P0003';
  END IF;

  FOR r IN
    SELECT qi.*
      FROM public.quote_items qi
     WHERE qi.quote_id = v_quote_id
       AND qi.product_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.production_orders po
          WHERE po.sales_order_id = p_sales_order_id
            AND po.product_id = qi.product_id
       )
     ORDER BY qi.sort_order
  LOOP
    INSERT INTO public.production_orders (
      mfg_no, product_id, quantity, unit, status,
      sales_order_id, project_id, customer_id,
      planned_end, notes, created_by
    ) VALUES (
      '', r.product_id, r.quantity, COALESCE(r.unit, 'nos'), 'planned',
      p_sales_order_id, v_project_id, v_customer_id,
      v_delivery, r.description, auth.uid()
    )
    RETURNING * INTO v_po;
    v_created := v_created + 1;
    RETURN NEXT v_po;
  END LOOP;

  IF v_created = 0 THEN
    RAISE EXCEPTION 'All quote line-items already have production orders (or none have a linked product)' USING ERRCODE = 'P0004';
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_to_manufacturing(uuid) TO authenticated;

-- Recommend vendors for an RFQ, ranked by capability match + performance score.
-- Returns vendor rows with score, is_preferred, and match reasons.
CREATE OR REPLACE FUNCTION public.recommend_vendors_for_rfq(p_rfq_id uuid)
RETURNS TABLE (
  vendor_id uuid,
  company_name text,
  vendor_code text,
  city text,
  rating numeric,
  lead_time_days int,
  score numeric,
  is_preferred boolean,
  approval_pct numeric,
  avg_response_hours numeric,
  orders_count int,
  capability_match_count int,
  stone_match boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enquiry_id uuid;
  v_stone_type_id uuid;
BEGIN
  SELECT r.enquiry_id INTO v_enquiry_id FROM public.rfqs r WHERE r.id = p_rfq_id;
  IF v_enquiry_id IS NULL THEN
    RETURN;
  END IF;

  -- Pick the first product's stone_type from the RFQ items (heuristic).
  SELECT p.stone_type_id
    INTO v_stone_type_id
    FROM public.rfq_items ri
    LEFT JOIN public.products p ON p.id = ri.product_id
   WHERE ri.rfq_id = p_rfq_id AND p.stone_type_id IS NOT NULL
   ORDER BY ri.sort_order
   LIMIT 1;

  RETURN QUERY
  SELECT
    v.id,
    v.company_name,
    v.vendor_code,
    v.city,
    v.rating,
    v.lead_time_days,
    COALESCE(vpc.score, 0)::numeric AS score,
    COALESCE(vpc.is_preferred, false) AS is_preferred,
    COALESCE(vpc.approval_pct, 0)::numeric AS approval_pct,
    vpc.avg_response_hours,
    COALESCE(vpc.orders_count, 0) AS orders_count,
    (SELECT COUNT(*)::int FROM public.vendor_capabilities vc WHERE vc.vendor_id = v.id) AS capability_match_count,
    (v_stone_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendor_stone_types vst
       WHERE vst.vendor_id = v.id AND vst.stone_type_id = v_stone_type_id
    )) AS stone_match
  FROM public.vendors v
  LEFT JOIN public.vendor_performance_cache vpc ON vpc.vendor_id = v.id
  WHERE COALESCE(v.is_active, true) = true
  ORDER BY
    COALESCE(vpc.is_preferred, false) DESC,
    COALESCE(vpc.score, 0) DESC,
    (v_stone_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendor_stone_types vst
       WHERE vst.vendor_id = v.id AND vst.stone_type_id = v_stone_type_id
    )) DESC,
    v.rating DESC NULLS LAST
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_vendors_for_rfq(uuid) TO authenticated;