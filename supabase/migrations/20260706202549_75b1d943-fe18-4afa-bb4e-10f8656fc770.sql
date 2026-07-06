ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS entity_type text
    CHECK (entity_type IN (
      'customer','project','enquiry','vendor',
      'rfq','purchase_order','dispatch','sales_order','invoice'
    )),
  ADD COLUMN IF NOT EXISTS entity_id uuid;

UPDATE public.followups
   SET entity_type = 'enquiry', entity_id = enquiry_id
 WHERE entity_type IS NULL AND enquiry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS followups_entity_idx
  ON public.followups (entity_type, entity_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS followups_project_scheduled_idx
  ON public.followups (project_id, scheduled_at DESC)
  WHERE project_id IS NOT NULL;
