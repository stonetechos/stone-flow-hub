
-- 1. New columns preserving the ORIGINAL commercial customer.
ALTER TABLE public.quotes         ADD COLUMN IF NOT EXISTS original_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales_orders   ADD COLUMN IF NOT EXISTS original_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.projects       ADD COLUMN IF NOT EXISTS original_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.invoices       ADD COLUMN IF NOT EXISTS original_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- 2. Transfer log.
CREATE TABLE IF NOT EXISTS public.ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,             -- customer | enquiry | quote | sales_order | project
  source_id   uuid NOT NULL,
  from_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  to_customer_id   uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  scope     jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts    jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings  jsonb NOT NULL DEFAULT '[]'::jsonb,
  reversed_at timestamptz,
  reversed_by uuid,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ownership_transfers TO authenticated;
GRANT ALL    ON public.ownership_transfers TO service_role;
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ownership_transfers_read" ON public.ownership_transfers;
CREATE POLICY "ownership_transfers_read" ON public.ownership_transfers
  FOR SELECT TO authenticated USING (true);

-- 3. Preview: read-only impact analysis for wizard step 4/5.
CREATE OR REPLACE FUNCTION public.preview_ownership_transfer(
  p_from_customer_id uuid,
  p_to_customer_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from  customers%ROWTYPE;
  v_to    customers%ROWTYPE;
  v_out   jsonb;
  v_warn  jsonb := '[]'::jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sales_manager')) THEN
    RAISE EXCEPTION 'Only admin or sales manager can transfer commercial ownership';
  END IF;
  IF p_from_customer_id = p_to_customer_id THEN
    RAISE EXCEPTION 'Source and destination customer are the same';
  END IF;

  SELECT * INTO v_from FROM customers WHERE id = p_from_customer_id;
  SELECT * INTO v_to   FROM customers WHERE id = p_to_customer_id;
  IF v_from.id IS NULL OR v_to.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF coalesce(v_from.gst_number,'') <> coalesce(v_to.gst_number,'') THEN
    v_warn := v_warn || jsonb_build_object(
      'level','warning',
      'code','gst_mismatch',
      'message', format('GST changes from %s to %s. Future invoices will use the new GST.',
                        coalesce(v_from.gst_number,'—'), coalesce(v_to.gst_number,'—')));
  END IF;

  v_out := jsonb_build_object(
    'from', jsonb_build_object('id',v_from.id,'name',v_from.name,'code',v_from.customer_code,'gst',v_from.gst_number),
    'to',   jsonb_build_object('id',v_to.id,  'name',v_to.name,  'code',v_to.customer_code,  'gst',v_to.gst_number),
    'counts', jsonb_build_object(
      'enquiries',          (SELECT count(*) FROM enquiries          WHERE customer_id = p_from_customer_id),
      'quotes',             (SELECT count(*) FROM quotes             WHERE customer_id = p_from_customer_id),
      'sales_orders',       (SELECT count(*) FROM sales_orders       WHERE customer_id = p_from_customer_id),
      'projects',           (SELECT count(*) FROM projects           WHERE customer_id = p_from_customer_id),
      'installations',      (SELECT count(*) FROM installations      WHERE customer_id = p_from_customer_id),
      'payment_schedules',  (SELECT count(*) FROM customer_payment_schedules WHERE customer_id = p_from_customer_id),
      'invoices_draft',     (SELECT count(*) FROM invoices           WHERE customer_id = p_from_customer_id AND status = 'draft'),
      'invoices_finalised', (SELECT count(*) FROM invoices           WHERE customer_id = p_from_customer_id AND status NOT IN ('draft','cancelled')),
      'receipts',           (SELECT count(*) FROM receipts           WHERE customer_id = p_from_customer_id),
      'followups',          (SELECT count(*) FROM followups f JOIN enquiries e ON e.id = f.enquiry_id WHERE e.customer_id = p_from_customer_id)
    ),
    'warnings', v_warn
  );
  RETURN v_out;
END $$;

GRANT EXECUTE ON FUNCTION public.preview_ownership_transfer(uuid,uuid) TO authenticated;

-- 4. Main transfer function.
CREATE OR REPLACE FUNCTION public.transfer_commercial_ownership(
  p_source_type      text,
  p_source_id        uuid,
  p_from_customer_id uuid,
  p_to_customer_id   uuid,
  p_scope            jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_transfer_id uuid;
  v_uid uuid := auth.uid();
  v_counts jsonb := '{}'::jsonb;
  v_warn   jsonb := '[]'::jsonb;
  v_n      integer;
  v_finalised integer;
BEGIN
  IF NOT (has_role(v_uid,'admin') OR has_role(v_uid,'sales_manager')) THEN
    RAISE EXCEPTION 'Only admin or sales manager can transfer commercial ownership';
  END IF;
  IF p_from_customer_id IS NULL OR p_to_customer_id IS NULL THEN
    RAISE EXCEPTION 'From and to customers are required';
  END IF;
  IF p_from_customer_id = p_to_customer_id THEN
    RAISE EXCEPTION 'Source and destination customer are the same';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_to_customer_id) THEN
    RAISE EXCEPTION 'Destination customer not found';
  END IF;

  -- Enquiries
  IF (p_scope->>'enquiries')::bool THEN
    UPDATE enquiries SET customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('enquiries', v_n);
  END IF;

  -- Quotes (preserve original_customer_id on first move)
  IF (p_scope->>'quotes')::bool THEN
    UPDATE quotes
       SET original_customer_id = COALESCE(original_customer_id, customer_id),
           customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('quotes', v_n);
  END IF;

  -- Sales Orders
  IF (p_scope->>'sales_orders')::bool THEN
    UPDATE sales_orders
       SET original_customer_id = COALESCE(original_customer_id, customer_id),
           customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('sales_orders', v_n);
  END IF;

  -- Projects (carries followups, notes, files, site-visits via project_id)
  IF (p_scope->>'projects')::bool THEN
    UPDATE projects
       SET original_customer_id = COALESCE(original_customer_id, customer_id),
           customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('projects', v_n);
  END IF;

  -- Installations
  IF (p_scope->>'installations')::bool THEN
    UPDATE installations SET customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('installations', v_n);
  END IF;

  -- Payment schedules (future collection)
  IF (p_scope->>'payment_schedules')::bool THEN
    UPDATE customer_payment_schedules SET customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('payment_schedules', v_n);
  END IF;

  -- Draft invoices only. Finalised invoices are NEVER modified.
  IF (p_scope->>'draft_invoices')::bool THEN
    UPDATE invoices
       SET original_customer_id = COALESCE(original_customer_id, customer_id),
           customer_id = p_to_customer_id
     WHERE customer_id = p_from_customer_id AND status = 'draft';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('draft_invoices', v_n);
  END IF;

  -- Warn about finalised invoices that stay with the old customer.
  SELECT count(*) INTO v_finalised
    FROM invoices WHERE customer_id = p_from_customer_id AND status NOT IN ('draft','cancelled');
  IF v_finalised > 0 THEN
    v_warn := v_warn || jsonb_build_object(
      'level','info','code','finalised_invoices_preserved',
      'message', format('%s finalised invoice(s) remain with the previous customer for accounting integrity.', v_finalised));
  END IF;

  -- Log the transfer.
  INSERT INTO ownership_transfers(source_type, source_id, from_customer_id, to_customer_id, scope, counts, warnings, created_by)
  VALUES (p_source_type, p_source_id, p_from_customer_id, p_to_customer_id, p_scope, v_counts, v_warn, v_uid)
  RETURNING id INTO v_transfer_id;

  -- Audit trail (best-effort; log_activity trigger already handles per-row events).
  BEGIN
    INSERT INTO activity_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_uid, 'ownership_transferred', p_source_type, p_source_id,
      jsonb_build_object(
        'transfer_id', v_transfer_id,
        'from_customer_id', p_from_customer_id,
        'to_customer_id', p_to_customer_id,
        'scope', p_scope,
        'counts', v_counts,
        'warnings', v_warn));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ownership transfer audit failed: %', SQLERRM;
  END;

  RETURN v_transfer_id;
