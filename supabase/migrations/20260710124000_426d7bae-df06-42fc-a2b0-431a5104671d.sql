
-- 1. Extend dispatches with delivery challan fields
ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_address text,
  ADD COLUMN IF NOT EXISTS vehicle_no text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS lr_no text,
  ADD COLUMN IF NOT EXISTS delivered_by text,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS carting_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks text;

CREATE INDEX IF NOT EXISTS idx_dispatches_customer_id ON public.dispatches(customer_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_project_id ON public.dispatches(project_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_sales_order_id ON public.dispatches(sales_order_id);

-- 2. Sales order default carting
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS default_carting_charge numeric NOT NULL DEFAULT 0;

-- 3. Auto-populate customer_id / project_id from sales_order
CREATE OR REPLACE FUNCTION public.trg_dispatch_fill_from_so()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sales_order_id IS NOT NULL THEN
    IF NEW.customer_id IS NULL OR NEW.project_id IS NULL OR NEW.carting_charge = 0 THEN
      SELECT
        COALESCE(NEW.customer_id, so.customer_id),
        COALESCE(NEW.project_id, so.project_id),
        CASE WHEN NEW.carting_charge = 0 THEN COALESCE(so.default_carting_charge, 0) ELSE NEW.carting_charge END
      INTO NEW.customer_id, NEW.project_id, NEW.carting_charge
      FROM public.sales_orders so
      WHERE so.id = NEW.sales_order_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_fill_from_so ON public.dispatches;
CREATE TRIGGER trg_dispatch_fill_from_so
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_fill_from_so();

-- Backfill existing rows
UPDATE public.dispatches d
SET customer_id = COALESCE(d.customer_id, so.customer_id),
    project_id  = COALESCE(d.project_id,  so.project_id)
FROM public.sales_orders so
WHERE d.sales_order_id = so.id
  AND (d.customer_id IS NULL OR d.project_id IS NULL);

-- 4. Delivery challan line items
CREATE TABLE IF NOT EXISTS public.dispatch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  sales_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  description text NOT NULL,
  unit text,
  quantity numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_items TO authenticated;
GRANT ALL ON public.dispatch_items TO service_role;

ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage dispatch items"
  ON public.dispatch_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch_id ON public.dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_so_item_id ON public.dispatch_items(sales_order_item_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_items_touch ON public.dispatch_items;
CREATE TRIGGER trg_dispatch_items_touch
  BEFORE UPDATE ON public.dispatch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
