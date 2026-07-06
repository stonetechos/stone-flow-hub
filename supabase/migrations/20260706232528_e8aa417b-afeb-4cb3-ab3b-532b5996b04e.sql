
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c1 uuid; c2 uuid; c3 uuid; c5 uuid;
  p1 uuid; p2 uuid; p4 uuid;
  pr1 uuid; pr2 uuid; pr4 uuid;
BEGIN
  INSERT INTO public.customers (name, primary_email, primary_phone, city, state, country, is_active, is_demo) VALUES
    ('Prestige Builders','ravi@prestige.demo','+91-9800000001','Bengaluru','Karnataka','India',true,true),
    ('Shapoorji Pallonji','anita@sp.demo','+91-9800000002','Mumbai','Maharashtra','India',true,true),
    ('Adani Realty','suresh@adani.demo','+91-9800000003','Ahmedabad','Gujarat','India',true,true),
    ('Lodha Group','priya@lodha.demo','+91-9800000004','Mumbai','Maharashtra','India',true,true),
    ('Sri Balaji Temple Trust','trust@balaji.demo','+91-9800000005','Tirupati','AP','India',true,true);
  SELECT id INTO c1 FROM public.customers WHERE name='Prestige Builders' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO c2 FROM public.customers WHERE name='Shapoorji Pallonji' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO c3 FROM public.customers WHERE name='Adani Realty' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO c5 FROM public.customers WHERE name='Sri Balaji Temple Trust' AND is_demo ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.vendors (company_name, city, state, country, is_active, rating, lead_time_days, is_demo) VALUES
    ('Rajasthan Marble Works','Kishangarh','Rajasthan','India',true,4.6,14,true),
    ('Precision Waterjet Co','Vadodara','Gujarat','India',true,4.4,10,true),
    ('CNC Stone Studio','Bengaluru','Karnataka','India',true,4.8,7,true);

  INSERT INTO public.products (name, description, default_unit, is_demo) VALUES
    ('Italian Statuario Marble Panel','Premium white marble wall panel 600x300x18mm','sqft',true),
    ('Rain Forest Green Interlocking Panel','Textured interlocking cladding 300x300mm','sqft',true),
    ('Waterjet Medallion – Peacock','Multi-stone waterjet medallion 1200mm dia','piece',true),
    ('Temple Pillar Carving – Sandstone','Hand-carved traditional pillar 8ft','piece',true);
  SELECT id INTO p1 FROM public.products WHERE name LIKE 'Italian Statuario%' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE name LIKE 'Rain Forest%' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO p4 FROM public.products WHERE name LIKE 'Temple Pillar%' AND is_demo ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.projects (name, customer_id, city, stage, is_active, is_demo) VALUES
    ('Prestige Lakeside Tower – Lobby Cladding', c1, 'Bengaluru','production',true,true),
    ('SP Vertex Villa – Master Bath',            c2, 'Mumbai','vendor_approved',true,true),
    ('Adani Corporate HQ – Feature Wall',        c3, 'Ahmedabad','new_lead',true,true),
    ('Sri Balaji Temple – Sanctum Restoration',  c5, 'Tirupati','customer_quotation_sent',true,true);
  SELECT id INTO pr1 FROM public.projects WHERE name LIKE 'Prestige Lakeside%' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO pr2 FROM public.projects WHERE name LIKE 'SP Vertex%' AND is_demo ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO pr4 FROM public.projects WHERE name LIKE 'Sri Balaji Temple%' AND is_demo ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.enquiries (project_id, customer_id, stage, requirement, is_demo) VALUES
    (pr1, c1, 'customer_quotation_sent', 'Statuario cladding, 4,500 sqft', true),
    (pr2, c2, 'rfq_sent',                'Master bath vanity + wall, 220 sqft', true),
    (pr4, c5, 'new_lead',                'Sanctum wall carvings, custom', true);

  INSERT INTO public.followups (project_id, notes, scheduled_at, status, is_demo) VALUES
    (pr1, 'Client site walkthrough', now() + interval '3 days', 'pending', true),
    (pr2, 'Confirm sample dispatch',  now() + interval '1 day', 'pending', true);

  INSERT INTO public.inventory_items (product_id, location, quantity_on_hand, unit, block_no, lot_no, is_demo) VALUES
    (p1, 'Warehouse A', 12, 'piece', 'BLK-001', 'LOT-A', true),
    (p2, 'Warehouse A', 45, 'piece', 'BLK-002', 'LOT-B', true),
    (p4, 'Yard B',       8, 'piece', 'BLK-003', 'LOT-T', true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data() FROM anon, authenticated, PUBLIC;
