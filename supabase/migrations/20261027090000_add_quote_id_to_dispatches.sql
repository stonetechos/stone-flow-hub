-- Migration: 20261027090000_add_quote_id_to_dispatches.sql
-- 1. Add direct quote_id foreign key column to dispatches
ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dispatches_quote_id ON public.dispatches(quote_id);

COMMENT ON COLUMN public.dispatches.quote_id IS 'Direct link to the quotation from which this delivery challan was raised.';

-- 2. Backfill quote_id on dispatches from document_lineage
UPDATE public.dispatches d
SET quote_id = dl.source_id
FROM public.document_lineage dl
WHERE dl.target_type = 'dispatch'
  AND dl.target_id = d.id
  AND dl.source_type = 'quote'
  AND d.quote_id IS NULL;

-- 3. Backfill quote_id on dispatches from sales_orders
UPDATE public.dispatches d
SET quote_id = so.quote_id
FROM public.sales_orders so
WHERE d.sales_order_id = so.id
  AND so.quote_id IS NOT NULL
  AND d.quote_id IS NULL;
