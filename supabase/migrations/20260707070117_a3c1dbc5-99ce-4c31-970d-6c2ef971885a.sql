
-- =========================================================================
-- Phase 3 — Commercial Automation & Customer Communication
-- =========================================================================

-- 1. document_lineage --------------------------------------------------
CREATE TABLE public.document_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id   uuid NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id  uuid REFERENCES public.projects(id)  ON DELETE SET NULL,
  converted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX doc_lineage_src_idx ON public.document_lineage(source_type, source_id);
CREATE INDEX doc_lineage_tgt_idx ON public.document_lineage(target_type, target_id);
CREATE INDEX doc_lineage_cust_idx ON public.document_lineage(customer_id, converted_at DESC);
GRANT SELECT, INSERT ON public.document_lineage TO authenticated;
GRANT ALL ON public.document_lineage TO service_role;
ALTER TABLE public.document_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read lineage" ON public.document_lineage FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "staff write lineage" ON public.document_lineage FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

-- 2. payment_links extend ---------------------------------------------
-- payment_links already exists (14 cols per schema). Ensure required cols exist.
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_ref text,
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payment_links_token_uq ON public.payment_links(token) WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_links_entity_idx ON public.payment_links(entity_type, entity_id);

-- 3. message_queue extensions -----------------------------------------
ALTER TABLE public.message_queue
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_reason text,
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE INDEX IF NOT EXISTS msg_q_provider_msg_idx ON public.message_queue(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- 4. message_templates extensions -------------------------------------
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'generic';

CREATE INDEX IF NOT EXISTS msg_tpl_entity_idx ON public.message_templates(entity_type, channel, template_kind) WHERE is_active;

-- 5. Feature flags & branding in app_settings -------------------------
INSERT INTO public.app_settings (key, value, description) VALUES
  ('feature_flags',
   '{"send_email":true,"send_whatsapp":true,"customer_timeline":true,"manual_payment_link":true,"razorpay":false,"cashfree":false,"stripe":false,"paypal":false}',
   'Feature flags for gated modules'),
  ('branding',
   '{"company_name":"Stone Tech","tagline":"Natural Stone Excellence","primary":"#0d9488","accent":"#334155","logo_url":"","address":"","phone":"","email":"","gstin":"","website":""}',
   'Stone Tech branding used in PDFs, emails and message previews')
ON CONFLICT (key) DO NOTHING;

-- 6. Seed Stone Tech templates ---------------------------------------
INSERT INTO public.message_templates
  (code, name, channel, category, entity_type, template_kind, subject, body, variables) VALUES

  ('estimate.supplier_only.whatsapp',
   'Estimate — Supplier Only (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'supplier_only', NULL,
   'Hi {{CustomerName}},

Your estimate *{{EstimateNo}}* for {{ProjectName}} is ready.

Material: {{StoneType}} ({{SurfaceFinish}}, {{EdgeFinish}})
Area: {{Area}} {{Uom}}
Material Cost: {{MaterialCost}}
GST: {{GST}}
Total: {{InvoiceAmount}}

Advance requested: {{Advance}}
{{PaymentLink}}

Regards,
Stone Tech',
   '["CustomerName","EstimateNo","ProjectName","StoneType","SurfaceFinish","EdgeFinish","Area","Uom","MaterialCost","GST","InvoiceAmount","Advance","PaymentLink"]'::jsonb),

  ('estimate.supplier_installer.whatsapp',
   'Estimate — Supplier + Installation (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'supplier_installer', NULL,
   'Hi {{CustomerName}},

Please find your estimate *{{EstimateNo}}* for {{ProjectName}}.

Material ({{StoneType}} / {{SurfaceFinish}} / {{EdgeFinish}}): {{MaterialCost}}
Installation: {{InstallationCost}}
GST: {{GST}}
*Total: {{InvoiceAmount}}*

Advance: {{Advance}}
{{PaymentLink}}

— Stone Tech',
   '["CustomerName","EstimateNo","ProjectName","StoneType","SurfaceFinish","EdgeFinish","MaterialCost","InstallationCost","GST","InvoiceAmount","Advance","PaymentLink"]'::jsonb),

  ('estimate.custom_articles.whatsapp',
   'Estimate — Custom Stone Articles (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'custom_articles', NULL,
   'Hi {{CustomerName}},

Estimate *{{EstimateNo}}* for custom stone articles — {{ProjectName}}.

{{Material}} · Qty {{Quantity}}
Manufacturing: {{ManufacturingCost}}
Material: {{MaterialCost}}
GST: {{GST}}
Total: {{InvoiceAmount}}
{{PaymentLink}}

— Stone Tech',
   '["CustomerName","EstimateNo","ProjectName","Material","Quantity","ManufacturingCost","MaterialCost","GST","InvoiceAmount","PaymentLink"]'::jsonb),

  ('estimate.veneers.whatsapp',
   'Estimate — Veneers (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'veneers', NULL,
   'Hi {{CustomerName}}, veneer estimate {{EstimateNo}}: {{Area}} sqft, total {{InvoiceAmount}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","EstimateNo","Area","InvoiceAmount","PaymentLink"]'::jsonb),
  ('estimate.panels.whatsapp',
   'Estimate — Panels (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'panels', NULL,
   'Hi {{CustomerName}}, panels estimate {{EstimateNo}}: {{Quantity}} panels, total {{InvoiceAmount}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","EstimateNo","Quantity","InvoiceAmount","PaymentLink"]'::jsonb),
  ('estimate.murals.whatsapp',
   'Estimate — Murals (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'murals', NULL,
   'Hi {{CustomerName}}, mural estimate {{EstimateNo}} for {{ProjectName}}: {{InvoiceAmount}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","EstimateNo","ProjectName","InvoiceAmount","PaymentLink"]'::jsonb),
  ('estimate.sculptures.whatsapp',
   'Estimate — Sculptures (WhatsApp)', 'whatsapp', 'estimate', 'estimate', 'sculptures', NULL,
   'Hi {{CustomerName}}, sculpture estimate {{EstimateNo}}: {{InvoiceAmount}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","EstimateNo","InvoiceAmount","PaymentLink"]'::jsonb),

  ('quote.default.whatsapp',
   'Quotation — Default (WhatsApp)', 'whatsapp', 'quote', 'quote', 'generic', NULL,
   'Hi {{CustomerName}}, your quotation *{{QuotationNo}}* for {{ProjectName}} totals {{InvoiceAmount}} (incl. {{GST}} GST). {{PaymentLink}} — Stone Tech',
   '["CustomerName","QuotationNo","ProjectName","InvoiceAmount","GST","PaymentLink"]'::jsonb),
  ('quote.default.email',
   'Quotation — Default (Email)', 'email', 'quote', 'quote', 'generic',
   'Quotation {{QuotationNo}} — {{ProjectName}}',
   'Dear {{CustomerName}},<br/><br/>Please find our quotation <b>{{QuotationNo}}</b> for <b>{{ProjectName}}</b>.<br/>Total: <b>{{InvoiceAmount}}</b> (GST {{GST}}).<br/>{{PaymentLink}}<br/><br/>Regards,<br/>Stone Tech',
   '["CustomerName","QuotationNo","ProjectName","InvoiceAmount","GST","PaymentLink"]'::jsonb),

  ('invoice.default.whatsapp',
   'Invoice — Default (WhatsApp)', 'whatsapp', 'invoice', 'invoice', 'generic', NULL,
   'Hi {{CustomerName}}, invoice *{{InvoiceNo}}* for {{ProjectName}}: {{InvoiceAmount}}. Outstanding: {{Outstanding}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","InvoiceNo","ProjectName","InvoiceAmount","Outstanding","PaymentLink"]'::jsonb),
  ('invoice.default.email',
   'Invoice — Default (Email)', 'email', 'invoice', 'invoice', 'generic',
   'Invoice {{InvoiceNo}}',
   'Dear {{CustomerName}},<br/><br/>Invoice <b>{{InvoiceNo}}</b>: <b>{{InvoiceAmount}}</b>. Outstanding: <b>{{Outstanding}}</b>.<br/>{{PaymentLink}}<br/><br/>Stone Tech',
   '["CustomerName","InvoiceNo","InvoiceAmount","Outstanding","PaymentLink"]'::jsonb),

  ('receipt.default.whatsapp',
   'Receipt — Default (WhatsApp)', 'whatsapp', 'receipt', 'receipt', 'generic', NULL,
   'Hi {{CustomerName}}, we received *{{InvoiceAmount}}* against {{ReceiptNo}}. Thank you! — Stone Tech',
   '["CustomerName","ReceiptNo","InvoiceAmount"]'::jsonb),
  ('receipt.default.email',
   'Receipt — Default (Email)', 'email', 'receipt', 'receipt', 'generic',
   'Payment received — {{ReceiptNo}}',
   'Dear {{CustomerName}},<br/><br/>We have received <b>{{InvoiceAmount}}</b> against receipt <b>{{ReceiptNo}}</b>.<br/><br/>Regards,<br/>Stone Tech',
   '["CustomerName","ReceiptNo","InvoiceAmount"]'::jsonb),

  ('dispatch.default.whatsapp',
   'Dispatch — Default (WhatsApp)', 'whatsapp', 'dispatch', 'dispatch', 'generic', NULL,
   'Hi {{CustomerName}}, dispatch note *{{DispatchNo}}* sent on {{DispatchDate}}. Tracking: {{Tracking}}. — Stone Tech',
   '["CustomerName","DispatchNo","DispatchDate","Tracking"]'::jsonb),
  ('dispatch.default.email',
   'Dispatch — Default (Email)', 'email', 'dispatch', 'dispatch', 'generic',
   'Dispatch note {{DispatchNo}}',
   'Dear {{CustomerName}},<br/><br/>Your order has been dispatched on <b>{{DispatchDate}}</b>. Reference: {{DispatchNo}}.<br/><br/>Stone Tech',
   '["CustomerName","DispatchNo","DispatchDate"]'::jsonb),

  ('po.default.email',
   'Purchase Order — Default (Email)', 'email', 'purchase_order', 'purchase_order', 'generic',
   'PO {{PoNo}} — {{VendorName}}',
   'Dear {{VendorName}},<br/><br/>Please find our purchase order <b>{{PoNo}}</b>. Total: <b>{{InvoiceAmount}}</b>.<br/><br/>Regards,<br/>Stone Tech',
   '["VendorName","PoNo","InvoiceAmount"]'::jsonb),
  ('po.default.whatsapp',
   'Purchase Order — Default (WhatsApp)', 'whatsapp', 'purchase_order', 'purchase_order', 'generic', NULL,
   'Hi {{VendorName}}, PO *{{PoNo}}* placed. Total {{InvoiceAmount}}. — Stone Tech',
   '["VendorName","PoNo","InvoiceAmount"]'::jsonb),

  ('reminder.payment.whatsapp',
   'Payment Reminder (WhatsApp)', 'whatsapp', 'reminder', 'reminder', 'generic', NULL,
   'Hi {{CustomerName}}, gentle reminder: {{Outstanding}} outstanding against {{InvoiceNo}}. {{PaymentLink}} — Stone Tech',
   '["CustomerName","InvoiceNo","Outstanding","PaymentLink"]'::jsonb),
  ('reminder.payment.email',
   'Payment Reminder (Email)', 'email', 'reminder', 'reminder', 'generic',
   'Payment reminder — {{InvoiceNo}}',
   'Dear {{CustomerName}},<br/><br/>Gentle reminder: <b>{{Outstanding}}</b> is outstanding against invoice <b>{{InvoiceNo}}</b>.<br/>{{PaymentLink}}<br/><br/>Regards,<br/>Stone Tech',
   '["CustomerName","InvoiceNo","Outstanding","PaymentLink"]'::jsonb),

  ('followup.default.whatsapp',
   'Follow-up (WhatsApp)', 'whatsapp', 'followup', 'followup', 'generic', NULL,
   'Hi {{CustomerName}}, following up on {{Subject}}. Please let us know your feedback. — Stone Tech',
   '["CustomerName","Subject"]'::jsonb)

ON CONFLICT (code) DO UPDATE
  SET body = EXCLUDED.body,
      subject = EXCLUDED.subject,
      entity_type = EXCLUDED.entity_type,
      template_kind = EXCLUDED.template_kind,
      variables = EXCLUDED.variables;
