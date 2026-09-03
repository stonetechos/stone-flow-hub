-- =========================================================================
-- SPRINT 1.7.1 — PLATFORM HARDENING & ARCHITECTURE CORRECTIONS
-- Step 3 of 3: Audit Improvements (Part 4).
-- =========================================================================

-- ----- Sprint 1.7.1, Part 4 — "Extend audit logging. Store User Agent,
-- Browser, Platform, OS, Timestamp, IP (if available). If IP cannot be
-- obtained in the current request lifecycle, leave the field nullable. Do
-- not fake values."
--
-- `activity_log.ip_address` and `.created_at` already exist (Sprint 1.7,
-- migration 20260722150003, and the original activity_log table
-- respectively). This adds the four remaining fields, all nullable — every
-- write path that doesn't have a genuine value for one of these (e.g. a
-- direct client-side insert has no server-observed User-Agent header to
-- parse) simply omits it rather than inventing one. See
-- src/lib/audit/user-agent.ts for exactly how each is derived where it IS
-- available, and docs/authentication.md § Audit events for which code
-- paths populate which fields.
-- -----
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS platform text;

COMMENT ON COLUMN public.activity_log.user_agent IS
  'Raw User-Agent header (server-side writes) or navigator.userAgent (client-side writes). Null when neither was available.';
COMMENT ON COLUMN public.activity_log.browser IS
  'Best-effort browser name parsed from user_agent by src/lib/audit/user-agent.ts. Null when user_agent is null or unrecognized.';
COMMENT ON COLUMN public.activity_log.os IS
  'Best-effort OS name parsed from user_agent by src/lib/audit/user-agent.ts. Null when user_agent is null or unrecognized.';
COMMENT ON COLUMN public.activity_log.platform IS
  'Web or Capacitor (mobile app), derived via src/lib/capacitor/server-origin-allowlist.ts''s isCapacitorAppOrigin. Null when the write path does not have request-origin information (e.g. an automatic DB trigger).';
