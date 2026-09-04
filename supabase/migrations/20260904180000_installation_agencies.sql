-- Installation Agencies (Task #47) — Rishi: "the next step is Installation
-- which is taken care by us in many cases... the installation agencies are
-- also mentioned in the master list." Same shape/RLS style as
-- carting_agencies (20260904160000_purchase_transportation.sql) — a small
-- reference-data master, not a numbered document (no entity_sequences
-- prefix needed).
--
-- Referenced by quotes.installation_agency_id (Task #49, a later
-- migration) and by installation_agency_ledger_entries (Task #48).

CREATE TABLE public.installation_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_agencies TO authenticated;
GRANT ALL ON public.installation_agencies TO service_role;
ALTER TABLE public.installation_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read installation_agencies" ON public.installation_agencies FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write installation_agencies" ON public.installation_agencies FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER installation_agencies_touch BEFORE UPDATE ON public.installation_agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
