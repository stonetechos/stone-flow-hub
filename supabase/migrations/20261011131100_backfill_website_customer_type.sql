-- Migration: 20261011131100_backfill_website_customer_type.sql
-- Backfills customer records originating from website lead forms to 'website'.

UPDATE public.customers
SET customer_type = 'website'
WHERE source = 'Shareable Web Link'
   OR notes ILIKE '%Lead from public web form%';
