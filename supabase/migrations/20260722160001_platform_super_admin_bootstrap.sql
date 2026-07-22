-- =========================================================================
-- SPRINT 1.7.1 — PLATFORM HARDENING & ARCHITECTURE CORRECTIONS
-- Step 1 of 3: Platform Owner bootstrap function (Part 1).
--
-- Depends on 20260722150003 (user_roles.role can hold 'super_admin', the
-- limit_single_super_admin / protect_super_admin_role triggers) having
-- already been committed.
-- =========================================================================

-- ----- Sprint 1.7.1, Part 1 — "Remove any hard dependency on
-- info@stonetech.in throughout the application. Instead introduce
-- platform_super_admin or equivalent architecture. The identity of the
-- Platform Super Admin must never depend upon an email address."
--
-- This replaces the old migration-time seed INSERT (removed from
-- 20260722150003 — see that file's updated comment) with an explicit,
-- idempotent, operator-invoked function. An email address is still how a
-- human *locates* the account to promote — that part is unavoidable, this
-- is how every "make X the owner" operation in any system starts — but it
-- is only ever a one-time lookup key here, never a stored identity: once
-- granted, the role lives entirely in `user_roles.user_id`, and the email
-- on that account can be changed afterwards (e.g. via normal Supabase
-- auth email-change) with zero effect on who holds the role.
--
-- Deliberately NOT granted to `authenticated`/`anon` — this is an operator
-- bootstrap action (run once via the Supabase SQL editor, or any
-- service-role context), not something the app's publishable-key client
-- should ever be able to call. `service_role` bypasses grants entirely, so
-- no explicit grant is needed for that path.
-- -----
CREATE OR REPLACE FUNCTION public.bootstrap_platform_super_admin(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'bootstrap_platform_super_admin: no auth user found for email %', _email;
  END IF;

  -- ON CONFLICT DO NOTHING makes re-running this against the same account
  -- a safe no-op. If a *different* account already holds 'super_admin',
  -- the existing limit_single_super_admin trigger (migration 20260722150003)
  -- rejects the insert with 'Only one Super Admin is permitted.' — this
  -- function does not attempt to demote or replace an existing owner.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_platform_super_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_platform_super_admin(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_platform_super_admin(text) FROM anon;
