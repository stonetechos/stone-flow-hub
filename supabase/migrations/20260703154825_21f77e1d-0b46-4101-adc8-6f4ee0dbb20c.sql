
-- =====================================================================
-- Module 2 Milestone 1: Vendor Portal foundation, procurement extensions,
-- notification engine, performance cache. Additive.
-- Also tightens overly-broad Module 1 policies (security fix) so vendor
-- users can never see other tenants' data.
-- =====================================================================

-- 1) Enums --------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.vendor_portal_role AS ENUM ('vendor_owner','vendor_member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_event AS ENUM (
    'RFQ_CREATED','RFQ_REMINDER','QUOTE_SUBMITTED','QUOTE_UPDATED',
    'QUOTE_APPROVED','QUOTE_REJECTED','ORDER_CONFIRMED',
    'PRODUCTION_STARTED','DISPATCH_REQUESTED','DISPATCH_COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('email','whatsapp','sms','push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending','sent','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Additive columns on existing tables --------------------------------
ALTER TABLE public.vendor_requests
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_note text;

ALTER TABLE public.vendor_quotes
  ADD COLUMN IF NOT EXISTS quote_pdf_file_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS revision_of uuid REFERENCES public.vendor_quotes(id) ON DELETE SET NULL;

-- 3) Vendor users -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role public.vendor_portal_role NOT NULL DEFAULT 'vendor_owner',
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_users TO authenticated;
GRANT ALL ON public.vendor_users TO service_role;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;

-- Helper: current user's vendor_id (SECURITY DEFINER breaks RLS recursion)
CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT vendor_id FROM public.vendor_users WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_vendor_of(_user_id uuid, _vendor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.vendor_users WHERE user_id=_user_id AND vendor_id=_vendor_id);
$$;

CREATE POLICY vu_self_read ON public.vendor_users FOR SELECT
  USING (user_id = auth.uid() OR public.has_staff_access(auth.uid()));
CREATE POLICY vu_staff_write ON public.vendor_users FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TRIGGER trg_vendor_users_updated_at BEFORE UPDATE ON public.vendor_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Vendor RFQ view tracking ------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_rfq_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_request_id uuid NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_request_id, user_id)
);
GRANT SELECT, INSERT ON public.vendor_rfq_views TO authenticated;
GRANT ALL ON public.vendor_rfq_views TO service_role;
ALTER TABLE public.vendor_rfq_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY vrv_owner ON public.vendor_rfq_views FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_rfq_views.vendor_request_id
        AND vr.vendor_id = public.current_vendor_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_rfq_views.vendor_request_id
        AND vr.vendor_id = public.current_vendor_id()
    )
  );
CREATE POLICY vrv_staff_read ON public.vendor_rfq_views FOR SELECT
  USING (public.has_staff_access(auth.uid()));

-- 5) Notification event ledger + delivery queue ------------------------
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event public.notification_event NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ne_staff_all ON public.notification_events FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  recipient text NOT NULL,
  recipient_user_id uuid,
  status public.notification_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY nd_staff_all ON public.notification_deliveries FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TRIGGER trg_nd_updated_at BEFORE UPDATE ON public.notification_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ix_nd_status_scheduled ON public.notification_deliveries(status, scheduled_at);
CREATE INDEX IF NOT EXISTS ix_ne_entity ON public.notification_events(entity_type, entity_id);

