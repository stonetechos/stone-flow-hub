-- Add 'quote' as a valid public.followups.entity_type.
--
-- Sales dashboard work (2026-09): the Quotation detail page now offers
-- inline follow-up scheduling once a quote is "Sent" (i.e. approval from
-- the customer is pending), the same way Enquiries/Projects/Vendors/etc.
-- already do. followups_entity_type_check (added in
-- 20260706202549_75b1d943-847f-43cf-9351-4e453f3b8616.sql) didn't yet
-- include 'quote', so this widens it — additive only, no existing rows
-- are affected.
ALTER TABLE public.followups
  DROP CONSTRAINT IF EXISTS followups_entity_type_check;

ALTER TABLE public.followups
  ADD CONSTRAINT followups_entity_type_check
  CHECK (entity_type IN (
    'customer','project','enquiry','vendor',
    'rfq','purchase_order','dispatch','sales_order','invoice','quote'
  ));
