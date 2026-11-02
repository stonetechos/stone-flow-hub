-- Migration: Job Postings & Candidate Applications
-- Timestamp: 2026-11-03 01:00:00

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no text NOT NULL UNIQUE,
  job_id text NOT NULL,
  job_title text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  email text,
  current_city text NOT NULL DEFAULT 'Ahmedabad',
  current_area text,
  total_experience text,
  current_salary text,
  expected_salary text,
  highest_qualification text,
  notice_period text DEFAULT 'Immediate',
  has_two_wheeler boolean DEFAULT false,
  has_driving_license boolean DEFAULT false,
  key_skills text[] DEFAULT '{}'::text[],
  ai_tools_experience text,
  languages_known text[] DEFAULT '{}'::text[],
  resume_url text,
  resume_file_name text,
  cover_note text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'interview_scheduled', 'offered', 'hired', 'rejected')),
  interview_date timestamptz,
  interview_notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  source text NOT NULL DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_applications_job_id_idx ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS job_applications_status_idx ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS job_applications_created_at_idx ON public.job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_phone_idx ON public.job_applications(phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT INSERT ON public.job_applications TO anon;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Anonymous candidates applying from the careers page can insert
DROP POLICY IF EXISTS job_applications_public_insert ON public.job_applications;
CREATE POLICY job_applications_public_insert ON public.job_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated staff can view applications
DROP POLICY IF EXISTS job_applications_staff_read ON public.job_applications;
CREATE POLICY job_applications_staff_read ON public.job_applications
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated staff can update/manage applications
DROP POLICY IF EXISTS job_applications_staff_write ON public.job_applications;
CREATE POLICY job_applications_staff_write ON public.job_applications
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER set_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
