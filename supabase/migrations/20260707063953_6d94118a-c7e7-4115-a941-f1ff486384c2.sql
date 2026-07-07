
-- 1. Extend payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'neft';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'rtgs';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'imps';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'gateway';

-- 2. Sequences
INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES
  ('RCT', 0, 5), ('CN', 0, 5), ('DN', 0, 5), ('REF', 0, 5), ('MSG', 0, 6)
ON CONFLICT (prefix) DO NOTHING;

-- 3. RECEIPTS
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL DEFAULT 'INR',
  method public.payment_method NOT NULL,
  bank_name text,
  account_used text,
  reference_no text,          -- UTR / transaction id
  cheque_no text,
  cheque_date date,
  tds_amount numeric(14,2) NOT NULL DEFAULT 0,
  bank_charges numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) GENERATED ALWAYS AS (amount - tds_amount - bank_charges) STORED,
  allocated_amount numeric(14,2) NOT NULL DEFAULT 0,
  unallocated_amount numeric(14,2) GENERATED ALWAYS AS (amount - tds_amount - bank_charges - allocated_amount) STORED,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  received_by uuid REFERENCES auth.users(id),
  remarks text,
  attachment_file_id uuid REFERENCES public.file_objects(id),
  provider text,               -- razorpay/cashfree/stripe/paypal/manual
  provider_ref text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX receipts_no_uq ON public.receipts(receipt_no) WHERE receipt_no <> '';
CREATE INDEX receipts_customer_idx ON public.receipts(customer_id, received_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read receipts" ON public.receipts FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "staff write receipts" ON public.receipts FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_receipt_code()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no='' THEN
    NEW.receipt_no := public.next_code('RCT');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_receipt_code BEFORE INSERT ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_code();
CREATE TRIGGER trg_receipt_updated BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. RECEIPT ALLOCATIONS
CREATE TABLE public.receipt_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(receipt_id, invoice_id)
);
CREATE INDEX rcpt_alloc_inv_idx ON public.receipt_allocations(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_allocations TO authenticated;
GRANT ALL ON public.receipt_allocations TO service_role;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage rcpt allocations" ON public.receipt_allocations FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- trigger to sync receipt.allocated_amount and invoice totals
CREATE OR REPLACE FUNCTION public.trg_receipt_alloc_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_receipt uuid; v_invoice uuid;
BEGIN
  v_receipt := COALESCE(NEW.receipt_id, OLD.receipt_id);
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.receipts SET allocated_amount = COALESCE(
    (SELECT SUM(amount) FROM public.receipt_allocations WHERE receipt_id = v_receipt), 0)
   WHERE id = v_receipt;
  -- recalc invoice from receipt allocations + legacy payments
  PERFORM public.recalc_invoice_with_receipts(v_invoice);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.recalc_invoice_with_receipts(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_sub numeric(14,2); v_tax numeric(14,2); v_paid numeric(14,2); v_total numeric(14,2); v_cur public.invoice_status; v_status public.invoice_status;
BEGIN
  SELECT COALESCE(SUM(quantity*unit_price),0),
         COALESCE(SUM(quantity*unit_price*tax_pct/100),0)
    INTO v_sub, v_tax FROM public.invoice_items WHERE invoice_id=_invoice_id;
  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id=_invoice_id),0)
  + COALESCE((SELECT SUM(ra.amount) FROM public.receipt_allocations ra
              JOIN public.receipts r ON r.id=ra.receipt_id
              WHERE ra.invoice_id=_invoice_id AND r.status='active'),0)
  INTO v_paid;
  v_total := v_sub + v_tax;
  SELECT status INTO v_cur FROM public.invoices WHERE id=_invoice_id;
  IF v_cur = 'cancelled' THEN v_status := 'cancelled';
  ELSIF v_paid >= v_total AND v_total > 0 THEN v_status := 'paid';
  ELSIF v_paid > 0 THEN v_status := 'partially_paid';
  ELSE v_status := v_cur;
  END IF;
  UPDATE public.invoices SET subtotal=v_sub, tax_amount=v_tax, total=v_total,
    amount_paid=v_paid, balance_due=v_total-v_paid, status=v_status WHERE id=_invoice_id;
