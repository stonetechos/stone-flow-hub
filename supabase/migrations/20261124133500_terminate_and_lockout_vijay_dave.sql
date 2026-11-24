-- Migration: Terminate Vijay Dave and Permanently Revoke All Access
-- Description: Sets employment status to 'terminated', strips all user roles, deactivates profile, and bans auth account.

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Update employee record to terminated
  UPDATE public.employees
  SET employment_status = 'terminated',
      remarks = 'Terminated - Access permanently revoked',
      updated_at = now()
  WHERE email ILIKE 'vijaydave3476@gmail.com'
     OR full_name ILIKE '%Vijay Dave%';

  -- 2. Lookup auth user ID if exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email ILIKE 'vijaydave3476@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Strip all operational and admin roles
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    -- Deactivate profile
    UPDATE public.profiles
    SET is_active = false,
        updated_at = now()
    WHERE id = v_user_id;

    -- Permanently ban auth account
    UPDATE auth.users
    SET banned_until = now() + INTERVAL '100 years',
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"is_terminated": true, "is_active": false}'::jsonb,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Ensure any matching profile is deactivated
  UPDATE public.profiles
  SET is_active = false,
      updated_at = now()
  WHERE email ILIKE 'vijaydave3476@gmail.com';

END $$;
