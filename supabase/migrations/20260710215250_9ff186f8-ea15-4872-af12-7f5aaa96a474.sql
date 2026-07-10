
CREATE OR REPLACE FUNCTION public.record_schedule_payment(_schedule_id uuid, _amount numeric, _receipt_no text DEFAULT NULL::text)
 RETURNS customer_payment_schedules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v public.customer_payment_schedules%ROWTYPE;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.customer_payment_schedules
     SET paid_amount = LEAST(amount, COALESCE(paid_amount,0) + COALESCE(_amount,0)),
         status = CASE
                    WHEN COALESCE(paid_amount,0) + COALESCE(_amount,0) >= amount THEN 'paid'
                    WHEN COALESCE(paid_amount,0) + COALESCE(_amount,0) > 0       THEN 'partial'
                    ELSE 'pending'
                  END,
         notes = COALESCE(_receipt_no, notes),
         updated_at = now()
   WHERE id = _schedule_id
   RETURNING * INTO v;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule % not found', _schedule_id; END IF;
  RETURN v;
END $function$;

CREATE OR REPLACE FUNCTION public.approve_estimate(_estimate_id uuid, _override_schedule jsonb DEFAULT NULL::jsonb)
 RETURNS SETOF customer_payment_schedules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_est   public.estimates%ROWTYPE;
  v_sched jsonb;
  v_item  jsonb;
  v_n     int := 0;
  v_amt   numeric(14,2);
  v_due   date;
  v_today date := CURRENT_DATE;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estimate % not found', _estimate_id; END IF;
  IF v_est.customer_id IS NULL THEN RAISE EXCEPTION 'Estimate has no customer'; END IF;

  UPDATE public.estimates SET status = 'accepted'
   WHERE id = _estimate_id AND status <> 'accepted';

  DELETE FROM public.customer_payment_schedules
   WHERE estimate_id = _estimate_id AND status = 'pending' AND paid_amount = 0;

  IF _override_schedule IS NOT NULL AND jsonb_array_length(_override_schedule) > 0 THEN
    v_sched := _override_schedule;
  ELSE
    SELECT jsonb_agg(jsonb_build_object(
             'label',label,'pct',pct,'due_offset_days',due_offset_days) ORDER BY sort_order)
      INTO v_sched
      FROM public.estimate_payment_schedules
     WHERE estimate_id = _estimate_id;
    IF v_sched IS NULL OR jsonb_array_length(v_sched) = 0 THEN
      v_sched := public.default_customer_payment_schedule(v_est.template::text, v_est.total);
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sched) LOOP
    v_n := v_n + 1;
    v_amt := round(COALESCE(v_est.total,0) * (COALESCE((v_item->>'pct')::numeric, 0) / 100.0), 2);
    v_due := v_today + COALESCE((v_item->>'due_offset_days')::int, 0);
    INSERT INTO public.customer_payment_schedules
      (customer_id, project_id, estimate_id, milestone_no, label, pct, amount, due_date)
    VALUES
      (v_est.customer_id, v_est.project_id, _estimate_id, v_n,
       COALESCE(v_item->>'label','Milestone '||v_n),
       COALESCE((v_item->>'pct')::numeric,0),
       v_amt, v_due);
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.customer_payment_schedules
   WHERE estimate_id = _estimate_id ORDER BY milestone_no;
END $function$;

CREATE OR REPLACE FUNCTION public.send_to_manufacturing(p_sales_order_id uuid)
 RETURNS SETOF production_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

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
$function$;