END $$;

CREATE TRIGGER trg_receipt_alloc_sync
AFTER INSERT OR UPDATE OR DELETE ON public.receipt_allocations
FOR EACH ROW EXECUTE FUNCTION public.trg_receipt_alloc_sync();

-- 5. CREDIT NOTES
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cn_no text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reason text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  remarks text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX cn_no_uq ON public.credit_notes(cn_no) WHERE cn_no <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage credit_notes" ON public.credit_notes FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE OR REPLACE FUNCTION public.assign_cn_code()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.cn_no IS NULL OR NEW.cn_no='' THEN NEW.cn_no := public.next_code('CN'); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_cn_code BEFORE INSERT ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.assign_cn_code();
CREATE TRIGGER trg_cn_updated BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. DEBIT NOTES
CREATE TABLE public.debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dn_no text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reason text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  remarks text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX dn_no_uq ON public.debit_notes(dn_no) WHERE dn_no <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_notes TO authenticated;
GRANT ALL ON public.debit_notes TO service_role;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage debit_notes" ON public.debit_notes FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE OR REPLACE FUNCTION public.assign_dn_code()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.dn_no IS NULL OR NEW.dn_no='' THEN NEW.dn_no := public.next_code('DN'); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_dn_code BEFORE INSERT ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.assign_dn_code();
CREATE TRIGGER trg_dn_updated BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. REFUNDS
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_no text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  receipt_id uuid REFERENCES public.receipts(id) ON DELETE SET NULL,
  credit_note_id uuid REFERENCES public.credit_notes(id) ON DELETE SET NULL,
  refunded_at date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL,
  reference_no text,
  bank_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  remarks text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX refund_no_uq ON public.refunds(refund_no) WHERE refund_no <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage refunds" ON public.refunds FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE OR REPLACE FUNCTION public.assign_refund_code()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.refund_no IS NULL OR NEW.refund_no='' THEN NEW.refund_no := public.next_code('REF'); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_refund_code BEFORE INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.assign_refund_code();
CREATE TRIGGER trg_refund_updated BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. CUSTOMER LEDGER VIEW
CREATE OR REPLACE VIEW public.customer_ledger AS
  SELECT i.customer_id, i.issue_date AS entry_date, 'invoice'::text AS entry_type,
         i.id AS ref_id, i.invoice_no AS ref_no, i.total AS debit, 0::numeric AS credit, i.status::text AS status
    FROM public.invoices i WHERE i.status <> 'cancelled'
  UNION ALL
  SELECT r.customer_id, r.received_at, 'receipt', r.id, r.receipt_no, 0, r.net_amount, r.status
    FROM public.receipts r WHERE r.status='active'
  UNION ALL
  SELECT c.customer_id, c.issued_at, 'credit_note', c.id, c.cn_no, 0, c.amount, c.status
    FROM public.credit_notes c WHERE c.status='active'
  UNION ALL
  SELECT d.customer_id, d.issued_at, 'debit_note', d.id, d.dn_no, d.amount, 0, d.status
    FROM public.debit_notes d WHERE d.status='active'
  UNION ALL
  SELECT rf.customer_id, rf.refunded_at, 'refund', rf.id, rf.refund_no, rf.amount, 0, rf.status
    FROM public.refunds rf WHERE rf.status='active';

GRANT SELECT ON public.customer_ledger TO authenticated;

-- 9. NOTIFICATION FRAMEWORK
-- message_templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  category text NOT NULL DEFAULT 'general',
  subject text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read templates" ON public.message_templates FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "admin manage templates" ON public.message_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_msg_tpl_updated BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- message_queue
