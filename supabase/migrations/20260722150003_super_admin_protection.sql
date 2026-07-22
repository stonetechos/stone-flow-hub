-- =========================================================================
-- SPRINT 1.7 — AUTHENTICATION FOUNDATION
-- Step 3 of 3: Super Admin foundation, protections, password lifecycle
-- columns, and audit-log plumbing.
--
-- Depends on 20260722150001 (app_role.super_admin) and 20260722150002
-- (activity_action.* new values) having already been committed.
-- =========================================================================

-- ----- SUPER ADMIN ROLE CHECK (mirrors has_role / has_any_role) -----
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- ----- PROTECTION: the super_admin row in user_roles cannot be changed or
-- removed by anyone, including admins and the service-role (server
-- functions run through supabaseAdmin, which bypasses RLS but NOT
-- triggers). This is the authoritative enforcement point for "cannot
-- delete / cannot change role / cannot revoke permissions" — it fires
-- regardless of which client (publishable key, service role) issued the
-- write. -----
CREATE OR REPLACE FUNCTION public.protect_super_admin_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'This account is protected.' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER protect_super_admin_role
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role_mutation();

-- ----- Only one Super Admin at a time. Sprint 1.7 seeds exactly one
-- (info@stonetech.in) and ships no "promote to Super Admin" UI — this
-- guard is a deliberate, documented constraint (see docs/authentication.md)
-- that a future sprint can relax if multi-seat Super Admin is ever wanted. -----
CREATE OR REPLACE FUNCTION public.limit_single_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only one Super Admin is permitted.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER limit_super_admin_count
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.limit_single_super_admin();

-- ----- PROTECTION: profiles row for a Super Admin cannot be deactivated
-- or deleted. A profiles delete is normally reached via the ON DELETE
-- CASCADE from auth.users when an admin calls
-- supabaseAdmin.auth.admin.deleteUser() — aborting here aborts that
-- entire delete, including the auth.users row. -----
CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.is_super_admin(OLD.id) THEN
      RAISE EXCEPTION 'This account is protected.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: block only the deactivation transition; every other profile
  -- field (own display name, avatar, etc.) remains editable as normal.
  IF public.is_super_admin(OLD.id) AND NEW.is_active = false AND OLD.is_active = true THEN
    RAISE EXCEPTION 'This account is protected.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_super_admin_profile_trigger
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_profile();

-- ----- PASSWORD LIFECYCLE -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;

-- ----- AUDIT LOG: capture actor IP where the caller supplies one (server
-- functions populate this from the request; direct client-side writes
-- leave it null — see docs/authentication.md "Audit events" for exactly
-- which paths do which). -----
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS ip_address inet;

-- ----- Automatic "role_changed" audit entries for every grant/revoke on
-- user_roles, regardless of which code path performed it (mirrors the
-- existing log_activity() pattern used for customers/projects/etc, but as
-- its own function so the summary text and action value are specific to
-- roles rather than the generic created/updated/deleted set). -----
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log
      (entity_type, entity_id, action, new_value, summary, actor_id)
    VALUES
      ('user', NEW.user_id, 'role_changed',
       jsonb_build_object('granted', NEW.role),
       'Role granted: ' || NEW.role, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log
      (entity_type, entity_id, action, old_value, summary, actor_id)
    VALUES
      ('user', OLD.user_id, 'role_changed',
       jsonb_build_object('revoked', OLD.role),
       'Role revoked: ' || OLD.role, auth.uid());
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- AFTER trigger: runs only once protect_super_admin_role_mutation (a BEFORE
-- trigger) has already allowed the mutation through, so a blocked attempt
-- never reaches this logger — attempted super_admin mutations are logged
-- explicitly by the calling application code instead (see
-- src/lib/admin/users.functions.ts), since a BEFORE trigger that raises an
-- exception rolls back anything an AFTER trigger in the same statement
-- would have written.
CREATE TRIGGER log_user_roles_activity
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- ----- SEED: the sole initial Super Admin / Platform Owner.
-- No-op if that auth user doesn't exist yet in this environment — create
-- the account first (sign up / invite as usual), then re-run this INSERT
-- once, or promote manually:
--   insert into public.user_roles (user_id, role)
--   select id, 'super_admin' from auth.users where email = 'info@stonetech.in';
-- -----
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'info@stonetech.in'
ON CONFLICT DO NOTHING;
