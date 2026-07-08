
CREATE OR REPLACE FUNCTION public._mdm_module_label(_tbl text)
RETURNS TABLE(label text, route text)
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT t.label, t.route FROM (VALUES
    ('projects','Projects','/projects'),
    ('enquiries','Enquiries','/enquiries'),
    ('estimates','Estimates','/estimates'),
    ('quotes','Quotations','/quotes'),
    ('quote_items','Quotation Items','/quotes'),
    ('sales_orders','Sales Orders','/sales-orders'),
    ('invoices','Invoices','/invoices'),
    ('invoice_items','Invoice Items','/invoices'),
    ('receipts','Receipts','/receipts'),
    ('receipt_allocations','Receipt Allocations','/receipts'),
    ('credit_notes','Credit Notes','/receipts'),
    ('debit_notes','Debit Notes','/receipts'),
    ('refunds','Refunds','/receipts'),
    ('purchase_orders','Purchase Orders','/purchase-orders'),
    ('production_orders','Production Orders','/manufacturing'),
    ('production_pieces','Production Pieces','/manufacturing'),
    ('rfqs','RFQs','/rfqs'),
    ('rfq_items','RFQ Items','/rfqs'),
    ('vendor_requests','RFQ Requests','/rfqs'),
    ('vendor_quotes','Vendor Quotes','/rfqs'),
    ('vendor_quote_items','Vendor Quote Items','/rfqs'),
    ('vendor_payments','Vendor Payments','/vendor-payments'),
    ('vendor_ledger_entries','Ledger Entries',''),
    ('vendor_contacts','Vendor Contacts',''),
    ('vendor_products','Vendor Products',''),
    ('customer_contacts','Customer Contacts',''),
    ('customer_payment_schedules','Payment Schedules',''),
    ('followups','Follow-ups','/followups'),
    ('tasks','Tasks','/tasks'),
    ('comments','Comments',''),
    ('activity_log','Activity Log','/activity'),
    ('site_visits','Site Visits',''),
    ('project_notes','Project Notes',''),
    ('project_tags','Project Tags',''),
    ('customer_tags','Customer Tags',''),
    ('enquiry_tags','Enquiry Tags',''),
    ('vendor_tags','Vendor Tags',''),
    ('file_objects','Files','/documents'),
    ('grns','GRNs','/grns'),
    ('grn_items','GRN Items','/grns'),
    ('inventory_items','Inventory Items','/inventory'),
    ('inventory_movements','Inventory Movements','/inventory'),
    ('installations','Installations','/installations'),
    ('installation_progress','Installation Progress','/installations'),
    ('installation_materials','Installation Materials','/installations'),
    ('installation_signoffs','Installation Sign-offs','/installations'),
    ('dispatches','Dispatches','/dispatch'),
    ('estimate_items','Estimate Items','/estimates'),
    ('estimate_cost_components','Estimate Cost Components','/estimates'),
    ('estimate_payment_schedules','Estimate Payment Schedules','/estimates'),
    ('estimate_documents','Estimate Documents','/estimates'),
    ('enquiry_items','Enquiry Items','/enquiries'),
    ('enquiry_stage_history','Enquiry Stage History','/enquiries'),
    ('document_lineage','Document Lineage',''),
    ('artwork_approvals','Artwork Approvals',''),
    ('product_artworks','Product Artworks',''),
    ('product_technical_docs','Product Technical Docs',''),
    ('product_veneer_specs','Product Veneer Specs',''),
    ('product_similar','Similar Products',''),
    ('product_price_history','Price History',''),
    ('product_images','Product Images',''),
    ('favorites','Favourites',''),
    ('message_queue','Messages Queued','/messages'),
    ('payments','Payments','/payments'),
    ('payment_links','Payment Links',''),
    ('applications','Applications',''),
    ('qc_results','QC Results',''),
    ('vendor_performance_cache','Vendor Performance','')
  ) AS t(tbl, label, route)
  WHERE t.tbl = _tbl;
$$;

CREATE OR REPLACE FUNCTION public.dependency_summary(
  _entity_type text,
  _entity_id uuid
)
RETURNS TABLE(module text, count bigint, route text, blocking boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.purge_entity(
  _entity_type text,
  _entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    ELSE RAISE EXCEPTION 'purge_entity: unsupported entity_type %',
      _entity_type USING ERRCODE = '22023';
  END CASE;
END $$;

GRANT EXECUTE ON FUNCTION public._mdm_module_label(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.dependency_summary(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_entity(text, uuid) TO authenticated, service_role;
