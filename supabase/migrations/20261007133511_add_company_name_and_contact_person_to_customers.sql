-- Migration: 20261007133511_add_company_name_and_contact_person_to_customers.sql
-- Adds company_name (Firm / Company Name) and contact_person (Contact Person Name)
-- to public.customers table so organizations can explicitly track both the firm/business
-- name and primary contact individual across all customer touchpoints.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS contact_person text;

COMMENT ON COLUMN public.customers.company_name IS 'Firm / Company name of the customer organization.';
COMMENT ON COLUMN public.customers.contact_person IS 'Contact person''s name representing the customer or firm.';

-- Indexes for fast autocomplete, search and lookup
CREATE INDEX IF NOT EXISTS customers_company_name_idx ON public.customers (lower(company_name));
CREATE INDEX IF NOT EXISTS customers_contact_person_idx ON public.customers (lower(contact_person));
