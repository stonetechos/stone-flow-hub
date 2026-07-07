-- =============================================================================
-- Phase A · Slice 1
-- Master Data Lifecycle · Reusable Dependency Engine · Vendor Ledger Foundation
-- Backward compatible: a BEFORE trigger keeps is_active in sync with lifecycle.
-- =============================================================================

-- 1) Lifecycle enum
DO $$ BEGIN
  CREATE TYPE public.mdm_lifecycle_status AS ENUM ('active','inactive','archived','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Lifecycle columns on the four masters
DO $mig$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','vendors','projects','products'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS lifecycle_status public.mdm_lifecycle_status NOT NULL DEFAULT ''active''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at  timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES auth.users(id)', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(lifecycle_status)', t || '_lifecycle_idx', t);
  END LOOP;
END $mig$;

-- 3) Backfill from legacy is_active
UPDATE public.customers SET lifecycle_status='inactive' WHERE is_active=false AND lifecycle_status='active';
UPDATE public.vendors   SET lifecycle_status='inactive' WHERE is_active=false AND lifecycle_status='active';
UPDATE public.projects  SET lifecycle_status='inactive' WHERE is_active=false AND lifecycle_status='active';
UPDATE public.products  SET lifecycle_status='inactive' WHERE is_active=false AND lifecycle_status='active';

-- 4) Bi-directional sync trigger
CREATE OR REPLACE FUNCTION public.sync_lifecycle_is_active()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_status IS NULL THEN NEW.lifecycle_status := 'active'; END IF;
    IF NEW.is_active = false AND NEW.lifecycle_status = 'active' THEN
      NEW.lifecycle_status := 'inactive';
    END IF;
    NEW.is_active := (NEW.lifecycle_status = 'active');
    IF NEW.lifecycle_status = 'archived' AND NEW.archived_at IS NULL THEN NEW.archived_at := now(); END IF;
    IF NEW.lifecycle_status = 'deleted'  AND NEW.deleted_at  IS NULL THEN
      NEW.deleted_at := now();
      NEW.deleted_by := COALESCE(NEW.deleted_by, auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
      NEW.is_active := (NEW.lifecycle_status = 'active');
      IF NEW.lifecycle_status = 'archived' THEN NEW.archived_at := COALESCE(NEW.archived_at, now()); END IF;
      IF NEW.lifecycle_status = 'deleted'  THEN
        NEW.deleted_at := COALESCE(NEW.deleted_at, now());
        NEW.deleted_by := COALESCE(NEW.deleted_by, auth.uid());
      END IF;
      IF NEW.lifecycle_status = 'active' THEN
        NEW.archived_at := NULL; NEW.deleted_at := NULL; NEW.deleted_by := NULL;
      END IF;
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.lifecycle_status := CASE WHEN NEW.is_active THEN 'active'::public.mdm_lifecycle_status ELSE 'inactive'::public.mdm_lifecycle_status END;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.sync_lifecycle_is_active() FROM PUBLIC, anon, authenticated;

DO $mig$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','vendors','projects','products'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_lifecycle ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sync_lifecycle BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_lifecycle_is_active()', t);
  END LOOP;
END $mig$;

