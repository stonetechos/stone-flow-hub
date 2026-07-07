
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_quote_id uuid REFERENCES public.vendor_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_delivery_date date,
  ADD COLUMN IF NOT EXISTS vendor_delivery_date date,
  ADD COLUMN IF NOT EXISTS commercial_scenario text,
  ADD COLUMN IF NOT EXISTS payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_risk text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS lock_override_reason text,
  ADD COLUMN IF NOT EXISTS lock_override_by uuid,
  ADD COLUMN IF NOT EXISTS lock_override_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_po_estimate ON public.purchase_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_po_customer ON public.purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor_quote ON public.purchase_orders(vendor_quote_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor_delivery ON public.purchase_orders(vendor_delivery_date);
CREATE INDEX IF NOT EXISTS idx_po_delivery_risk ON public.purchase_orders(delivery_risk);

CREATE TABLE IF NOT EXISTS public.procurement_lock_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  vendor_quote_id uuid REFERENCES public.vendor_quotes(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  reason text NOT NULL,
  overridden_by uuid NOT NULL,
  overridden_at timestamptz NOT NULL DEFAULT now(),
  advance_required numeric(14,2),
  advance_received numeric(14,2)
);

GRANT SELECT, INSERT ON public.procurement_lock_overrides TO authenticated;
GRANT ALL ON public.procurement_lock_overrides TO service_role;

ALTER TABLE public.procurement_lock_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_overrides" ON public.procurement_lock_overrides;
CREATE POLICY "staff_read_overrides" ON public.procurement_lock_overrides
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "staff_insert_overrides" ON public.procurement_lock_overrides;
CREATE POLICY "staff_insert_overrides" ON public.procurement_lock_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()) AND overridden_by = auth.uid());

CREATE OR REPLACE FUNCTION public.customer_receipts_since(_customer_id uuid, _since timestamptz)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM public.receipts
  WHERE customer_id = _customer_id
    AND status = 'confirmed'
    AND received_at >= COALESCE(_since, '1970-01-01'::timestamptz)
