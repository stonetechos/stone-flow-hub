
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  cust_ids uuid[] := ARRAY[]::uuid[];
  vend_ids uuid[] := ARRAY[]::uuid[];
  prod_ids uuid[] := ARRAY[]::uuid[];
  proj_ids uuid[] := ARRAY[]::uuid[];
  enq_ids  uuid[] := ARRAY[]::uuid[];
  quote_ids uuid[] := ARRAY[]::uuid[];
  so_ids   uuid[] := ARRAY[]::uuid[];
  cust_names text[] := ARRAY[
    'Prestige Builders','Shapoorji Pallonji','Adani Realty','Lodha Group','Sri Balaji Temple Trust',
    'DLF Homes','Godrej Properties','Oberoi Realty','Brigade Group','Sobha Developers',
    'Mahindra Lifespaces','Puravankara','Rustomjee','Hiranandani','Kalpataru',
    'K Raheja Corp','Piramal Realty','Tata Housing','Embassy Group','Nitesh Estates',
    'Salarpuria Sattva','RMZ Corp','Bhartiya City','L&T Realty','Runwal Group',
    'Anant Raj','Ambuja Neotia','Mantri Developers','Casagrand','Provident Housing',
    'Century Real Estate','Total Environment','Assetz Property','ND Developers','Ozone Group',
    'Vaishnavi Group','Radiance Realty','Casa Grande','Alliance Group','Purva Corp',
    'Vinayak Enterprises','Marble Palace Hotels','Golden Rock Hospitality','ISKCON Temple Trust','Ramanuja Mission',
    'Sringeri Math','Ayodhya Ram Mandir Trust','Bhairava Group','Nakshatra Homes','Vyoma Interiors'];
  cust_cities text[] := ARRAY['Bengaluru','Mumbai','Ahmedabad','Chennai','Hyderabad','Pune','Delhi','Kolkata','Kochi','Jaipur','Surat','Coimbatore','Indore','Nagpur','Vizag','Bhopal','Lucknow','Chandigarh','Goa','Mysuru'];
  cust_types public.customer_type[] := ARRAY['builder','architect','interior_designer','contractor','individual','company','government']::public.customer_type[];
  vend_names text[] := ARRAY[
    'Rajasthan Marble Works','Precision Waterjet Co','CNC Stone Studio','Kishangarh Stone Traders','Makrana White Co',
    'Udaipur Green Marbles','Vadodara CNC Cutters','Bengaluru Stone Studio','Coimbatore Granite House','Kadapa Black Exports',
    'Tandur Yellow Suppliers','Chennai Coastal Marble','Jaipur Sandstone Guild','Ambaji Marble Depot','Rajasthani Craft House',
    'Karnataka Granite Co','Delhi Slabs India','Hyderabad Stone Yard','Andhra Granite Traders','Global Waterjet Solutions'];
  vend_cities text[] := ARRAY['Kishangarh','Vadodara','Bengaluru','Ambaji','Udaipur','Jaipur','Coimbatore','Chennai','Kadapa','Tandur'];
  prod_names text[] := ARRAY[
    'Italian Statuario Marble Panel','Rain Forest Green Interlocking Panel','Waterjet Medallion – Peacock',
    'Temple Pillar Carving – Sandstone','Kadapa Black Slab','Absolute Black Granite Slab',
    'Botticino Classico Marble','Emperador Dark Marble','Beige Onyx Backlit Panel','Green Onyx Feature Wall',
    'Steel Grey Granite Countertop','River White Granite','Kashmir White Granite','Bianco Carrara Marble Panel',
    'Nero Marquina Marble','Travertine Silver Cladding','Volakas White Marble','Crema Marfil Marble',
    'Jaisalmer Yellow Sandstone','Kota Blue Limestone'];
  proj_stages text[] := ARRAY['new_lead','customer_quotation_sent','vendor_approved','production','completed'];
  enq_stages text[] := ARRAY['new_lead','contacted','rfq_sent','vendor_quote_received','customer_quotation_sent','customer_approved','lost'];
  invoice_statuses public.invoice_status[] := ARRAY['draft','sent','partially_paid','paid','overdue']::public.invoice_status[];
  so_statuses public.sales_order_status[] := ARRAY['draft','confirmed','in_production','ready','shipped','delivered']::public.sales_order_status[];
  po_statuses public.purchase_order_status[] := ARRAY['draft','sent','acknowledged','partially_received','received']::public.purchase_order_status[];
  mo_statuses public.production_status[] := ARRAY['planned','in_progress','on_hold','completed']::public.production_status[];
  pay_methods public.payment_method[] := ARRAY['upi_manual','bank_transfer','cheque','cash','razorpay']::public.payment_method[];
  i int; j int;
  v_cust uuid; v_proj uuid; v_prod uuid; v_vend uuid; v_enq uuid;
  v_rfq uuid; v_vr uuid; v_vq uuid; v_quote uuid; v_so uuid; v_po uuid; v_inv uuid; v_mo uuid;
  v_amount numeric; v_paid numeric;
