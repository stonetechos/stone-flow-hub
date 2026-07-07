
CREATE INDEX IF NOT EXISTS idx_customers_is_active_active
  ON public.customers (created_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sales_orders_status
  ON public.sales_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_status_open
  ON public.invoices (status, created_at DESC)
  WHERE status NOT IN ('paid','cancelled');

CREATE INDEX IF NOT EXISTS idx_payments_paid_at
  ON public.payments (paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_stage_created
  ON public.enquiries (stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_status
  ON public.quotes (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfqs_status
  ON public.rfqs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_followups_status_scheduled
  ON public.followups (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
  ON public.activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_customer_id ON public.enquiries (customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_project_id  ON public.enquiries (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id  ON public.invoices  (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id   ON public.invoices  (project_id);
CREATE INDEX IF NOT EXISTS idx_followups_enquiry_id  ON public.followups (enquiry_id);
CREATE INDEX IF NOT EXISTS idx_followups_project_id  ON public.followups (project_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id  ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_project_id  ON public.sales_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON public.purchase_orders (vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders (project_id);
