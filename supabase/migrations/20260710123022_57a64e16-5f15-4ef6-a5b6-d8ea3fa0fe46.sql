
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_charges numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total numeric(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  description text NOT NULL,
  category text,
  stone_type text,
  finish text,
  size text,
  unit text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct numeric(6,2) NOT NULL DEFAULT 0,
  tax_pct numeric(6,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  fulfilment text,
  sort_order integer NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO authenticated;
GRANT ALL ON public.sales_order_items TO service_role;

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can manage sales_order_items" ON public.sales_order_items;
CREATE POLICY "staff can manage sales_order_items" ON public.sales_order_items
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "demo_mode_isolation" ON public.sales_order_items;
CREATE POLICY "demo_mode_isolation" ON public.sales_order_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_demo = public.current_demo_mode())
  WITH CHECK (is_demo = public.current_demo_mode());

CREATE INDEX IF NOT EXISTS idx_soi_sales_order_id ON public.sales_order_items(sales_order_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_soi_is_demo ON public.sales_order_items(is_demo);

CREATE OR REPLACE FUNCTION public.trg_sales_order_item_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_gross numeric(14,2); v_net numeric(14,2);
BEGIN
  v_gross := ROUND(COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0), 2);
  v_net   := ROUND(v_gross * (1 - COALESCE(NEW.discount_pct,0)/100), 2);
  NEW.tax_amount := ROUND(v_net * COALESCE(NEW.tax_pct,0)/100, 2);
  NEW.line_total := ROUND(v_net + NEW.tax_amount, 2);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_soi_touch ON public.sales_order_items;
CREATE TRIGGER trg_soi_touch BEFORE INSERT OR UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_order_item_touch();

DROP TRIGGER IF EXISTS trg_soi_set_demo ON public.sales_order_items;
CREATE TRIGGER trg_soi_set_demo BEFORE INSERT ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();

CREATE OR REPLACE FUNCTION public.recalc_sales_order_totals(_so_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_sub numeric(14,2); v_tax numeric(14,2); v_disc numeric(14,2);
BEGIN
  SELECT
    COALESCE(SUM(ROUND(quantity*unit_price,2)),0),
    COALESCE(SUM(ROUND(quantity*unit_price*discount_pct/100,2)),0),
    COALESCE(SUM(tax_amount),0)
  INTO v_sub, v_disc, v_tax
  FROM public.sales_order_items WHERE sales_order_id = _so_id;

  UPDATE public.sales_orders so SET
    subtotal   = v_sub,
    discount   = v_disc,
    tax_amount = v_tax,
    total      = ROUND(v_sub - v_disc + v_tax + COALESCE(so.freight,0) + COALESCE(so.other_charges,0) + COALESCE(so.round_off,0), 2),
    updated_at = now()
  WHERE id = _so_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_sales_order_item_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_sales_order_totals(COALESCE(NEW.sales_order_id, OLD.sales_order_id));
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_soi_recalc ON public.sales_order_items;
CREATE TRIGGER trg_soi_recalc AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_order_item_recalc();

CREATE OR REPLACE FUNCTION public.trg_sales_order_header_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.freight IS DISTINCT FROM OLD.freight
     OR NEW.other_charges IS DISTINCT FROM OLD.other_charges
     OR NEW.round_off IS DISTINCT FROM OLD.round_off THEN
    PERFORM public.recalc_sales_order_totals(NEW.id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_so_header_recalc ON public.sales_orders;
CREATE TRIGGER trg_so_header_recalc AFTER UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_order_header_recalc();

CREATE OR REPLACE FUNCTION public.convert_quote_to_sales_order(p_quote_id uuid)
RETURNS public.sales_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote public.quotes;
  v_so    public.sales_orders;
BEGIN
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote % not found', p_quote_id USING ERRCODE='P0002'; END IF;

  SELECT * INTO v_so FROM public.sales_orders
    WHERE quote_id = p_quote_id
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_so; END IF;

  INSERT INTO public.sales_orders(
    so_no, quote_id, project_id, customer_id, status, order_date, delivery_date, notes
  ) VALUES (
    '', v_quote.id, v_quote.project_id, v_quote.customer_id, 'draft',
    CURRENT_DATE, v_quote.valid_until, v_quote.notes
  ) RETURNING * INTO v_so;

  INSERT INTO public.sales_order_items(
    sales_order_id, product_id, product_name, description, category, stone_type, finish,
    unit, quantity, unit_price, discount_pct, tax_pct, fulfilment, sort_order
  )
  SELECT
    v_so.id, qi.product_id, p.name, qi.description, pc.name,
    COALESCE(st.name, p.stone_type::text), p.finish::text,
    qi.unit, qi.quantity, qi.unit_price, 0, qi.tax_pct, qi.fulfilment, qi.sort_order
  FROM public.quote_items qi
  LEFT JOIN public.products p ON p.id = qi.product_id
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.stone_types st ON st.id = p.stone_type_id
  WHERE qi.quote_id = v_quote.id
  ORDER BY qi.sort_order;

  SELECT * INTO v_so FROM public.sales_orders WHERE id = v_so.id;
  RETURN v_so;
END $$;

REVOKE ALL ON FUNCTION public.convert_quote_to_sales_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_sales_order(uuid) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT so.id, so.quote_id
    FROM public.sales_orders so
    WHERE so.quote_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.sales_order_id = so.id)
  LOOP
    INSERT INTO public.sales_order_items(
      sales_order_id, product_id, product_name, description, category, stone_type, finish,
      unit, quantity, unit_price, discount_pct, tax_pct, fulfilment, sort_order
    )
    SELECT r.id, qi.product_id, p.name, qi.description, pc.name,
           COALESCE(st.name, p.stone_type::text), p.finish::text,
           qi.unit, qi.quantity, qi.unit_price, 0, qi.tax_pct, qi.fulfilment, qi.sort_order
    FROM public.quote_items qi
    LEFT JOIN public.products p ON p.id = qi.product_id
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    LEFT JOIN public.stone_types st ON st.id = p.stone_type_id
    WHERE qi.quote_id = r.quote_id
    ORDER BY qi.sort_order;
  END LOOP;
END $$;
