
-- 1. Profile flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo_mode boolean NOT NULL DEFAULT false;

-- 2. Current mode helper (SECURITY DEFINER so restrictive policies can read profile)
CREATE OR REPLACE FUNCTION public.current_demo_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_demo_mode FROM public.profiles WHERE id = auth.uid()), false);
$$;
REVOKE EXECUTE ON FUNCTION public.current_demo_mode() FROM anon, PUBLIC;

-- 3. Generic BEFORE INSERT trigger fn: stamp is_demo from current user mode
CREATE OR REPLACE FUNCTION public.set_is_demo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_demo IS DISTINCT FROM true THEN
    NEW.is_demo := public.current_demo_mode();
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_is_demo() FROM anon, authenticated, PUBLIC;

-- 4. Apply to every core business table
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'customers','projects','products','vendors',
  'enquiries','enquiry_items','followups','site_visits','project_notes',
  'rfqs','rfq_items','vendor_requests','vendor_quotes','vendor_quote_items',
  'quotes','quote_items','sales_orders','purchase_orders',
  'production_orders','production_pieces','production_stages','qc_results',
  'inventory_items','dispatches','invoices','invoice_items','payments','payment_links',
  'tasks','activity_log','artwork_approvals','file_objects','favorites','comments'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(is_demo)', t||'_is_demo_idx', t);
    -- Restrictive policy: rows must match caller's mode
    EXECUTE format('DROP POLICY IF EXISTS "demo_mode_isolation" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_mode_isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (is_demo = public.current_demo_mode()) WITH CHECK (is_demo = public.current_demo_mode())$p$, t);
    -- BEFORE INSERT trigger to stamp is_demo
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_set_demo ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_set_demo BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_is_demo()', t, t);
  END LOOP;
END $$;

-- 5. Reset demo data (admin only): wipes is_demo=true rows in FK-safe order
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset demo data' USING ERRCODE = 'P0007';
  END IF;
  -- Children first
  DELETE FROM public.payments               WHERE is_demo;
  DELETE FROM public.payment_links          WHERE is_demo;
  DELETE FROM public.invoice_items          WHERE is_demo;
  DELETE FROM public.invoices               WHERE is_demo;
  DELETE FROM public.dispatches             WHERE is_demo;
  DELETE FROM public.qc_results             WHERE is_demo;
  DELETE FROM public.production_stages      WHERE is_demo;
  DELETE FROM public.production_pieces      WHERE is_demo;
  DELETE FROM public.production_orders      WHERE is_demo;
  DELETE FROM public.purchase_orders        WHERE is_demo;
  DELETE FROM public.sales_orders           WHERE is_demo;
  DELETE FROM public.quote_items            WHERE is_demo;
  DELETE FROM public.quotes                 WHERE is_demo;
  DELETE FROM public.vendor_quote_items     WHERE is_demo;
  DELETE FROM public.vendor_quotes          WHERE is_demo;
  DELETE FROM public.vendor_requests        WHERE is_demo;
  DELETE FROM public.rfq_items              WHERE is_demo;
  DELETE FROM public.rfqs                   WHERE is_demo;
  DELETE FROM public.followups              WHERE is_demo;
  DELETE FROM public.site_visits            WHERE is_demo;
  DELETE FROM public.project_notes          WHERE is_demo;
  DELETE FROM public.enquiry_items          WHERE is_demo;
  DELETE FROM public.enquiries              WHERE is_demo;
  DELETE FROM public.artwork_approvals      WHERE is_demo;
  DELETE FROM public.tasks                  WHERE is_demo;
  DELETE FROM public.comments               WHERE is_demo;
  DELETE FROM public.favorites              WHERE is_demo;
  DELETE FROM public.activity_log           WHERE is_demo;
  DELETE FROM public.file_objects           WHERE is_demo;
  DELETE FROM public.inventory_items        WHERE is_demo;
  DELETE FROM public.projects               WHERE is_demo;
  DELETE FROM public.products               WHERE is_demo;
  DELETE FROM public.vendors                WHERE is_demo;
  DELETE FROM public.customers              WHERE is_demo;
  PERFORM public.seed_demo_data();
END; $$;
REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM anon, PUBLIC;

-- 6. Seed function (invoked by reset + first-time setup). Idempotent.
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  v1 uuid; v2 uuid; v3 uuid;
  pr1 uuid; pr2 uuid; pr3 uuid; pr4 uuid;
  e1 uuid; e2 uuid;
BEGIN
  -- Customers
  INSERT INTO public.customers (company_name, contact_person, email, phone, city, state, country, is_demo)
  VALUES
    ('Prestige Builders','Ravi Kumar','ravi@prestige.demo','+91-9800000001','Bengaluru','Karnataka','India',true),
    ('Shapoorji Pallonji','Anita Mehta','anita@sp.demo','+91-9800000002','Mumbai','Maharashtra','India',true),
    ('Adani Realty','Suresh Shah','suresh@adani.demo','+91-9800000003','Ahmedabad','Gujarat','India',true),
    ('Lodha Group','Priya Nair','priya@lodha.demo','+91-9800000004','Mumbai','Maharashtra','India',true),
    ('Sri Balaji Temple Trust','Ramesh Iyer','trust@balaji.demo','+91-9800000005','Tirupati','AP','India',true)
  RETURNING id INTO c1;
  SELECT id INTO c1 FROM public.customers WHERE company_name='Prestige Builders' AND is_demo LIMIT 1;
  SELECT id INTO c2 FROM public.customers WHERE company_name='Shapoorji Pallonji' AND is_demo LIMIT 1;
  SELECT id INTO c3 FROM public.customers WHERE company_name='Adani Realty' AND is_demo LIMIT 1;
  SELECT id INTO c4 FROM public.customers WHERE company_name='Lodha Group' AND is_demo LIMIT 1;
  SELECT id INTO c5 FROM public.customers WHERE company_name='Sri Balaji Temple Trust' AND is_demo LIMIT 1;

  -- Vendors
  INSERT INTO public.vendors (company_name, contact_person, email, phone, city, state, country, is_active, rating, lead_time_days, is_demo)
  VALUES
    ('Rajasthan Marble Works','Vikram Singh','vikram@rmw.demo','+91-9810000001','Kishangarh','Rajasthan','India',true,4.6,14,true),
    ('Precision Waterjet Co','Kiran Patel','kiran@pwc.demo','+91-9810000002','Vadodara','Gujarat','India',true,4.4,10,true),
    ('CNC Stone Studio','Neha Rao','neha@cncstudio.demo','+91-9810000003','Bengaluru','Karnataka','India',true,4.8,7,true);
  SELECT id INTO v1 FROM public.vendors WHERE company_name='Rajasthan Marble Works' AND is_demo LIMIT 1;
  SELECT id INTO v2 FROM public.vendors WHERE company_name='Precision Waterjet Co' AND is_demo LIMIT 1;
  SELECT id INTO v3 FROM public.vendors WHERE company_name='CNC Stone Studio' AND is_demo LIMIT 1;

  -- Products
  INSERT INTO public.products (name, description, base_price, unit, is_demo)
  VALUES
    ('Italian Statuario Marble Panel','Premium white marble wall panel 600x300x18mm',8500,'sqft',true),
    ('Rain Forest Green Interlocking Panel','Textured interlocking cladding 300x300mm',1250,'sqft',true),
    ('Waterjet Medallion – Peacock','Multi-stone waterjet medallion 1200mm dia',185000,'nos',true),
    ('Temple Pillar Carving – Sandstone','Hand-carved traditional pillar 8ft',245000,'nos',true);
  SELECT id INTO p1 FROM public.products WHERE name LIKE 'Italian Statuario%' AND is_demo LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE name LIKE 'Rain Forest%' AND is_demo LIMIT 1;
  SELECT id INTO p3 FROM public.products WHERE name LIKE 'Waterjet Medallion%' AND is_demo LIMIT 1;
  SELECT id INTO p4 FROM public.products WHERE name LIKE 'Temple Pillar%' AND is_demo LIMIT 1;

  -- Projects
  INSERT INTO public.projects (name, customer_id, city, status, is_demo)
  VALUES
    ('Prestige Lakeside Tower – Lobby Cladding', c1, 'Bengaluru','in_progress',true),
    ('SP Vertex Villa – Master Bath', c2, 'Mumbai','in_progress',true),
    ('Adani Corporate HQ – Feature Wall', c3, 'Ahmedabad','planning',true),
    ('Sri Balaji Temple – Sanctum Restoration', c5, 'Tirupati','in_progress',true);
  SELECT id INTO pr1 FROM public.projects WHERE name LIKE 'Prestige Lakeside%' AND is_demo LIMIT 1;
  SELECT id INTO pr2 FROM public.projects WHERE name LIKE 'SP Vertex%' AND is_demo LIMIT 1;
  SELECT id INTO pr3 FROM public.projects WHERE name LIKE 'Adani Corporate%' AND is_demo LIMIT 1;
  SELECT id INTO pr4 FROM public.projects WHERE name LIKE 'Sri Balaji Temple%' AND is_demo LIMIT 1;

  -- Enquiries
  INSERT INTO public.enquiries (project_id, customer_id, stage, is_demo)
  VALUES
    (pr1, c1, 'quoted', true),
    (pr2, c2, 'rfq_sent', true),
    (pr4, c5, 'new', true);

  -- Follow-ups
  INSERT INTO public.followups (project_id, notes, due_date, status, is_demo)
  VALUES
    (pr1, 'Client site walkthrough scheduled', CURRENT_DATE + 3, 'pending', true),
    (pr2, 'Confirm sample dispatch', CURRENT_DATE + 1, 'pending', true);

  -- Inventory
  INSERT INTO public.inventory_items (name, quantity, unit, is_demo)
  VALUES
    ('Statuario Block – Lot A', 12, 'nos', true),
    ('Green Marble Slabs – Lot B', 45, 'nos', true),
    ('Sandstone Blocks – Temple grade', 8, 'nos', true);

END; $$;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data() FROM anon, authenticated, PUBLIC;
