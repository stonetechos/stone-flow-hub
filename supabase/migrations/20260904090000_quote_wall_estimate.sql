-- =========================================================================
-- Estimate Studio (wall-cladding calculator), integrated directly into the
-- Quotations form. Stores the full calculator worksheet (walls, per-wall
-- products, installation cost breakdown, discount, time-to-complete)
-- alongside the quote it produced, so it can be reloaded/edited and used to
-- regenerate the WhatsApp PDF later. The computed line items themselves
-- still land in quote_items via the existing createQuote() path.
-- =========================================================================

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS wall_estimate jsonb;

COMMENT ON COLUMN public.quotes.wall_estimate IS 'Estimate Studio calculator worksheet (walls, products, installation, discount) that produced this quote''s line items, when created via the wall-cladding calculator. Null for manually-entered quotes.';
