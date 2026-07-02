
INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES
  ('SO', 0, 6), ('PO', 0, 6), ('STK', 0, 6), ('DSP', 0, 6)
ON CONFLICT (prefix) DO NOTHING;

DO $$ BEGIN CREATE TYPE public.sales_order_status AS ENUM ('draft','confirmed','in_production','ready','shipped','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.purchase_order_status AS ENUM ('draft','sent','acknowledged','partially_received','received','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dispatch_status AS ENUM ('planned','in_transit','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Code assign functions FIRST
CREATE OR REPLACE FUNCTION public.assign_so_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.so_no IS NULL OR NEW.so_no='' THEN NEW.so_no := public.next_code('SO'); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.assign_po_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.po_no IS NULL OR NEW.po_no='' THEN NEW.po_no := public.next_code('PO'); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.assign_stock_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.stock_code IS NULL OR NEW.stock_code='' THEN NEW.stock_code := public.next_code('STK'); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.assign_dispatch_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.dispatch_no IS NULL OR NEW.dispatch_no='' THEN NEW.dispatch_no := public.next_code('DSP'); END IF; RETURN NEW; END; $$;

-- Sales Orders
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_no TEXT NOT NULL UNIQUE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.sales_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  currency_code TEXT,
  company_id UUID,
  external_ref TEXT,
  workflow_state TEXT,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sales orders" ON public.sales_orders FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_so_code BEFORE INSERT ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.assign_so_code();
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT NOT NULL UNIQUE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  rfq_id UUID REFERENCES public.rfqs(id) ON DELETE SET NULL,
  status public.purchase_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  currency_code TEXT,
  company_id UUID,
  external_ref TEXT,
  workflow_state TEXT,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_po_code BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.assign_po_code();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inventory
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  location TEXT,
  quantity_on_hand NUMERIC(14,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage inventory" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_stk_code BEFORE INSERT ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.assign_stock_code();
CREATE TRIGGER trg_stk_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dispatches
CREATE TABLE public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_no TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  status public.dispatch_status NOT NULL DEFAULT 'planned',
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  carrier TEXT,
  tracking_no TEXT,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage dispatches" ON public.dispatches FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_dsp_code BEFORE INSERT ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.assign_dispatch_code();
CREATE TRIGGER trg_dsp_updated BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
