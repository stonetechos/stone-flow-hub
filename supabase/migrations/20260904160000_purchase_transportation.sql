-- Purchase Transportation — inbound-from-vendor shipment/logistics tracking.
-- Task #40 of the Purchase module build; see
-- engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md §3.
--
-- This is the purchase-side mirror of Dispatch (public.dispatches /
-- dispatch_items), which already tracks outbound-to-customer delivery
-- (carting agency/driver, carting charge, line items). Keyed to Purchase
-- Order instead of Sales Order, per the plan doc's explicit instruction not
-- to just relabel/reuse the Dispatch page.
--
-- Scope note on "partial quantity" / "pending-delivery balance": GRN
-- (public.grns / grn_items) already tracks vehicle/driver/challan fields
-- and quantity_received/accepted/rejected at receipt — but Purchase Orders
-- have NO line-item table of their own (purchase_orders links to a single
-- vendor_quote_id; items come from vendor_quote_items via that
-- relationship — see listOpenPurchaseProductIds() in
-- src/lib/purchase-orders/api.ts). There is therefore no clean
-- "ordered quantity per PO line" to compute a remaining-to-transport
-- balance against, the way Dispatch computes remaining-to-deliver from
-- sales_order_items. purchase_transportation_items below is a shipment
-- manifest (what travelled on this trip), not a fulfillment tracker —
-- "partial" here means multiple transportation entries can be logged
-- against the same PO over time, not that the system computes a
-- remaining-quantity figure. The one balance this schema CAN honestly
-- compute is financial: freight_amount vs amount_paid to the carting
-- agency (balance_due, a generated column — no ledger trigger needed).
--
-- Carting Agencies is added as a new master (src/lib/masters/config.ts),
-- reusing the existing MasterListPage — same pattern as every other
-- reference-data list in this app.

-- ---------------------------------------------------------------------
-- Carting Agencies (master data)
-- ---------------------------------------------------------------------
CREATE TABLE public.carting_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  vehicle_type TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carting_agencies TO authenticated;
GRANT ALL ON public.carting_agencies TO service_role;
ALTER TABLE public.carting_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read carting_agencies" ON public.carting_agencies FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write carting_agencies" ON public.carting_agencies FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER carting_agencies_touch BEFORE UPDATE ON public.carting_agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Purchase Transportation (header)
-- ---------------------------------------------------------------------
INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES
  ('PTR', 0, 6)
ON CONFLICT (prefix) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE public.purchase_transport_status AS ENUM ('planned','in_transit','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.assign_purchase_transport_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.transport_no IS NULL OR NEW.transport_no='' THEN NEW.transport_no := public.next_code('PTR'); END IF; RETURN NEW; END; $$;

CREATE TABLE public.purchase_transportation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_no TEXT NOT NULL UNIQUE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  carting_agency_id UUID REFERENCES public.carting_agencies(id) ON DELETE SET NULL,
  status public.purchase_transport_status NOT NULL DEFAULT 'planned',
  transport_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_no TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  lr_no TEXT,
  delivered_by TEXT,
  received_by TEXT,
  freight_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) GENERATED ALWAYS AS (freight_amount - amount_paid) STORED,
  remarks TEXT,
  notes TEXT,
  company_id UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX purchase_transport_po_idx ON public.purchase_transportation(purchase_order_id);
CREATE INDEX purchase_transport_vendor_idx ON public.purchase_transportation(vendor_id);
CREATE INDEX purchase_transport_project_idx ON public.purchase_transportation(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_transportation TO authenticated;
GRANT ALL ON public.purchase_transportation TO service_role;
ALTER TABLE public.purchase_transportation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage purchase transportation" ON public.purchase_transportation FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TRIGGER trg_ptr_code BEFORE INSERT ON public.purchase_transportation FOR EACH ROW EXECUTE FUNCTION public.assign_purchase_transport_code();
CREATE TRIGGER trg_ptr_updated BEFORE UPDATE ON public.purchase_transportation FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Purchase Transportation line items (shipment manifest, see note above)
-- ---------------------------------------------------------------------
CREATE TABLE public.purchase_transportation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_transportation_id UUID NOT NULL REFERENCES public.purchase_transportation(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX purchase_transport_items_ptr_idx ON public.purchase_transportation_items(purchase_transportation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_transportation_items TO authenticated;
GRANT ALL ON public.purchase_transportation_items TO service_role;
ALTER TABLE public.purchase_transportation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage purchase transportation items" ON public.purchase_transportation_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

NOTIFY pgrst, 'reload schema';
