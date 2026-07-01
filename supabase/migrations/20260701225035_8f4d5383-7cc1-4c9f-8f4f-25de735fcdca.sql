
-- Enums
CREATE TYPE public.quote_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','partially_paid','paid','cancelled','overdue');
CREATE TYPE public.payment_method AS ENUM ('razorpay','bank_transfer','upi_manual','cheque','cash','other');
CREATE TYPE public.payment_link_status AS ENUM ('created','sent','partially_paid','paid','cancelled','expired');

-- Extend activity_action enum
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'quote_sent';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'quote_accepted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'invoice_issued';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'payment_received';

-- Seed sequence prefixes
INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES
  ('QUO', 0, 6), ('INV', 0, 6), ('PAY', 0, 6), ('PLN', 0, 6)
ON CONFLICT (prefix) DO NOTHING;

-- Helper: has_staff_access (any of the 4 staff roles)
CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','sales_manager','sales','purchase']::public.app_role[]);
$$;

-- ========= QUOTES =========
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no text UNIQUE NOT NULL,
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.quote_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'INR',
  company_id uuid,
  notes text,
  terms text,
  external_ref text,
  workflow_state jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage quote_items" ON public.quote_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========= INVOICES =========
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  balance_due numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'INR',
  company_id uuid,
  notes text,
  terms text,
  external_ref text,
  workflow_state jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage invoice_items" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========= PAYMENT LINKS =========
CREATE TABLE public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_no text UNIQUE NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_link_id text,
  short_url text,
  amount numeric(14,2) NOT NULL,
  currency_code text NOT NULL DEFAULT 'INR',
  status public.payment_link_status NOT NULL DEFAULT 'created',
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payment_links (invoice_id);
CREATE INDEX ON public.payment_links (provider_link_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage payment_links" ON public.payment_links FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========= PAYMENTS =========
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no text UNIQUE NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL DEFAULT 'INR',
  method public.payment_method NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  razorpay_payment_id text,
  razorpay_link_id text,
  reference_no text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (razorpay_payment_id)
);
CREATE INDEX ON public.payments (invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========= CODE ASSIGN TRIGGERS =========
CREATE OR REPLACE FUNCTION public.assign_quote_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.quote_no IS NULL OR NEW.quote_no='' THEN NEW.quote_no := public.next_code('QUO'); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_quotes_code BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.assign_quote_code();

CREATE OR REPLACE FUNCTION public.assign_invoice_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.invoice_no IS NULL OR NEW.invoice_no='' THEN NEW.invoice_no := public.next_code('INV'); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_invoices_code BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_code();

CREATE OR REPLACE FUNCTION public.assign_payment_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.payment_no IS NULL OR NEW.payment_no='' THEN NEW.payment_no := public.next_code('PAY'); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_payments_code BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.assign_payment_code();

CREATE OR REPLACE FUNCTION public.assign_payment_link_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.link_no IS NULL OR NEW.link_no='' THEN NEW.link_no := public.next_code('PLN'); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_payment_links_code BEFORE INSERT ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.assign_payment_link_code();

-- ========= UPDATED_AT TRIGGERS =========
CREATE TRIGGER trg_quotes_touched BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_touched BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payments_touched BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payment_links_touched BEFORE UPDATE ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========= LINE ITEM RECALC =========
CREATE OR REPLACE FUNCTION public.recalc_quote_totals(_quote_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_sub numeric(14,2); v_tax numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(quantity*unit_price),0),
         COALESCE(SUM(quantity*unit_price*tax_pct/100),0)
    INTO v_sub, v_tax FROM public.quote_items WHERE quote_id = _quote_id;
  UPDATE public.quotes SET subtotal=v_sub, tax_amount=v_tax, total=v_sub+v_tax WHERE id=_quote_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_quote_item_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.line_total := ROUND(NEW.quantity * NEW.unit_price * (1 + NEW.tax_pct/100), 2);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_quote_items_line BEFORE INSERT OR UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.trg_quote_item_touch();

CREATE OR REPLACE FUNCTION public.trg_quote_item_recalc() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  PERFORM public.recalc_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_quote_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.trg_quote_item_recalc();

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals(_invoice_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_sub numeric(14,2); v_tax numeric(14,2); v_paid numeric(14,2); v_total numeric(14,2); v_status public.invoice_status; v_cur public.invoice_status;
BEGIN
  SELECT COALESCE(SUM(quantity*unit_price),0),
         COALESCE(SUM(quantity*unit_price*tax_pct/100),0)
    INTO v_sub, v_tax FROM public.invoice_items WHERE invoice_id = _invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = _invoice_id;
  v_total := v_sub + v_tax;

  SELECT status INTO v_cur FROM public.invoices WHERE id = _invoice_id;
  IF v_cur = 'cancelled' THEN
    v_status := 'cancelled';
  ELSIF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partially_paid';
  ELSE
    v_status := v_cur; -- keep draft/sent/overdue
  END IF;

  UPDATE public.invoices
     SET subtotal=v_sub, tax_amount=v_tax, total=v_total,
         amount_paid=v_paid, balance_due=v_total-v_paid, status=v_status
   WHERE id=_invoice_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_invoice_item_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.line_total := ROUND(NEW.quantity * NEW.unit_price * (1 + NEW.tax_pct/100), 2);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_invoice_items_line BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_item_touch();

CREATE OR REPLACE FUNCTION public.trg_invoice_item_recalc() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  PERFORM public.recalc_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_invoice_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_item_recalc();

CREATE OR REPLACE FUNCTION public.trg_payment_recalc() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  PERFORM public.recalc_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trg_payment_recalc();

-- ========= RPC: convert quote to invoice =========
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid, p_due_date date DEFAULT NULL)
RETURNS public.invoices LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_q public.quotes; v_inv public.invoices;
BEGIN
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  INSERT INTO public.invoices (invoice_no, quote_id, project_id, customer_id, status, issue_date, due_date, currency_code, company_id, notes, terms, created_by)
  VALUES ('', v_q.id, v_q.project_id, v_q.customer_id, 'draft', CURRENT_DATE, COALESCE(p_due_date, CURRENT_DATE + INTERVAL '15 days'), v_q.currency_code, v_q.company_id, v_q.notes, v_q.terms, auth.uid())
  RETURNING * INTO v_inv;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, tax_pct, sort_order)
  SELECT v_inv.id, product_id, description, quantity, unit, unit_price, tax_pct, sort_order
    FROM public.quote_items WHERE quote_id = v_q.id;

  UPDATE public.quotes SET status='converted' WHERE id = v_q.id;
  RETURN v_inv;
END; $$;