-- Helper to log events (SECURITY DEFINER: any authorized code can write)
CREATE OR REPLACE FUNCTION public.log_notification_event(
  _event public.notification_event,
  _entity_type text,
  _entity_id uuid,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.notification_events(event, entity_type, entity_id, payload, actor_id)
  VALUES (_event, _entity_type, _entity_id, COALESCE(_payload,'{}'::jsonb), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 6) Vendor performance cache ------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_performance_cache (
  vendor_id uuid PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  rfqs_received integer NOT NULL DEFAULT 0,
  quotes_submitted integer NOT NULL DEFAULT 0,
  quotes_approved integer NOT NULL DEFAULT 0,
  approval_pct numeric(5,2) NOT NULL DEFAULT 0,
  avg_response_hours numeric(10,2),
  avg_dispatch_days numeric(10,2),
  orders_count integer NOT NULL DEFAULT 0,
  completion_pct numeric(5,2) NOT NULL DEFAULT 0,
  delay_pct numeric(5,2) NOT NULL DEFAULT 0,
  purchase_value numeric(14,2) NOT NULL DEFAULT 0,
  last_rfq_at timestamptz,
  last_order_at timestamptz,
  score numeric(5,2) NOT NULL DEFAULT 0,
  is_preferred boolean NOT NULL DEFAULT false,
  recomputed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_performance_cache TO authenticated;
GRANT ALL ON public.vendor_performance_cache TO service_role;
ALTER TABLE public.vendor_performance_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY vpc_staff_read ON public.vendor_performance_cache FOR SELECT
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY vpc_vendor_self ON public.vendor_performance_cache FOR SELECT
  USING (vendor_id = public.current_vendor_id());

CREATE OR REPLACE FUNCTION public.recalc_vendor_performance(_vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_rfqs int; v_subs int; v_appr int; v_orders int; v_value numeric(14,2);
  v_last_rfq timestamptz; v_last_order timestamptz;
  v_avg_resp numeric(10,2); v_avg_dispatch numeric(10,2);
  v_score numeric(5,2);
BEGIN
  SELECT count(*), max(sent_at) INTO v_rfqs, v_last_rfq
    FROM public.vendor_requests WHERE vendor_id=_vendor_id;
  SELECT count(*) INTO v_subs
    FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id=vq.vendor_request_id
    WHERE vr.vendor_id=_vendor_id AND vq.submitted_at IS NOT NULL;
  SELECT count(*) INTO v_appr
    FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id=vq.vendor_request_id
    WHERE vr.vendor_id=_vendor_id AND vq.is_approved = true;
  SELECT count(*), coalesce(sum(0),0), max(order_date::timestamptz)
    INTO v_orders, v_value, v_last_order
    FROM public.purchase_orders WHERE vendor_id=_vendor_id;
  SELECT avg(EXTRACT(EPOCH FROM (vq.submitted_at - vr.sent_at))/3600.0)
    INTO v_avg_resp
    FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id=vq.vendor_request_id
    WHERE vr.vendor_id=_vendor_id AND vq.submitted_at IS NOT NULL AND vr.sent_at IS NOT NULL;
  SELECT avg(vq.dispatch_days) INTO v_avg_dispatch
    FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id=vq.vendor_request_id
    WHERE vr.vendor_id=_vendor_id AND vq.dispatch_days IS NOT NULL;

  v_score := LEAST(100, coalesce(
    (CASE WHEN v_rfqs>0 THEN (v_subs::numeric/v_rfqs)*40 ELSE 0 END) +
    (CASE WHEN v_subs>0 THEN (v_appr::numeric/v_subs)*40 ELSE 0 END) +
    (CASE WHEN v_avg_resp IS NOT NULL AND v_avg_resp<=48 THEN 20 ELSE 10 END),
  0));

  INSERT INTO public.vendor_performance_cache
    (vendor_id, rfqs_received, quotes_submitted, quotes_approved, approval_pct,
     avg_response_hours, avg_dispatch_days, orders_count, purchase_value,
     last_rfq_at, last_order_at, score, is_preferred, recomputed_at)
  VALUES (_vendor_id, v_rfqs, v_subs, v_appr,
     CASE WHEN v_subs>0 THEN (v_appr::numeric/v_subs)*100 ELSE 0 END,
     v_avg_resp, v_avg_dispatch, v_orders, coalesce(v_value,0),
     v_last_rfq, v_last_order, v_score, v_score >= 75, now())
  ON CONFLICT (vendor_id) DO UPDATE SET
    rfqs_received=EXCLUDED.rfqs_received,
    quotes_submitted=EXCLUDED.quotes_submitted,
    quotes_approved=EXCLUDED.quotes_approved,
    approval_pct=EXCLUDED.approval_pct,
    avg_response_hours=EXCLUDED.avg_response_hours,
    avg_dispatch_days=EXCLUDED.avg_dispatch_days,
    orders_count=EXCLUDED.orders_count,
    purchase_value=EXCLUDED.purchase_value,
    last_rfq_at=EXCLUDED.last_rfq_at,
    last_order_at=EXCLUDED.last_order_at,
    score=EXCLUDED.score,
    is_preferred=EXCLUDED.is_preferred,
    recomputed_at=now();
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vendor_perf_vq() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_vid uuid;
BEGIN
  SELECT vendor_id INTO v_vid FROM public.vendor_requests
   WHERE id = COALESCE(NEW.vendor_request_id, OLD.vendor_request_id);
  IF v_vid IS NOT NULL THEN PERFORM public.recalc_vendor_performance(v_vid); END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vendor_perf_vr() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.recalc_vendor_performance(COALESCE(NEW.vendor_id, OLD.vendor_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vendor_perf_po() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.recalc_vendor_performance(COALESCE(NEW.vendor_id, OLD.vendor_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_vq_recalc_perf ON public.vendor_quotes;
CREATE TRIGGER trg_vq_recalc_perf
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_quotes
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_vendor_perf_vq();

DROP TRIGGER IF EXISTS trg_vr_recalc_perf ON public.vendor_requests;
CREATE TRIGGER trg_vr_recalc_perf
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_vendor_perf_vr();

DROP TRIGGER IF EXISTS trg_po_recalc_perf ON public.purchase_orders;
CREATE TRIGGER trg_po_recalc_perf
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_vendor_perf_po();

-- 7) Security fix: tighten broad Module 1 policies + add vendor SELECT.
-- Existing "auth.uid() IS NOT NULL" policies would leak all data to any
-- vendor user. Replace with staff-scoped policies and add vendor-scoped
-- policies alongside.

-- rfqs
DROP POLICY IF EXISTS "rfqs auth all" ON public.rfqs;
CREATE POLICY rfqs_staff_all ON public.rfqs FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY rfqs_vendor_read ON public.rfqs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendor_requests vr
    WHERE vr.rfq_id = rfqs.id AND vr.vendor_id = public.current_vendor_id()
  ));

-- rfq_items
DROP POLICY IF EXISTS "rfq_items auth all" ON public.rfq_items;
CREATE POLICY rfq_items_staff_all ON public.rfq_items FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY rfq_items_vendor_read ON public.rfq_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendor_requests vr
    WHERE vr.rfq_id = rfq_items.rfq_id AND vr.vendor_id = public.current_vendor_id()
  ));

-- vendor_requests
DROP POLICY IF EXISTS vr ON public.vendor_requests;
CREATE POLICY vr_staff_all ON public.vendor_requests FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY vr_vendor_read ON public.vendor_requests FOR SELECT
  USING (vendor_id = public.current_vendor_id());
CREATE POLICY vr_vendor_touch ON public.vendor_requests FOR UPDATE
  USING (vendor_id = public.current_vendor_id())
  WITH CHECK (vendor_id = public.current_vendor_id());

-- vendor_quotes
DROP POLICY IF EXISTS vq ON public.vendor_quotes;
CREATE POLICY vq_staff_all ON public.vendor_quotes FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY vq_vendor_read ON public.vendor_quotes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendor_requests vr
    WHERE vr.id = vendor_quotes.vendor_request_id
      AND vr.vendor_id = public.current_vendor_id()
  ));