-- 5) Vendor Ledger foundation (needed before extending dependency_summary)
CREATE TABLE IF NOT EXISTS public.vendor_ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  entry_date    date NOT NULL DEFAULT CURRENT_DATE,
  source_type   text NOT NULL,
  source_id     uuid,
  ref_no        text,
  description   text,
  debit         numeric(14,2) NOT NULL DEFAULT 0,
  credit        numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'INR',
  status        text,
  route         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS vle_source_uk ON public.vendor_ledger_entries(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vle_vendor_idx ON public.vendor_ledger_entries(vendor_id, entry_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_ledger_entries TO authenticated;
GRANT ALL                            ON public.vendor_ledger_entries TO service_role;
ALTER TABLE public.vendor_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vle_staff_read  ON public.vendor_ledger_entries;
DROP POLICY IF EXISTS vle_staff_write ON public.vendor_ledger_entries;
CREATE POLICY vle_staff_read  ON public.vendor_ledger_entries FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY vle_staff_write ON public.vendor_ledger_entries FOR ALL    TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE OR REPLACE VIEW public.vendor_ledger WITH (security_invoker = on) AS
SELECT
  e.id, e.vendor_id, e.entry_date, e.source_type, e.source_id, e.ref_no,
  e.description, e.debit, e.credit, e.currency_code, e.status, e.route,
  e.metadata, e.created_at,
  SUM(e.debit - e.credit) OVER (
    PARTITION BY e.vendor_id
    ORDER BY e.entry_date, e.created_at, e.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_balance
FROM public.vendor_ledger_entries e;

GRANT SELECT ON public.vendor_ledger TO authenticated;

CREATE OR REPLACE FUNCTION public.vendor_ledger_upsert(
  _vendor_id uuid, _entry_date date, _source_type text, _source_id uuid,
  _ref_no text, _description text, _debit numeric, _credit numeric,
  _currency_code text, _status text, _route text, _metadata jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.vendor_ledger_entries (
    vendor_id, entry_date, source_type, source_id, ref_no, description,
    debit, credit, currency_code, status, route, metadata, created_by
  ) VALUES (
    _vendor_id, COALESCE(_entry_date, CURRENT_DATE), _source_type, _source_id,
    _ref_no, _description, COALESCE(_debit,0), COALESCE(_credit,0),
    COALESCE(_currency_code,'INR'), _status, _route,
    COALESCE(_metadata, '{}'::jsonb), auth.uid()
  )
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET vendor_id=EXCLUDED.vendor_id, entry_date=EXCLUDED.entry_date,
        ref_no=EXCLUDED.ref_no, description=EXCLUDED.description,
        debit=EXCLUDED.debit, credit=EXCLUDED.credit,
        currency_code=EXCLUDED.currency_code, status=EXCLUDED.status,
        route=EXCLUDED.route, metadata=EXCLUDED.metadata
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.vendor_ledger_upsert(uuid,date,text,uuid,text,text,numeric,numeric,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- 6) Reusable dependency engine (extended)
CREATE OR REPLACE FUNCTION public.dependency_summary(_entity_type text, _entity_id uuid)
RETURNS TABLE (module text, count bigint, route text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF _entity_type = 'customer' THEN
    RETURN QUERY
      SELECT 'Projects'::text,    count(*)::bigint, '/projects'::text        FROM public.projects        WHERE customer_id = _entity_id
      UNION ALL SELECT 'Enquiries',    count(*), '/enquiries'      FROM public.enquiries      WHERE customer_id = _entity_id
      UNION ALL SELECT 'Estimates',    count(*), '/estimates'      FROM public.estimates      WHERE customer_id = _entity_id
      UNION ALL SELECT 'Quotations',   count(*), '/quotes'         FROM public.quotes         WHERE customer_id = _entity_id
      UNION ALL SELECT 'Sales Orders', count(*), '/sales-orders'   FROM public.sales_orders   WHERE customer_id = _entity_id
      UNION ALL SELECT 'Invoices',     count(*), '/invoices'       FROM public.invoices       WHERE customer_id = _entity_id
      UNION ALL SELECT 'Receipts',     count(*), '/receipts'       FROM public.receipts       WHERE customer_id = _entity_id
      UNION ALL SELECT 'Credit Notes', count(*), '/receipts'       FROM public.credit_notes   WHERE customer_id = _entity_id
      UNION ALL SELECT 'Debit Notes',  count(*), '/receipts'       FROM public.debit_notes    WHERE customer_id = _entity_id
      UNION ALL SELECT 'Refunds',      count(*), '/receipts'       FROM public.refunds        WHERE customer_id = _entity_id
      UNION ALL SELECT 'Contacts',     count(*), ''                FROM public.customer_contacts WHERE customer_id = _entity_id;
  ELSIF _entity_type = 'vendor' THEN
    RETURN QUERY
      SELECT 'RFQ Requests'::text,   count(*)::bigint, '/rfqs'::text            FROM public.vendor_requests  WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Purchase Orders', count(*), '/purchase-orders' FROM public.purchase_orders WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Vendor Quotes',   count(*), '/rfqs'
        FROM public.vendor_quotes vq JOIN public.vendor_requests vr ON vr.id = vq.vendor_request_id
        WHERE vr.vendor_id = _entity_id
      UNION ALL SELECT 'Contacts',        count(*), ''  FROM public.vendor_contacts WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Products Linked', count(*), ''  FROM public.vendor_products WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Ledger Entries',  count(*), ''  FROM public.vendor_ledger_entries WHERE vendor_id = _entity_id;
  ELSIF _entity_type = 'project' THEN
    RETURN QUERY
      SELECT 'Enquiries'::text,   count(*)::bigint, '/enquiries'::text FROM public.enquiries      WHERE project_id = _entity_id
      UNION ALL SELECT 'Estimates',        count(*), '/estimates'      FROM public.estimates      WHERE project_id = _entity_id
      UNION ALL SELECT 'Quotations',       count(*), '/quotes'         FROM public.quotes         WHERE project_id = _entity_id
      UNION ALL SELECT 'Sales Orders',     count(*), '/sales-orders'   FROM public.sales_orders   WHERE project_id = _entity_id
      UNION ALL SELECT 'Purchase Orders',  count(*), '/purchase-orders'FROM public.purchase_orders WHERE project_id = _entity_id
      UNION ALL SELECT 'Invoices',         count(*), '/invoices'       FROM public.invoices       WHERE project_id = _entity_id
      UNION ALL SELECT 'Production Orders',count(*), '/manufacturing'  FROM public.production_orders WHERE project_id = _entity_id
      UNION ALL SELECT 'Site Visits',      count(*), ''                FROM public.site_visits    WHERE project_id = _entity_id
      UNION ALL SELECT 'Follow-ups',       count(*), '/followups'      FROM public.followups      WHERE project_id = _entity_id
      UNION ALL SELECT 'Notes',            count(*), ''                FROM public.project_notes  WHERE project_id = _entity_id
      UNION ALL SELECT 'Files',            count(*), '/documents'      FROM public.file_objects   WHERE entity_type='project' AND entity_id = _entity_id;
  ELSIF _entity_type = 'product' THEN
    RETURN QUERY
      SELECT 'Enquiry Items'::text,   count(*)::bigint, '/enquiries'::text FROM public.enquiry_items    WHERE product_id = _entity_id
      UNION ALL SELECT 'Quote Items',       count(*), '/quotes'         FROM public.quote_items      WHERE product_id = _entity_id
      UNION ALL SELECT 'Invoice Items',     count(*), '/invoices'       FROM public.invoice_items    WHERE product_id = _entity_id
      UNION ALL SELECT 'RFQ Items',         count(*), '/rfqs'           FROM public.rfq_items        WHERE product_id = _entity_id
      UNION ALL SELECT 'Estimate Items',    count(*), '/estimates'      FROM public.estimate_items   WHERE product_id = _entity_id
      UNION ALL SELECT 'Production Orders', count(*), '/manufacturing'  FROM public.production_orders WHERE product_id = _entity_id
      UNION ALL SELECT 'Inventory Items',   count(*), '/inventory'      FROM public.inventory_items  WHERE product_id = _entity_id
      UNION ALL SELECT 'Vendor Products',   count(*), ''                FROM public.vendor_products  WHERE product_id = _entity_id;
  ELSIF _entity_type = 'estimate' THEN
    RETURN QUERY
      SELECT 'Quotations'::text,       count(*)::bigint, '/quotes'::text FROM public.quotes                    WHERE estimate_id = _entity_id
      UNION ALL SELECT 'Line Items',        count(*), '' FROM public.estimate_items            WHERE estimate_id = _entity_id
      UNION ALL SELECT 'Cost Components',   count(*), '' FROM public.estimate_cost_components   WHERE estimate_id = _entity_id
      UNION ALL SELECT 'Payment Schedules', count(*), '' FROM public.estimate_payment_schedules WHERE estimate_id = _entity_id
      UNION ALL SELECT 'Documents',         count(*), '' FROM public.estimate_documents         WHERE estimate_id = _entity_id;
  ELSIF _entity_type = 'quote' THEN
    RETURN QUERY
      SELECT 'Sales Orders'::text, count(*)::bigint, '/sales-orders'::text FROM public.sales_orders WHERE quote_id = _entity_id
      UNION ALL SELECT 'Invoices',      count(*), '/invoices' FROM public.invoices    WHERE quote_id = _entity_id
      UNION ALL SELECT 'Line Items',    count(*), ''          FROM public.quote_items WHERE quote_id = _entity_id;
  ELSIF _entity_type = 'sales_order' THEN
    RETURN QUERY
      SELECT 'Dispatches'::text,      count(*)::bigint, '/dispatch'::text     FROM public.dispatches        WHERE sales_order_id = _entity_id
      UNION ALL SELECT 'Production Orders', count(*), '/manufacturing'        FROM public.production_orders WHERE sales_order_id = _entity_id;
  ELSIF _entity_type = 'purchase_order' THEN
    RETURN QUERY
      SELECT 'Ledger Entries'::text, count(*)::bigint, ''::text
        FROM public.vendor_ledger_entries
        WHERE source_type = 'purchase_order' AND source_id = _entity_id;
  ELSE
    RETURN;
  END IF;
END $$;

REVOKE ALL    ON FUNCTION public.dependency_summary(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dependency_summary(text, uuid) TO authenticated;

-- 7) Admin-only hard purge
CREATE OR REPLACE FUNCTION public.purge_entity(_entity_type text, _entity_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE blocking bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'purge_entity: admin role required' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(sum(count), 0) INTO blocking
    FROM public.dependency_summary(_entity_type, _entity_id) d
    WHERE d.module IN (
      'Projects','Enquiries','Estimates','Quotations','Sales Orders',
      'Purchase Orders','Invoices','Receipts','Credit Notes','Debit Notes',
      'Refunds','Production Orders','RFQ Requests','Vendor Quotes',
      'Quote Items','Invoice Items','RFQ Items','Estimate Items',
      'Inventory Items','Dispatches','Ledger Entries'
    );
  IF blocking > 0 THEN
    RAISE EXCEPTION 'purge_entity: % has % blocking references; archive instead', _entity_type, blocking USING ERRCODE = '23503';
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
    ELSE RAISE EXCEPTION 'purge_entity: unsupported entity_type %', _entity_type USING ERRCODE = '22023';
  END CASE;
END $$;

REVOKE ALL    ON FUNCTION public.purge_entity(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_entity(text, uuid) TO authenticated;
