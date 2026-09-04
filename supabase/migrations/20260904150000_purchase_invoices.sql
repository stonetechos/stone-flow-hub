-- Purchase Invoices — vendor billing documents, linked to a vendor and
-- optionally a Purchase Order. Task #38 of the Purchase module build; see
-- engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md §3.
--
-- Header-only for v1 (no line items) — a single total amount per invoice,
-- matching the scoped request ("record vendor invoices against a Purchase
-- Order"). Attachments (image or file) reuse the existing polymorphic
-- file_objects/attachments system (entity_type = 'purchase_invoice'), so
-- no new storage bucket or table is needed for that part.
--
-- Deliberately NOT wired into vendor_ledger_entries here. GRN receipt
-- already posts a credit (increases the payable) to the vendor ledger for
-- goods received — see grn_item_after_ins() in
-- 20260707151013_c5a29341-d5d3-4d4b-bf7a-8ce74c1a6945.sql. Having a
-- Purchase Invoice for the same goods also post a credit would double-count
-- that liability. Whether GRN-based or Invoice-based recognition should
-- drive the ledger (or how to reconcile the two when both exist for one
-- delivery) is a real accounting-policy decision — left for Rishi to make,
-- not guessed here. The Purchase Ledger page still works today (it reads
-- vendor_ledger, unaffected); this table just isn't a ledger source yet.

INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES
  ('PINV', 0, 6)
ON CONFLICT (prefix) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE public.purchase_invoice_status AS ENUM ('draft','recorded','disputed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.assign_purchase_invoice_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.invoice_no IS NULL OR NEW.invoice_no='' THEN NEW.invoice_no := public.next_code('PINV'); END IF; RETURN NEW; END; $$;

CREATE TABLE public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  vendor_invoice_no TEXT,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status public.purchase_invoice_status NOT NULL DEFAULT 'recorded',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  company_id UUID,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX purchase_invoices_vendor_idx ON public.purchase_invoices(vendor_id);
CREATE INDEX purchase_invoices_po_idx ON public.purchase_invoices(purchase_order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT ALL ON public.purchase_invoices TO service_role;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage purchase invoices" ON public.purchase_invoices FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TRIGGER trg_pinv_code BEFORE INSERT ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.assign_purchase_invoice_code();
CREATE TRIGGER trg_pinv_updated BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
