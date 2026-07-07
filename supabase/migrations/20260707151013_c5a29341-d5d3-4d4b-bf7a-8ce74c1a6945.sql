-- Slice 4 — Procurement Execution
CREATE TABLE IF NOT EXISTS public.grns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_no text NOT NULL UNIQUE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  vehicle_no text, driver_name text, driver_phone text, delivery_challan_no text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','partial','closed','cancelled')),
  overall_acceptance text NOT NULL DEFAULT 'pending' CHECK (overall_acceptance IN ('pending','accepted','rejected','accepted_with_remarks')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS grn_vendor_idx ON public.grns(vendor_id, received_date);
CREATE INDEX IF NOT EXISTS grn_po_idx ON public.grns(purchase_order_id);
CREATE INDEX IF NOT EXISTS grn_project_idx ON public.grns(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grns TO authenticated;
GRANT ALL ON public.grns TO service_role;
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_staff ON public.grns;
CREATE POLICY grn_staff ON public.grns FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_grn_no() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grn_no IS NULL OR NEW.grn_no = '' THEN
    NEW.grn_no := 'GRN-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*99999))::text,5,'0');
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_grn_no ON public.grns;
CREATE TRIGGER trg_grn_no BEFORE INSERT ON public.grns FOR EACH ROW EXECUTE FUNCTION public.assign_grn_no();
DROP TRIGGER IF EXISTS trg_grn_updated ON public.grns;
CREATE TRIGGER trg_grn_updated BEFORE UPDATE ON public.grns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL REFERENCES public.grns(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  quantity_ordered numeric(14,3),
  quantity_received numeric(14,3) NOT NULL DEFAULT 0,
  quantity_accepted numeric(14,3) NOT NULL DEFAULT 0,
  quantity_rejected numeric(14,3) NOT NULL DEFAULT 0,
  unit text, unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  batch_no text, lot_no text, slab_no text, bundle_no text, crate_no text,
  location text,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS grn_items_product_idx ON public.grn_items(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grn_items TO authenticated;
GRANT ALL ON public.grn_items TO service_role;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_items_staff ON public.grn_items;
CREATE POLICY grn_items_staff ON public.grn_items FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.grn_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_item_id uuid NOT NULL UNIQUE REFERENCES public.grn_items(id) ON DELETE CASCADE,
  thickness_ok boolean, size_ok boolean, surface_finish_ok boolean, edge_finish_ok boolean, shade_ok boolean,
  breakage_count int DEFAULT 0, cracks_count int DEFAULT 0, chips_count int DEFAULT 0,
  moisture_pct numeric(5,2), packaging_condition text,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','accepted','rejected','accepted_with_remarks')),
  remarks text,
  inspector_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  inspected_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grn_inspections TO authenticated;
GRANT ALL ON public.grn_inspections TO service_role;
ALTER TABLE public.grn_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_ins_staff ON public.grn_inspections;
CREATE POLICY grn_ins_staff ON public.grn_inspections FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('opening','purchase_receipt','production_consumption','transfer','adjustment','return','dispatch')),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  quantity numeric(14,3) NOT NULL,
  unit text, from_location text, to_location text,
  source_type text, source_id uuid,
  ref_no text, notes text,
  moved_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invmov_item_idx ON public.inventory_movements(inventory_item_id, moved_at);
CREATE INDEX IF NOT EXISTS invmov_product_idx ON public.inventory_movements(product_id, moved_at);
CREATE INDEX IF NOT EXISTS invmov_source_idx ON public.inventory_movements(source_type, source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invmov_staff ON public.inventory_movements;
CREATE POLICY invmov_staff ON public.inventory_movements FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  grn_id uuid REFERENCES public.grns(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('advance','part','full','retention','credit_note','debit_note','refund')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL DEFAULT 'INR',
  method text, reference_no text,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS vpay_vendor_idx ON public.vendor_payments(vendor_id, paid_at);
CREATE INDEX IF NOT EXISTS vpay_po_idx ON public.vendor_payments(purchase_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payments TO authenticated;
GRANT ALL ON public.vendor_payments TO service_role;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vpay_staff ON public.vendor_payments;
CREATE POLICY vpay_staff ON public.vendor_payments FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_vendor_payment_no() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_no IS NULL OR NEW.payment_no = '' THEN
    NEW.payment_no := 'VPAY-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*99999))::text,5,'0');
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vpay_no ON public.vendor_payments;
CREATE TRIGGER trg_vpay_no BEFORE INSERT ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.assign_vendor_payment_no();
DROP TRIGGER IF EXISTS trg_vpay_updated ON public.vendor_payments;
CREATE TRIGGER trg_vpay_updated BEFORE UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.grn_item_after_ins() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vendor uuid; v_ref text; v_date date; v_qty numeric;
BEGIN
  SELECT g.vendor_id, g.grn_no, g.received_date INTO v_vendor, v_ref, v_date FROM public.grns g WHERE g.id = NEW.grn_id;
  v_qty := COALESCE(NEW.quantity_accepted, NEW.quantity_received, 0);
  IF v_qty > 0 THEN
    INSERT INTO public.inventory_movements(inventory_item_id, product_id, movement_type, direction, quantity, unit, to_location, source_type, source_id, ref_no, notes)
    VALUES (NEW.inventory_item_id, NEW.product_id, 'purchase_receipt', 'in', v_qty, NEW.unit, NEW.location, 'grn_item', NEW.id, v_ref, concat_ws(' ', 'GRN', v_ref));
  END IF;
  IF NEW.unit_cost > 0 AND v_qty > 0 AND v_vendor IS NOT NULL THEN
    PERFORM public.vendor_ledger_upsert(v_vendor, v_date, 'grn_item', NEW.id, v_ref, concat_ws(' ', 'Goods received', v_ref), 0, v_qty * NEW.unit_cost, 'INR', 'posted', 'grn', '{}'::jsonb);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_grn_item_after_ins ON public.grn_items;
CREATE TRIGGER trg_grn_item_after_ins AFTER INSERT ON public.grn_items FOR EACH ROW EXECUTE FUNCTION public.grn_item_after_ins();

CREATE OR REPLACE FUNCTION public.vendor_payment_after_ins() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_debit numeric := 0; v_credit numeric := 0; v_desc text;
BEGIN
  IF NEW.payment_type = 'credit_note' THEN v_credit := NEW.amount; v_desc := 'Credit note';
  ELSE v_debit := NEW.amount; v_desc := initcap(replace(NEW.payment_type, '_', ' '));
  END IF;
  PERFORM public.vendor_ledger_upsert(NEW.vendor_id, NEW.paid_at, 'vendor_payment', NEW.id, NEW.payment_no, concat_ws(' ', v_desc, coalesce(NEW.method,''), coalesce(NEW.reference_no,'')), v_debit, v_credit, NEW.currency_code, 'posted', 'payment', '{}'::jsonb);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vpay_after_ins ON public.vendor_payments;
CREATE TRIGGER trg_vpay_after_ins AFTER INSERT ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.vendor_payment_after_ins();

CREATE OR REPLACE FUNCTION public.vendor_payment_after_del() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.vendor_ledger_entries WHERE source_type = 'vendor_payment' AND source_id = OLD.id; RETURN OLD; END; $$;
DROP TRIGGER IF EXISTS trg_vpay_after_del ON public.vendor_payments;
CREATE TRIGGER trg_vpay_after_del AFTER DELETE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.vendor_payment_after_del();

CREATE OR REPLACE FUNCTION public.grn_item_after_del() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.inventory_movements WHERE source_type = 'grn_item' AND source_id = OLD.id;
  DELETE FROM public.vendor_ledger_entries WHERE source_type = 'grn_item' AND source_id = OLD.id;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_grn_item_after_del ON public.grn_items;
CREATE TRIGGER trg_grn_item_after_del AFTER DELETE ON public.grn_items FOR EACH ROW EXECUTE FUNCTION public.grn_item_after_del();

CREATE OR REPLACE VIEW public.inventory_stock_ledger WITH (security_invoker = on) AS
SELECT m.product_id, m.inventory_item_id,
  SUM(CASE WHEN m.direction = 'in' THEN m.quantity ELSE -m.quantity END) AS on_hand,
  MAX(m.moved_at) AS last_moved_at
FROM public.inventory_movements m
GROUP BY m.product_id, m.inventory_item_id;
GRANT SELECT ON public.inventory_stock_ledger TO authenticated;

CREATE OR REPLACE VIEW public.procurement_calendar WITH (security_invoker = on) AS
  SELECT f.id, f.scheduled_at::date AS event_date, 'followup'::text AS event_type,
    coalesce(f.notes, 'Follow-up') AS title,
    f.enquiry_id, f.project_id, NULL::uuid AS vendor_id, NULL::uuid AS purchase_order_id, f.status::text AS status
  FROM public.followups f
UNION ALL
  SELECT po.id, coalesce(po.vendor_delivery_date, po.expected_date)::date, 'vendor_commitment',
    concat('PO ', po.po_no), NULL::uuid, po.project_id, po.vendor_id, po.id, po.status::text
  FROM public.purchase_orders po
  WHERE coalesce(po.vendor_delivery_date, po.expected_date) IS NOT NULL
UNION ALL
  SELECT po.id, po.customer_delivery_date, 'customer_commitment',
    concat('PO ', po.po_no, ' → customer'), NULL::uuid, po.project_id, po.vendor_id, po.id, po.status::text
  FROM public.purchase_orders po
  WHERE po.customer_delivery_date IS NOT NULL
UNION ALL
  SELECT g.id, g.received_date, 'material_arrival', concat('GRN ', g.grn_no),
    NULL::uuid, g.project_id, g.vendor_id, g.purchase_order_id, g.status
  FROM public.grns g
UNION ALL
  SELECT vp.id, vp.paid_at, 'vendor_payment',
    concat(initcap(replace(vp.payment_type,'_',' ')), ' ', vp.payment_no),
    NULL::uuid, vp.project_id, vp.vendor_id, vp.purchase_order_id, vp.payment_type
  FROM public.vendor_payments vp
UNION ALL
  SELECT p.id, p.paid_at::date, 'customer_payment', concat('Receipt ', p.payment_no),
    NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, p.method::text
  FROM public.payments p
UNION ALL
  SELECT d.id, d.dispatch_date, 'dispatch', concat('Dispatch ', d.dispatch_no),
    NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, d.status::text
  FROM public.dispatches d;
GRANT SELECT ON public.procurement_calendar TO authenticated;