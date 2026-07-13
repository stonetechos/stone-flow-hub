ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS initials text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS department text;