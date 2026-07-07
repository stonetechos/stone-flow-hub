
-- 1) Vendor service categories
CREATE TABLE IF NOT EXISTS public.vendor_service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_service_categories TO authenticated;
GRANT ALL ON public.vendor_service_categories TO service_role;
ALTER TABLE public.vendor_service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsc_read_all" ON public.vendor_service_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vsc_staff_write" ON public.vendor_service_categories
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- Seed the 11 categories from the spec
INSERT INTO public.vendor_service_categories (code, name, sort_order) VALUES
  ('stone_mosaics',        'Stone Mosaics',          10),
  ('interlocking_panels',  'Stone Interlocking Panels', 20),
  ('stone_veneers',        'Stone Veneers',          30),
  ('sculptures',           'Sculptures',             40),
  ('murals',               'Murals',                 50),
  ('cnc_carving',          'CNC Carving',            60),
  ('waterjet_cutting',     'Waterjet Cutting',       70),
  ('installation',         'Installation',           80),
  ('transport',            'Transport',              90),
  ('surface_finishing',    'Surface Finishing',      100),
  ('edge_processing',      'Edge Processing',        110)
ON CONFLICT (code) DO NOTHING;

-- 2) Vendor <-> category link table (many-to-many)
CREATE TABLE IF NOT EXISTS public.vendor_service_links (
  vendor_id   uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.vendor_service_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, category_id)
);
CREATE INDEX IF NOT EXISTS vendor_service_links_category_idx
  ON public.vendor_service_links(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_service_links TO authenticated;
GRANT ALL ON public.vendor_service_links TO service_role;
ALTER TABLE public.vendor_service_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsl_read_all" ON public.vendor_service_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vsl_staff_write" ON public.vendor_service_links
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- 3) Extend vendors with contact fields + preferred flag
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS contact_person   text,
  ADD COLUMN IF NOT EXISTS mobile_number    text,
  ADD COLUMN IF NOT EXISTS whatsapp_number  text,
  ADD COLUMN IF NOT EXISTS email            text,
  ADD COLUMN IF NOT EXISTS is_preferred     boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vendors_is_preferred_idx
  ON public.vendors(is_preferred) WHERE is_preferred = true;

-- 4) Dependency scanner used by SafeDeleteDialog
CREATE OR REPLACE FUNCTION public.dependency_summary(
  _entity_type text,
  _entity_id   uuid
)
RETURNS TABLE (module text, count bigint, route text)
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
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
      SELECT 'RFQ Requests'::text, count(*)::bigint, '/rfqs'::text       FROM public.vendor_requests  WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Purchase Orders', count(*), '/purchase-orders' FROM public.purchase_orders WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Contacts',        count(*), ''                 FROM public.vendor_contacts WHERE vendor_id = _entity_id
      UNION ALL SELECT 'Products Linked', count(*), ''                 FROM public.vendor_products WHERE vendor_id = _entity_id;
  ELSIF _entity_type = 'project' THEN
    RETURN QUERY
      SELECT 'Enquiries'::text,   count(*)::bigint, '/enquiries'::text FROM public.enquiries      WHERE project_id = _entity_id
      UNION ALL SELECT 'Estimates',      count(*), '/estimates'      FROM public.estimates      WHERE project_id = _entity_id
      UNION ALL SELECT 'Quotations',     count(*), '/quotes'         FROM public.quotes         WHERE project_id = _entity_id
      UNION ALL SELECT 'Sales Orders',   count(*), '/sales-orders'   FROM public.sales_orders   WHERE project_id = _entity_id
      UNION ALL SELECT 'Purchase Orders',count(*), '/purchase-orders'FROM public.purchase_orders WHERE project_id = _entity_id
      UNION ALL SELECT 'Invoices',       count(*), '/invoices'       FROM public.invoices       WHERE project_id = _entity_id
      UNION ALL SELECT 'Production Orders', count(*), '/manufacturing' FROM public.production_orders WHERE project_id = _entity_id
      UNION ALL SELECT 'Site Visits',    count(*), ''                FROM public.site_visits    WHERE project_id = _entity_id
      UNION ALL SELECT 'Follow-ups',     count(*), '/followups'      FROM public.followups      WHERE project_id = _entity_id
      UNION ALL SELECT 'Notes',          count(*), ''                FROM public.project_notes  WHERE project_id = _entity_id
      UNION ALL SELECT 'Files',          count(*), '/documents'      FROM public.file_objects   WHERE project_id = _entity_id;
  ELSIF _entity_type = 'product' THEN
    RETURN QUERY
      SELECT 'Enquiry Items'::text, count(*)::bigint, '/enquiries'::text FROM public.enquiry_items   WHERE product_id = _entity_id
      UNION ALL SELECT 'Quote Items',    count(*), '/quotes'        FROM public.quote_items      WHERE product_id = _entity_id
      UNION ALL SELECT 'Invoice Items',  count(*), '/invoices'      FROM public.invoice_items    WHERE product_id = _entity_id
      UNION ALL SELECT 'RFQ Items',      count(*), '/rfqs'          FROM public.rfq_items        WHERE product_id = _entity_id
      UNION ALL SELECT 'Estimate Items', count(*), '/estimates'     FROM public.estimate_items   WHERE product_id = _entity_id
      UNION ALL SELECT 'Production Orders', count(*), '/manufacturing' FROM public.production_orders WHERE product_id = _entity_id
      UNION ALL SELECT 'Inventory Items',count(*), '/inventory'     FROM public.inventory_items  WHERE product_id = _entity_id
      UNION ALL SELECT 'Vendor Products',count(*), ''               FROM public.vendor_products  WHERE product_id = _entity_id;
  ELSE
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.dependency_summary(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dependency_summary(text, uuid) TO authenticated;
