-- =========================================================================
-- SPRINT 1.7 — AUTHENTICATION FOUNDATION
-- Step 2 of 3: add the new audit event values to activity_action.
--
-- Same reasoning as 20260722150001: ALTER TYPE ... ADD VALUE must commit in
-- its own migration before any function/trigger in a later migration can
-- reference these values by name (used in
-- 20260722150003_super_admin_protection.sql).
-- =========================================================================

ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_created';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'role_changed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_activated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_deactivated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_deleted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'super_admin_delete_attempted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'super_admin_role_change_attempted';
