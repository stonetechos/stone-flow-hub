-- =========================================================================
-- SPRINT 1.7.1 — PLATFORM HARDENING & ARCHITECTURE CORRECTIONS
-- Step 2 of 3: has_role / has_any_role — Platform Super Admin inheritance
-- (Part 6: Permission Audit / Part 7: Code Quality).
--
-- Depends on 20260703061841 (the role-lookup disclosure guard version of
-- these two functions) having already been committed — this migration is
-- a further CREATE OR REPLACE on top of it, not a rewrite from scratch.
-- =========================================================================

-- ----- Sprint 1.7.1, Part 6 — "Search the ENTIRE codebase. Locate every
-- admin-only permission check. Verify whether super_admin should also be
-- accepted." The Platform Super Admin (added in Sprint 1.7) is meant to be
-- a strict superset of Admin capability, but is granted only the
-- `super_admin` role — never also `admin`. Before this migration, every
-- RLS policy and every application code path that called
-- `has_role(uid, 'admin')` / `has_any_role(uid, ARRAY['admin', ...])`
-- literally required the `admin` row and silently rejected the Super
-- Admin.
--
-- Redefining these two functions here fixes every one of those call sites
-- at once — the ~20+ RLS policies across the schema that check
-- `has_role(..., 'admin')`, plus every application call site already
-- routed through them — without editing each policy or call site
-- individually (Part 7: single source of truth). This is the ONLY
-- inheritance rule added: `super_admin` satisfies an `'admin'` check.
-- Every other role comparison is unchanged, exact-match behavior.
--
-- The role-lookup disclosure guard from migration 20260703061841 is
-- preserved exactly in spirit (a caller looking up someone else's role
-- must themselves hold admin-or-above), extended only so a Super Admin
-- caller also passes that gate — consistent with the same inheritance
-- rule, not a separate change.
-- -----
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'super_admin')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = ANY(_roles)
        OR (role = 'super_admin' AND 'admin' = ANY(_roles))
      )
  );
END;
$$;