END $$;

GRANT EXECUTE ON FUNCTION public.transfer_commercial_ownership(text,uuid,uuid,uuid,jsonb) TO authenticated;

-- 5. Rollback (only if no finalised tax invoice has been raised for the destination customer since transfer).
CREATE OR REPLACE FUNCTION public.rollback_ownership_transfer(p_transfer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t ownership_transfers%ROWTYPE;
  v_uid uuid := auth.uid();
  v_blocking int;
BEGIN
  IF NOT (has_role(v_uid,'admin') OR has_role(v_uid,'sales_manager')) THEN
    RAISE EXCEPTION 'Only admin or sales manager can rollback ownership transfers';
  END IF;

  SELECT * INTO t FROM ownership_transfers WHERE id = p_transfer_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.reversed_at IS NOT NULL THEN RAISE EXCEPTION 'Transfer already rolled back'; END IF;

  -- Any finalised tax invoice raised on destination customer since the transfer blocks rollback.
  SELECT count(*) INTO v_blocking FROM invoices
    WHERE customer_id = t.to_customer_id
      AND status NOT IN ('draft','cancelled')
      AND created_at >= t.created_at;
  IF v_blocking > 0 THEN
    RAISE EXCEPTION 'Cannot rollback: % finalised tax invoice(s) exist against the new customer.', v_blocking;
  END IF;

  -- Swap back based on scope, using original_customer_id where present.
  IF (t.scope->>'enquiries')::bool THEN
    UPDATE enquiries SET customer_id = t.from_customer_id WHERE customer_id = t.to_customer_id;
  END IF;
  IF (t.scope->>'quotes')::bool THEN
    UPDATE quotes SET customer_id = COALESCE(original_customer_id, t.from_customer_id), original_customer_id = NULL
      WHERE customer_id = t.to_customer_id AND original_customer_id IS NOT NULL;
  END IF;
  IF (t.scope->>'sales_orders')::bool THEN
    UPDATE sales_orders SET customer_id = COALESCE(original_customer_id, t.from_customer_id), original_customer_id = NULL
      WHERE customer_id = t.to_customer_id AND original_customer_id IS NOT NULL;
  END IF;
  IF (t.scope->>'projects')::bool THEN
    UPDATE projects SET customer_id = COALESCE(original_customer_id, t.from_customer_id), original_customer_id = NULL
      WHERE customer_id = t.to_customer_id AND original_customer_id IS NOT NULL;
  END IF;
  IF (t.scope->>'installations')::bool THEN
    UPDATE installations SET customer_id = t.from_customer_id WHERE customer_id = t.to_customer_id;
  END IF;
  IF (t.scope->>'payment_schedules')::bool THEN
    UPDATE customer_payment_schedules SET customer_id = t.from_customer_id WHERE customer_id = t.to_customer_id;
  END IF;
  IF (t.scope->>'draft_invoices')::bool THEN
    UPDATE invoices SET customer_id = COALESCE(original_customer_id, t.from_customer_id), original_customer_id = NULL
      WHERE customer_id = t.to_customer_id AND status = 'draft' AND original_customer_id IS NOT NULL;
  END IF;

  UPDATE ownership_transfers SET reversed_at = now(), reversed_by = v_uid WHERE id = p_transfer_id;

  BEGIN
    INSERT INTO activity_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_uid, 'ownership_transfer_reversed', t.source_type, t.source_id,
      jsonb_build_object('transfer_id', t.id, 'from_customer_id', t.from_customer_id, 'to_customer_id', t.to_customer_id));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ownership rollback audit failed: %', SQLERRM;
  END;
END $$;

GRANT EXECUTE ON FUNCTION public.rollback_ownership_transfer(uuid) TO authenticated;