CREATE TABLE public.message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_no text NOT NULL DEFAULT '',
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  provider text,
  template_code text,
  to_address text NOT NULL,
  cc_address text,
  bcc_address text,
  subject text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_type text,
  related_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX msg_q_status_idx ON public.message_queue(status, next_retry_at);
CREATE INDEX msg_q_related_idx ON public.message_queue(related_type, related_id);
CREATE UNIQUE INDEX msg_q_no_uq ON public.message_queue(message_no) WHERE message_no <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_queue TO authenticated;
GRANT ALL ON public.message_queue TO service_role;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage message_queue" ON public.message_queue FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE OR REPLACE FUNCTION public.assign_message_code()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.message_no IS NULL OR NEW.message_no='' THEN NEW.message_no := public.next_code('MSG'); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_msg_code BEFORE INSERT ON public.message_queue FOR EACH ROW EXECUTE FUNCTION public.assign_message_code();
CREATE TRIGGER trg_msg_updated BEFORE UPDATE ON public.message_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- message_delivery_events
CREATE TABLE public.message_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.message_queue(id) ON DELETE CASCADE,
  event text NOT NULL,           -- queued/sent/delivered/read/bounced/complained/failed
  provider text,
  provider_ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX msg_evt_msg_idx ON public.message_delivery_events(message_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.message_delivery_events TO authenticated;
GRANT ALL ON public.message_delivery_events TO service_role;
ALTER TABLE public.message_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read delivery events" ON public.message_delivery_events FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "staff insert delivery events" ON public.message_delivery_events FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

-- 10. APP SETTINGS singleton key/value
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read app_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "admin manage app_settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- seed default provider config keys (empty — filled from UI)
INSERT INTO public.app_settings (key, value, description) VALUES
  ('notifications.email',     '{"provider":"resend","from_name":"","from_email":""}', 'Default email provider config (Resend/SMTP/SendGrid/SES)'),
  ('notifications.whatsapp',  '{"provider":"meta_cloud","phone_number_id":"","business_account_id":"","verify_token":""}', 'WhatsApp Cloud API config'),
  ('notifications.sms',       '{"provider":""}', 'SMS provider config'),
  ('payments.gateways',       '{"razorpay":{"enabled":false},"cashfree":{"enabled":false},"stripe":{"enabled":false},"paypal":{"enabled":false}}', 'Payment gateway configuration')
ON CONFLICT (key) DO NOTHING;

-- seed a couple of message templates
INSERT INTO public.message_templates (code, name, channel, category, subject, body, variables) VALUES
  ('estimate.email.v1','Estimate — Email','email','estimate',
   'Estimate {{estimate_no}} from {{company_name}}',
   'Dear {{customer_name}},\n\nPlease find your estimate {{estimate_no}} attached.\nTotal: {{total}}\n\nRegards,\n{{company_name}}',
   '["estimate_no","customer_name","total","company_name"]'::jsonb),
  ('estimate.whatsapp.v1','Estimate — WhatsApp','whatsapp','estimate', NULL,
   'Hi {{customer_name}}, your estimate {{estimate_no}} for {{total}} is ready. — {{company_name}}',
   '["estimate_no","customer_name","total","company_name"]'::jsonb),
  ('receipt.email.v1','Receipt — Email','email','receipt',
   'Receipt {{receipt_no}} — {{amount}}',
   'Dear {{customer_name}},\n\nWe have received {{amount}} against {{receipt_no}} on {{received_at}}.\n\nRegards,\n{{company_name}}',
   '["receipt_no","customer_name","amount","received_at","company_name"]'::jsonb),
  ('receipt.whatsapp.v1','Receipt — WhatsApp','whatsapp','receipt', NULL,
   'Hi {{customer_name}}, we have received {{amount}} against {{receipt_no}}. Thank you! — {{company_name}}',
   '["receipt_no","customer_name","amount","company_name"]'::jsonb)
ON CONFLICT (code) DO NOTHING;
