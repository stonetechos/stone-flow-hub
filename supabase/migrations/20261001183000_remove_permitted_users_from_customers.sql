-- Migration: 20261001183000_remove_permitted_users_from_customers.sql
-- Removes internal staff / permitted app users and verification test records that were
-- mistakenly added to the customers table.
-- NOTE: Internal app users, their login accounts, roles, and employee records remain 
-- 100% intact in auth.users, public.user_roles, and public.employees.

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN 
    SELECT id, name FROM public.customers
    WHERE name ILIKE '%Dummy Test Client%'
       OR name ILIKE 'Ankur%'
       OR name ILIKE 'Harash Pupneja%'
       OR name ILIKE 'Rishi rai%'
  LOOP
    -- Clean up any child test/enquiry/contact records attached to these entries
    DELETE FROM public.quote_items WHERE quote_id IN (SELECT id FROM public.quotes WHERE customer_id = v_rec.id);
    DELETE FROM public.quotes WHERE customer_id = v_rec.id;
    DELETE FROM public.sales_order_items WHERE sales_order_id IN (SELECT id FROM public.sales_orders WHERE customer_id = v_rec.id);
    DELETE FROM public.sales_orders WHERE customer_id = v_rec.id;
    DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE customer_id = v_rec.id);
    DELETE FROM public.invoices WHERE customer_id = v_rec.id;
    DELETE FROM public.enquiries WHERE customer_id = v_rec.id;
    DELETE FROM public.projects WHERE customer_id = v_rec.id;
    DELETE FROM public.customer_contacts WHERE customer_id = v_rec.id;
    DELETE FROM public.customer_tags WHERE customer_id = v_rec.id;
    
    -- Delete from customers table
    DELETE FROM public.customers WHERE id = v_rec.id;
  END LOOP;
END $$;
