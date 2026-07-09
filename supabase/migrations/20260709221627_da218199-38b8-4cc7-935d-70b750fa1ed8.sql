ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS category TEXT NULL
  CHECK (category IS NULL OR category IN ('supply_only','supply_and_installation','installation_only','material_and_labour'));

CREATE INDEX IF NOT EXISTS quotes_category_idx ON public.quotes(category);