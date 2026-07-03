
ALTER TABLE public.enquiries ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS requirement text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS architect_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS area_sqft numeric(12,2);
