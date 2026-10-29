-- Migration: 20261030032000_resync_document_sequences_and_fix_triggers.sql
-- 1. Resync entity_sequences counters for quotes, projects, invoices, and sales orders
--    to guarantee that next_code() never collides with manually inserted or existing document codes.

DO $$
BEGIN
  -- Resync QUO
  UPDATE public.entity_sequences s
  SET last_value = GREATEST(
    s.last_value,
    COALESCE((SELECT MAX(substring(quote_no from '\d+')::bigint) FROM public.quotes), 0),
    (SELECT COUNT(*) FROM public.quotes)
  )
  WHERE prefix = 'QUO';

  -- Resync PRJ
  UPDATE public.entity_sequences s
  SET last_value = GREATEST(
    s.last_value,
    COALESCE((SELECT MAX(substring(project_code from '\d+')::bigint) FROM public.projects), 0),
    (SELECT COUNT(*) FROM public.projects)
  )
  WHERE prefix = 'PRJ';

  -- Resync INV
  UPDATE public.entity_sequences s
  SET last_value = GREATEST(
    s.last_value,
    COALESCE((SELECT MAX(substring(invoice_no from '\d+')::bigint) FROM public.invoices), 0),
    (SELECT COUNT(*) FROM public.invoices)
  )
  WHERE prefix = 'INV';

  -- Resync SO
  UPDATE public.entity_sequences s
  SET last_value = GREATEST(
    s.last_value,
    COALESCE((SELECT MAX(substring(so_no from '\d+')::bigint) FROM public.sales_orders), 0),
    (SELECT COUNT(*) FROM public.sales_orders)
  )
  WHERE prefix = 'SO';
END $$;

-- 2. Make code assignment triggers SECURITY DEFINER with search_path = public
--    and ensure authenticated users have EXECUTE rights on trigger functions.

CREATE OR REPLACE FUNCTION public.assign_quote_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quote_no IS NULL OR NEW.quote_no = '' THEN
    NEW.quote_no := public.next_code('QUO');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_project_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
    NEW.project_code := public.next_code('PRJ');
  END IF;
  RETURN NEW;
END; $$;

GRANT EXECUTE ON FUNCTION public.assign_quote_code() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_project_code() TO authenticated, service_role;
