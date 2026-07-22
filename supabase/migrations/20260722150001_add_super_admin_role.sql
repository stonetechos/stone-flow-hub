-- =========================================================================
-- SPRINT 1.7 — AUTHENTICATION FOUNDATION
-- Step 1 of 2: add the SUPER_ADMIN value to the app_role enum.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to be committed before the new
-- value can be referenced by name in other statements (functions, triggers,
-- policies). That is why this is its own migration file, run and committed
-- ahead of 20260722150002_super_admin_protection.sql, which is where every
-- function/trigger that references 'super_admin' lives.
-- =========================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
