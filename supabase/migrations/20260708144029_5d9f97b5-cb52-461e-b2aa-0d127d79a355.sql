-- New enum values for the business-friendly Lead Stage pipeline.
-- Postgres does not support ordering with BEFORE/AFTER inside a single migration
-- reliably across all versions when the enum is already used, so we append; the
-- UI-side LEAD_STAGES array controls display order.
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'after_sales';

-- Free-text notes to accompany the existing lost_reason column.
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS lost_notes text;