CREATE POLICY vq_vendor_insert ON public.vendor_quotes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendor_requests vr
    WHERE vr.id = vendor_quotes.vendor_request_id
      AND vr.vendor_id = public.current_vendor_id()
  ));
CREATE POLICY vq_vendor_update ON public.vendor_quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_quotes.vendor_request_id
        AND vr.vendor_id = public.current_vendor_id()
    )
    AND vendor_quotes.is_approved = false
    AND vendor_quotes.rejected_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_quotes.vendor_request_id
        AND vr.vendor_id = public.current_vendor_id()
    )
  );

-- vendor_quote_items
DROP POLICY IF EXISTS "vqi auth all" ON public.vendor_quote_items;
CREATE POLICY vqi_staff_all ON public.vendor_quote_items FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY vqi_vendor_rw ON public.vendor_quote_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id = vq.vendor_request_id
    WHERE vq.id = vendor_quote_items.vendor_quote_id
      AND vr.vendor_id = public.current_vendor_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id = vq.vendor_request_id
    WHERE vq.id = vendor_quote_items.vendor_quote_id
      AND vr.vendor_id = public.current_vendor_id()
  ));

-- purchase_orders: vendor read own
CREATE POLICY po_vendor_read ON public.purchase_orders FOR SELECT
  USING (vendor_id = public.current_vendor_id());

-- dispatches: vendor read own (via PO)
CREATE POLICY disp_vendor_read ON public.dispatches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sales_orders so
    WHERE so.id = dispatches.sales_order_id
      -- dispatch is linked to sales_order not PO; vendor should not see customer SOs.
      -- Keep restrictive: no vendor access on dispatches at this milestone.
      AND false
  ));

-- file_objects: restrict to staff + vendor-scoped access for procurement folders
DROP POLICY IF EXISTS "files auth all" ON public.file_objects;
CREATE POLICY files_staff_all ON public.file_objects FOR ALL
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY files_vendor_read ON public.file_objects FOR SELECT
  USING (
    public.current_vendor_id() IS NOT NULL AND (
      (entity_type = 'rfq' AND EXISTS (
        SELECT 1 FROM public.vendor_requests vr
        WHERE vr.rfq_id = file_objects.entity_id
          AND vr.vendor_id = public.current_vendor_id()))
      OR (entity_type = 'vendor_request' AND EXISTS (
        SELECT 1 FROM public.vendor_requests vr
        WHERE vr.id = file_objects.entity_id
          AND vr.vendor_id = public.current_vendor_id()))
      OR (entity_type = 'vendor_quote' AND EXISTS (
        SELECT 1 FROM public.vendor_quotes vq
        JOIN public.vendor_requests vr ON vr.id = vq.vendor_request_id
        WHERE vq.id = file_objects.entity_id
          AND vr.vendor_id = public.current_vendor_id()))
      OR (entity_type = 'purchase_order' AND EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = file_objects.entity_id
          AND po.vendor_id = public.current_vendor_id()))
    )
  );
CREATE POLICY files_vendor_upload ON public.file_objects FOR INSERT
  WITH CHECK (
    public.current_vendor_id() IS NOT NULL
    AND entity_type IN ('vendor_quote','vendor_request')
    AND uploaded_by = auth.uid()
  );

-- enquiries: staff-only writes; SELECT remains true (already public in Module 1);
-- vendors don't need enquiry rows because RFQ read is scoped via vendor_requests.
DROP POLICY IF EXISTS "enquiries write auth" ON public.enquiries;
CREATE POLICY enquiries_staff_write ON public.enquiries FOR INSERT
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY enquiries_staff_update ON public.enquiries FOR UPDATE
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY enquiries_staff_delete ON public.enquiries FOR DELETE
  USING (public.has_staff_access(auth.uid()));