$$;
GRANT EXECUTE ON FUNCTION public.customer_receipts_since(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.default_payment_schedule_for(_template text, _total numeric)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _template = 'material_supply' THEN
      jsonb_build_array(
        jsonb_build_object('label','Advance','pct',80,'stage','advance'),
        jsonb_build_object('label','Before dispatch','pct',20,'stage','before_dispatch')
      )
    WHEN COALESCE(_total,0) <= 75000 THEN
      jsonb_build_array(
        jsonb_build_object('label','Advance','pct',75,'stage','advance'),
        jsonb_build_object('label','On completion','pct',25,'stage','completion')
      )
    WHEN _total <= 300000 THEN
      jsonb_build_array(
        jsonb_build_object('label','Advance','pct',40,'stage','advance'),
        jsonb_build_object('label','On delivery','pct',40,'stage','delivery'),
        jsonb_build_object('label','On completion','pct',20,'stage','completion')
      )
    ELSE
      jsonb_build_array(
        jsonb_build_object('label','Advance','pct',50,'stage','advance'),
        jsonb_build_object('label','On completion','pct',50,'stage','completion')
      )
  END
$$;
GRANT EXECUTE ON FUNCTION public.default_payment_schedule_for(text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_po_from_vendor_quote(
  p_quote_id uuid,
  p_vendor_delivery date DEFAULT NULL,
  p_override_reason text DEFAULT NULL,
  p_payment_schedule jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote public.vendor_quotes%ROWTYPE;
  v_req public.vendor_requests%ROWTYPE;
  v_rfq public.rfqs%ROWTYPE;
  v_estimate public.estimates%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_customer_delivery date;
  v_vendor_delivery date;
  v_advance_required numeric(14,2) := 0;
  v_advance_received numeric(14,2) := 0;
  v_risk text := 'ok';
  v_po_id uuid;
  v_po_no text;
  v_schedule jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_staff_access(v_uid) THEN RAISE EXCEPTION 'permission denied'; END IF;

  SELECT * INTO v_quote FROM public.vendor_quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'vendor quote not found'; END IF;
  IF NOT v_quote.is_approved THEN
    RAISE EXCEPTION 'vendor quote must be approved before PO';
  END IF;

  SELECT * INTO v_req  FROM public.vendor_requests WHERE id = v_quote.vendor_request_id;
  SELECT * INTO v_rfq  FROM public.rfqs WHERE id = v_req.rfq_id;
  SELECT * INTO v_project FROM public.projects WHERE id = v_rfq.project_id;

  SELECT * INTO v_estimate FROM public.estimates
    WHERE project_id = v_project.id AND status IN ('accepted','converted')
    ORDER BY updated_at DESC LIMIT 1;

  IF v_estimate.id IS NULL THEN
    IF p_override_reason IS NULL OR btrim(p_override_reason) = '' THEN
      RAISE EXCEPTION 'PROCUREMENT_LOCK: no approved estimate for project %', v_project.name;
    END IF;
  ELSE
    v_schedule := COALESCE(p_payment_schedule,
                           public.default_payment_schedule_for(v_estimate.template::text, v_estimate.total));
    v_advance_required := ROUND(COALESCE(v_estimate.total,0) * ((v_schedule->0->>'pct')::numeric) / 100.0, 2);
    v_advance_received := public.customer_receipts_since(v_estimate.customer_id, NULL);
    IF v_advance_received < v_advance_required THEN
      IF p_override_reason IS NULL OR btrim(p_override_reason) = '' THEN
        RAISE EXCEPTION 'PROCUREMENT_LOCK: advance % required, received %', v_advance_required, v_advance_received;
      END IF;
    END IF;
  END IF;

  v_customer_delivery := v_project.expected_completion_date;
  IF v_customer_delivery IS NULL THEN
    SELECT required_delivery_date INTO v_customer_delivery
      FROM public.enquiries WHERE project_id = v_project.id
      ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_vendor_delivery := COALESCE(
    p_vendor_delivery,
    CASE WHEN v_customer_delivery IS NOT NULL THEN (v_customer_delivery - INTERVAL '2 days')::date END,
    (CURRENT_DATE + COALESCE(v_quote.dispatch_days, 7))
  );

  IF v_customer_delivery IS NOT NULL AND v_vendor_delivery > v_customer_delivery THEN
    v_risk := 'critical';
  ELSIF v_customer_delivery IS NOT NULL AND v_vendor_delivery > (v_customer_delivery - INTERVAL '2 days')::date THEN
    v_risk := 'warning';
  END IF;

  v_po_no := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.purchase_orders (
    po_no, vendor_id, project_id, rfq_id, estimate_id, customer_id, vendor_quote_id,
    status, order_date, expected_date, customer_delivery_date, vendor_delivery_date,
    commercial_scenario, payment_schedule, delivery_risk,
    lock_override_reason, lock_override_by, lock_override_at, created_by
  ) VALUES (
    v_po_no, v_req.vendor_id, v_project.id, v_rfq.id, v_estimate.id, v_project.customer_id, v_quote.id,
    'draft', CURRENT_DATE, v_vendor_delivery, v_customer_delivery, v_vendor_delivery,
    COALESCE(v_estimate.template::text, 'material_supply'),
    COALESCE(v_schedule, '[]'::jsonb), v_risk,
    NULLIF(p_override_reason,''),
    CASE WHEN p_override_reason IS NOT NULL AND btrim(p_override_reason)<>'' THEN v_uid END,
    CASE WHEN p_override_reason IS NOT NULL AND btrim(p_override_reason)<>'' THEN now() END,
    v_uid
  ) RETURNING id INTO v_po_id;

  IF p_override_reason IS NOT NULL AND btrim(p_override_reason) <> '' THEN
    INSERT INTO public.procurement_lock_overrides
      (po_id, vendor_quote_id, estimate_id, reason, overridden_by, advance_required, advance_received)
    VALUES (v_po_id, p_quote_id, v_estimate.id, p_override_reason, v_uid, v_advance_required, v_advance_received);
  END IF;

  RETURN v_po_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_po_from_vendor_quote(uuid, date, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.procurement_lock_check(p_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote public.vendor_quotes%ROWTYPE;
  v_req public.vendor_requests%ROWTYPE;
  v_rfq public.rfqs%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_estimate public.estimates%ROWTYPE;
  v_schedule jsonb;
  v_advance_required numeric(14,2) := 0;
  v_advance_received numeric(14,2) := 0;
  v_customer_delivery date;
  v_vendor_delivery date;
BEGIN
  SELECT * INTO v_quote FROM public.vendor_quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'quote not found'); END IF;
  SELECT * INTO v_req  FROM public.vendor_requests WHERE id = v_quote.vendor_request_id;
  SELECT * INTO v_rfq  FROM public.rfqs WHERE id = v_req.rfq_id;
  SELECT * INTO v_project FROM public.projects WHERE id = v_rfq.project_id;
  SELECT * INTO v_estimate FROM public.estimates
    WHERE project_id = v_project.id AND status IN ('accepted','converted')
    ORDER BY updated_at DESC LIMIT 1;

  IF v_estimate.id IS NOT NULL THEN
    v_schedule := public.default_payment_schedule_for(v_estimate.template::text, v_estimate.total);
    v_advance_required := ROUND(COALESCE(v_estimate.total,0) * ((v_schedule->0->>'pct')::numeric) / 100.0, 2);
    v_advance_received := public.customer_receipts_since(v_estimate.customer_id, NULL);
  END IF;

  v_customer_delivery := v_project.expected_completion_date;
  IF v_customer_delivery IS NULL THEN
    SELECT required_delivery_date INTO v_customer_delivery
      FROM public.enquiries WHERE project_id = v_project.id
      ORDER BY created_at DESC LIMIT 1;
  END IF;
  v_vendor_delivery := CASE WHEN v_customer_delivery IS NOT NULL
                             THEN (v_customer_delivery - INTERVAL '2 days')::date
                             ELSE (CURRENT_DATE + COALESCE(v_quote.dispatch_days, 7)) END;

  RETURN jsonb_build_object(
    'ok', (v_estimate.id IS NOT NULL AND v_advance_received >= v_advance_required),
    'estimate_id', v_estimate.id,
    'estimate_status', v_estimate.status,
    'estimate_total', v_estimate.total,
    'commercial_scenario', v_estimate.template,
    'payment_schedule', COALESCE(v_schedule, '[]'::jsonb),
    'advance_required', v_advance_required,
    'advance_received', v_advance_received,
    'advance_gap', GREATEST(v_advance_required - v_advance_received, 0),
    'customer_delivery_date', v_customer_delivery,
    'vendor_delivery_default', v_vendor_delivery,
    'project_id', v_project.id,
    'project_name', v_project.name,
    'customer_id', v_project.customer_id,
    'vendor_id', v_req.vendor_id,
    'rfq_id', v_rfq.id
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.procurement_lock_check(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.procurement_kpis WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.rfqs
     WHERE status IN ('draft','sent'))::int                              AS rfqs_awaiting_response,
  (SELECT COUNT(*) FROM public.vendor_quotes
     WHERE submitted_at IS NOT NULL)::int                                AS vendor_quotations_received,
  (SELECT COUNT(*) FROM public.vendor_quotes
     WHERE submitted_at IS NOT NULL AND is_approved = false
       AND rejected_at IS NULL)::int                                     AS quotations_pending_approval,
  (SELECT COUNT(*) FROM public.purchase_orders
     WHERE status IN ('draft','sent','acknowledged'))::int               AS purchase_orders_pending,
  (SELECT COUNT(*) FROM public.purchase_orders
     WHERE status IN ('sent','acknowledged','partially_received')
       AND vendor_delivery_date IS NOT NULL
       AND vendor_delivery_date < CURRENT_DATE)::int                     AS purchase_orders_delayed,
  (SELECT COUNT(*) FROM public.purchase_orders
     WHERE status = 'acknowledged')::int                                 AS material_awaiting_dispatch,
  (SELECT COUNT(*) FROM public.purchase_orders
     WHERE status IN ('partially_received','received'))::int             AS material_received,
  (SELECT COALESCE(SUM(GREATEST(debit - credit, 0)), 0)::numeric
     FROM public.vendor_ledger_entries)                                  AS vendor_outstanding,
  (SELECT COALESCE(SUM(GREATEST(credit - debit, 0)), 0)::numeric
     FROM public.vendor_ledger_entries
     WHERE source_type = 'advance')                                      AS vendor_advances,
  (SELECT COALESCE(SUM(total_inr + freight_inr), 0)::numeric
     FROM public.vendor_quotes
     WHERE is_approved = true)                                           AS procurement_pipeline,
  (SELECT COUNT(*) FROM (
     SELECT vendor_id
     FROM public.vendor_ledger_entries
     GROUP BY vendor_id
     HAVING SUM(debit - credit) > 0
   ) x)::int                                                             AS vendors_awaiting_payment;

GRANT SELECT ON public.procurement_kpis TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_overdue_procurement_followups()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0; r record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  FOR r IN
    SELECT rfq.id, rfq.rfq_no, rfq.project_id
    FROM public.rfqs rfq
    WHERE rfq.due_date IS NOT NULL AND rfq.due_date < CURRENT_DATE
      AND rfq.status IN ('draft','sent')
      AND NOT EXISTS (
        SELECT 1 FROM public.followups f
        WHERE f.entity_type = 'rfq' AND f.entity_id = rfq.id AND f.status = 'pending'
      )
  LOOP
    INSERT INTO public.followups(entity_type, entity_id, project_id, scheduled_at, channel, status, notes)
    VALUES ('rfq', r.id, r.project_id, now(), 'call', 'pending',
            'Auto: RFQ ' || r.rfq_no || ' response overdue');
    v_count := v_count + 1;
  END LOOP;

  FOR r IN
    SELECT po.id, po.po_no, po.project_id
    FROM public.purchase_orders po
    WHERE po.vendor_delivery_date IS NOT NULL AND po.vendor_delivery_date < CURRENT_DATE
      AND po.status IN ('sent','acknowledged','partially_received')
      AND NOT EXISTS (
        SELECT 1 FROM public.followups f
        WHERE f.entity_type = 'purchase_order' AND f.entity_id = po.id AND f.status = 'pending'
      )
  LOOP
    INSERT INTO public.followups(entity_type, entity_id, project_id, scheduled_at, channel, status, notes)
    VALUES ('purchase_order', r.id, r.project_id, now(), 'call', 'pending',
            'Auto: PO ' || r.po_no || ' delivery overdue');
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_overdue_procurement_followups() TO authenticated;
