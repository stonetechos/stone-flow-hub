
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_created';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_deleted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_activated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_deactivated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'super_admin_delete_attempted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'super_admin_role_change_attempted';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;
