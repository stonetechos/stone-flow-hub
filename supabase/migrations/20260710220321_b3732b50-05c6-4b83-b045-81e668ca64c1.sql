
-- 1) activity_log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
  ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_created
  ON public.activity_log (entity_type, entity_id, created_at DESC);

-- 2) Foreign-key indexes for the commercial workflow

-- ownership-transfer columns
CREATE INDEX IF NOT EXISTS idx_projects_original_customer_id     ON public.projects (original_customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_original_customer_id       ON public.quotes (original_customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_original_customer_id ON public.sales_orders (original_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_original_customer_id     ON public.invoices (original_customer_id);

-- quotes / invoices / sales_orders link columns
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id  ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id   ON public.quotes (project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_enquiry_id   ON public.quotes (enquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotes_estimate_id  ON public.quotes (estimate_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by   ON public.quotes (created_by);

CREATE INDEX IF NOT EXISTS idx_sales_orders_quote_id ON public.sales_orders (quote_id);

CREATE INDEX IF NOT EXISTS idx_invoices_quote_id    ON public.invoices (quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by  ON public.invoices (created_by);

-- item-level product FKs
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id        ON public.quote_items (product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id      ON public.invoice_items (product_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_items_product_id      ON public.enquiry_items (product_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_product_id          ON public.rfq_items (product_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_enquiry_item_id     ON public.rfq_items (enquiry_item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quote_items_product_id ON public.vendor_quote_items (product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quote_items_rfq_item_id ON public.vendor_quote_items (rfq_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id    ON public.inventory_items (product_id);

-- vendor quote lineage / approval
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_approved_by    ON public.vendor_quotes (approved_by);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_submitted_by   ON public.vendor_quotes (submitted_by);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_revision_of    ON public.vendor_quotes (revision_of);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_quote_pdf_file_id ON public.vendor_quotes (quote_pdf_file_id);

-- product master lookups
CREATE INDEX IF NOT EXISTS idx_products_colour_id          ON public.products (colour_id);
CREATE INDEX IF NOT EXISTS idx_products_edge_finish_id     ON public.products (edge_finish_id);
CREATE INDEX IF NOT EXISTS idx_products_origin_id          ON public.products (origin_id);
CREATE INDEX IF NOT EXISTS idx_products_surface_finish_id  ON public.products (surface_finish_id);
CREATE INDEX IF NOT EXISTS idx_products_thickness_id       ON public.products (thickness_id);
CREATE INDEX IF NOT EXISTS idx_products_uom_id             ON public.products (uom_id);
CREATE INDEX IF NOT EXISTS idx_products_quality_grade_id   ON public.products (quality_grade_id);
CREATE INDEX IF NOT EXISTS idx_products_packaging_type_id  ON public.products (packaging_type_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by         ON public.products (created_by);
CREATE INDEX IF NOT EXISTS idx_products_deleted_by         ON public.products (deleted_by);

-- customers / vendors / projects auditor + linkage
CREATE INDEX IF NOT EXISTS idx_customers_created_by       ON public.customers (created_by);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_by       ON public.customers (deleted_by);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by         ON public.vendors (created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_by         ON public.vendors (deleted_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by        ON public.projects (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_by        ON public.projects (deleted_by);
CREATE INDEX IF NOT EXISTS idx_projects_architect_contact_id ON public.projects (architect_contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_purchase_contact_id  ON public.projects (purchase_contact_id);

-- enquiries / rfqs / vendor_requests / followups / tasks
CREATE INDEX IF NOT EXISTS idx_enquiries_created_by         ON public.enquiries (created_by);
CREATE INDEX IF NOT EXISTS idx_enquiry_stage_history_changed_by ON public.enquiry_stage_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_rfqs_created_by              ON public.rfqs (created_by);
CREATE INDEX IF NOT EXISTS idx_vendor_requests_sent_by      ON public.vendor_requests (sent_by);
CREATE INDEX IF NOT EXISTS idx_followups_created_by         ON public.followups (created_by);
CREATE INDEX IF NOT EXISTS idx_followups_next_followup_id   ON public.followups (next_followup_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to            ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by             ON public.tasks (created_by);

-- payments / payment_links / receipts / purchase_orders
CREATE INDEX IF NOT EXISTS idx_payments_payment_link_id     ON public.payments (payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by         ON public.payments (recorded_by);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_by     ON public.payment_links (created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_rfq_id       ON public.purchase_orders (rfq_id);

-- roles / files / support tables
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by        ON public.user_roles (granted_by);
CREATE INDEX IF NOT EXISTS idx_file_objects_uploaded_by     ON public.file_objects (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_site_visits_conducted_by     ON public.site_visits (conducted_by);
CREATE INDEX IF NOT EXISTS idx_site_visits_created_by       ON public.site_visits (created_by);
CREATE INDEX IF NOT EXISTS idx_project_notes_author_id      ON public.project_notes (author_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories (parent_id);

-- 3) Revoke direct EXECUTE on trigger-only SECURITY DEFINER helpers.
-- Postgres triggers invoke these under the definer/owner regardless of API grants,
-- so trigger behaviour is unchanged; only direct RPC calls are now blocked.
REVOKE EXECUTE ON FUNCTION public.trg_dispatch_fill_from_so()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_dispatch_milestone()         FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_install_milestone()          FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_prod_milestone()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_quote_item_recalc()          FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_quote_milestone()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_po()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vq()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vr()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_receipt_advance()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_receipt_alloc_sync()         FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_rfq_milestone()              FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sales_order_header_recalc()  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sales_order_item_recalc()    FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sv_milestone()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_vq_milestone()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_dispatch()                FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_enquiry()                 FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_installation()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_payment_schedule()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_po()                      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_wf_site_visit()              FROM anon, authenticated, PUBLIC;