BEGIN
  FOR i IN 1 .. array_length(cust_names,1) LOOP
    INSERT INTO public.customers (name, primary_email, primary_phone, city, state, country, is_active, is_demo, customer_type)
    VALUES (cust_names[i], lower(replace(cust_names[i],' ','')) || '@demo.example',
            '+91-98' || lpad((10000000 + i)::text, 8, '0'),
            cust_cities[1 + (i % array_length(cust_cities,1))], 'India','India', true, true,
            cust_types[1 + (i % array_length(cust_types,1))])
    RETURNING id INTO v_cust;
    cust_ids := array_append(cust_ids, v_cust);
  END LOOP;

  FOR i IN 1 .. array_length(vend_names,1) LOOP
    INSERT INTO public.vendors (company_name, city, state, country, is_active, rating, lead_time_days, is_demo)
    VALUES (vend_names[i], vend_cities[1 + (i % array_length(vend_cities,1))], 'Rajasthan','India', true,
            round((3.5 + (random()*1.5))::numeric, 1), 5 + (i % 20), true)
    RETURNING id INTO v_vend;
    vend_ids := array_append(vend_ids, v_vend);
  END LOOP;

  FOR i IN 1 .. array_length(prod_names,1) LOOP
    INSERT INTO public.products (name, description, default_unit, is_demo)
    VALUES (prod_names[i], 'Premium demo product — ' || prod_names[i],
            (CASE WHEN i % 3 = 0 THEN 'piece' ELSE 'sqft' END)::public.product_unit, true)
    RETURNING id INTO v_prod;
    prod_ids := array_append(prod_ids, v_prod);
  END LOOP;

  FOR i IN 1 .. 60 LOOP
    v_cust := cust_ids[1 + (i % array_length(cust_ids,1))];
    INSERT INTO public.projects (name, customer_id, city, stage, is_active, is_demo, expected_completion_date)
    VALUES ((SELECT name FROM public.customers WHERE id = v_cust) || ' – ' ||
             (ARRAY['Lobby Cladding','Master Bath','Feature Wall','Temple Sanctum','Villa Facade','Reception Desk','Lift Lobby','Pool Deck','Kitchen Counter','Grand Staircase'])[1 + (i % 10)] ||
             ' Phase ' || (1 + (i % 3)),
            v_cust, (SELECT city FROM public.customers WHERE id = v_cust),
            proj_stages[1 + (i % array_length(proj_stages,1))]::public.lead_stage, true, true,
            (CURRENT_DATE + ((30 + (i * 7) % 365) || ' days')::interval)::date)
    RETURNING id INTO v_proj;
    proj_ids := array_append(proj_ids, v_proj);
  END LOOP;

  FOR i IN 1 .. 100 LOOP
    v_proj := proj_ids[1 + (i % array_length(proj_ids,1))];
    v_cust := (SELECT customer_id FROM public.projects WHERE id = v_proj);
    INSERT INTO public.enquiries (project_id, customer_id, stage, requirement, source, priority, budget_inr, is_demo)
    VALUES (v_proj, v_cust, enq_stages[1 + (i % array_length(enq_stages,1))]::public.lead_stage,
            (ARRAY['Full lobby cladding','Bathroom vanity + walls','Sanctum wall carvings','Facade panelling','Kitchen slabs','Feature wall medallion','Pool deck cladding','Staircase treads'])[1 + (i % 8)] || ' — ' || (200 + (i*37) % 4000)::text || ' sqft',
            (ARRAY['walk-in','referral','website','instagram','existing_customer','architect'])[1 + (i % 6)],
            (ARRAY['low','normal','normal','high','urgent'])[1 + (i % 5)]::public.enquiry_priority,
            (100000 + (i*12345) % 4000000), true)
    RETURNING id INTO v_enq;
    enq_ids := array_append(enq_ids, v_enq);
    UPDATE public.enquiries SET created_at = now() - ((random()*720)::int || ' days')::interval,
                                 updated_at = now() - ((random()*30)::int || ' days')::interval WHERE id = v_enq;
    FOR j IN 1 .. (1 + (i % 3)) LOOP
      v_prod := prod_ids[1 + ((i+j) % array_length(prod_ids,1))];
      INSERT INTO public.enquiry_items (enquiry_id, product_id, product_name_snapshot, quantity, unit, sort_order, is_demo)
      VALUES (v_enq, v_prod, (SELECT name FROM public.products WHERE id = v_prod),
              50 + ((i*j*13) % 500), 'sqft', j, true);
    END LOOP;
  END LOOP;

  FOR i IN 1 .. 40 LOOP
    v_enq := enq_ids[1 + (i % array_length(enq_ids,1))];
    v_proj := (SELECT project_id FROM public.enquiries WHERE id = v_enq);
    INSERT INTO public.rfqs (enquiry_id, project_id, due_date, status, notes, is_demo)
    VALUES (v_enq, v_proj,
            (CURRENT_DATE - ((i*5) || ' days')::interval)::date + INTERVAL '10 days',
            (ARRAY['draft','sent','partially_received','fully_received','closed'])[1 + (i % 5)]::public.rfq_status,
            'Demo RFQ round ' || i, true)
    RETURNING id INTO v_rfq;
    INSERT INTO public.rfq_items (rfq_id, enquiry_item_id, product_id, product_name_snapshot, quantity, unit, sort_order, is_demo)
    SELECT v_rfq, ei.id, ei.product_id, ei.product_name_snapshot, ei.quantity, ei.unit, ei.sort_order, true
      FROM public.enquiry_items ei WHERE ei.enquiry_id = v_enq;
    FOR j IN 1 .. (2 + (i % 2)) LOOP
      v_vend := vend_ids[1 + ((i+j) % array_length(vend_ids,1))];
      INSERT INTO public.vendor_requests (rfq_id, vendor_id, response_status, sent_at, is_demo)
      VALUES (v_rfq, v_vend, 'pending'::public.vendor_request_status, now() - ((i*3) || ' days')::interval, true)
      RETURNING id INTO v_vr;
      IF (i+j) % 2 = 0 THEN
        INSERT INTO public.vendor_quotes (vendor_request_id, total_inr, freight_inr, dispatch_days, gst_included, submitted_at, is_approved, remarks, is_demo)
        VALUES (v_vr, 50000 + ((i*j*4711) % 500000), 2000 + ((i*j*137) % 8000),
                7 + ((i*j) % 20), true, now() - ((i*2) || ' days')::interval,
                (i % 5 = 0 AND j = 1), 'Demo vendor quote', true)
        RETURNING id INTO v_vq;
        INSERT INTO public.vendor_quote_items (vendor_quote_id, rfq_item_id, product_name_snapshot, unit_price_inr, quantity, is_demo)
        SELECT v_vq, ri.id, ri.product_name_snapshot, 400 + ((i*j*17) % 1200), ri.quantity, true
          FROM public.rfq_items ri WHERE ri.rfq_id = v_rfq;
      END IF;
    END LOOP;
  END LOOP;

  FOR i IN 1 .. 40 LOOP
    v_proj := proj_ids[1 + (i % array_length(proj_ids,1))];
    v_cust := (SELECT customer_id FROM public.projects WHERE id = v_proj);
    INSERT INTO public.quotes (project_id, customer_id, status, currency_code, is_demo)
    VALUES (v_proj, v_cust,
            (ARRAY['draft','sent','accepted','rejected','converted'])[1 + (i % 5)]::public.quote_status,
            'INR', true)
    RETURNING id INTO v_quote;
    quote_ids := array_append(quote_ids, v_quote);
    UPDATE public.quotes SET created_at = now() - ((random()*600)::int || ' days')::interval WHERE id = v_quote;
    FOR j IN 1 .. (2 + (i % 3)) LOOP
      v_prod := prod_ids[1 + ((i+j) % array_length(prod_ids,1))];
      INSERT INTO public.quote_items (quote_id, product_id, description, quantity, unit, unit_price, tax_pct, sort_order, is_demo)
      VALUES (v_quote, v_prod, (SELECT name FROM public.products WHERE id = v_prod),
              80 + ((i*j*11) % 400), 'sqft', 600 + ((i*j*29) % 1800), 18, j, true);
    END LOOP;
  END LOOP;

  FOR i IN 1 .. 30 LOOP
    v_quote := quote_ids[1 + (i % array_length(quote_ids,1))];
    v_proj := (SELECT project_id FROM public.quotes WHERE id = v_quote);
    v_cust := (SELECT customer_id FROM public.quotes WHERE id = v_quote);
    INSERT INTO public.sales_orders (quote_id, project_id, customer_id, status, order_date, delivery_date, is_demo)
    VALUES (v_quote, v_proj, v_cust, so_statuses[1 + (i % array_length(so_statuses,1))],
            (CURRENT_DATE - ((i*11) || ' days')::interval)::date,
            (CURRENT_DATE + ((30 + i*3) || ' days')::interval)::date, true)
    RETURNING id INTO v_so;
    so_ids := array_append(so_ids, v_so);
  END LOOP;

  FOR i IN 1 .. 25 LOOP
    v_vend := vend_ids[1 + (i % array_length(vend_ids,1))];
    v_proj := proj_ids[1 + (i % array_length(proj_ids,1))];
    INSERT INTO public.purchase_orders (vendor_id, project_id, status, order_date, expected_date, currency_code, is_demo)
    VALUES (v_vend, v_proj, po_statuses[1 + (i % array_length(po_statuses,1))],
            (CURRENT_DATE - ((i*9) || ' days')::interval)::date,
            (CURRENT_DATE + ((i*3) || ' days')::interval)::date, 'INR', true);
  END LOOP;

  FOR i IN 1 .. 25 LOOP
    v_so := so_ids[1 + (i % array_length(so_ids,1))];
    v_proj := (SELECT project_id FROM public.sales_orders WHERE id = v_so);
    v_cust := (SELECT customer_id FROM public.sales_orders WHERE id = v_so);
    v_prod := prod_ids[1 + (i % array_length(prod_ids,1))];
    INSERT INTO public.production_orders (sales_order_id, project_id, customer_id, product_id, quantity, unit, status, planned_start, planned_end, is_demo)
    VALUES (v_so, v_proj, v_cust, v_prod, 100 + (i * 7), 'sqft',
            mo_statuses[1 + (i % array_length(mo_statuses,1))],
            (CURRENT_DATE - ((i*4) || ' days')::interval)::date,
            (CURRENT_DATE + ((i*2) || ' days')::interval)::date, true);
  END LOOP;

  FOR i IN 1 .. 30 LOOP
    v_quote := quote_ids[1 + (i % array_length(quote_ids,1))];
    v_proj := (SELECT project_id FROM public.quotes WHERE id = v_quote);
    v_cust := (SELECT customer_id FROM public.quotes WHERE id = v_quote);
    INSERT INTO public.invoices (quote_id, project_id, customer_id, status, issue_date, due_date, currency_code, is_demo)
    VALUES (v_quote, v_proj, v_cust,
            invoice_statuses[1 + (i % array_length(invoice_statuses,1))],
            (CURRENT_DATE - ((i*13) || ' days')::interval)::date,
            (CURRENT_DATE - ((i*13) || ' days')::interval)::date + INTERVAL '15 days',
            'INR', true)
    RETURNING id INTO v_inv;
    FOR j IN 1 .. (2 + (i % 3)) LOOP
      v_prod := prod_ids[1 + ((i+j) % array_length(prod_ids,1))];
      INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, tax_pct, sort_order, is_demo)
      VALUES (v_inv, v_prod, (SELECT name FROM public.products WHERE id = v_prod),
              50 + ((i*j*7) % 300), 'sqft', 700 + ((i*j*31) % 2000), 18, j, true);
    END LOOP;
    v_amount := (SELECT total FROM public.invoices WHERE id = v_inv);
    IF v_amount > 0 AND i % 3 <> 0 THEN
      v_paid := CASE WHEN i % 4 = 0 THEN v_amount ELSE round(v_amount * 0.5, 2) END;
      INSERT INTO public.payments (invoice_id, amount, method, payment_date, is_demo)
      VALUES (v_inv, v_paid, pay_methods[1 + (i % array_length(pay_methods,1))],
              (CURRENT_DATE - ((i*11) || ' days')::interval)::date, true);
    END IF;
  END LOOP;

  FOR i IN 1 .. 40 LOOP
    v_prod := prod_ids[1 + (i % array_length(prod_ids,1))];
    INSERT INTO public.inventory_items (product_id, location, quantity_on_hand, unit, block_no, lot_no, is_demo)
    VALUES (v_prod, (ARRAY['Warehouse A','Warehouse B','Yard 1','Yard 2','Kishangarh Yard'])[1 + (i % 5)],
            5 + (i % 60), 'piece', 'BLK-' || lpad(i::text, 4, '0'),
            'LOT-' || chr(65 + (i % 6)) || i, true);
  END LOOP;

  FOR i IN 1 .. 80 LOOP
    v_proj := proj_ids[1 + (i % array_length(proj_ids,1))];
    v_enq  := enq_ids[1 + (i % array_length(enq_ids,1))];
    INSERT INTO public.followups (project_id, enquiry_id, notes, scheduled_at, status, channel, is_demo)
    VALUES (v_proj, v_enq,
            (ARRAY['Site walkthrough','Sample dispatch confirm','Advance payment reminder','Design review call','Site measurement','Vendor coordination','Installation kickoff'])[1 + (i % 7)],
            now() + ((i - 40) || ' days')::interval,
            (CASE WHEN i < 40 THEN 'done' ELSE 'pending' END)::public.followup_status,
            (ARRAY['call','whatsapp','email','meeting'])[1 + (i % 4)]::public.followup_channel,
            true);
  END LOOP;
END;
$function$;
