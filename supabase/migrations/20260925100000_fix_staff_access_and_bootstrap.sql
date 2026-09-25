-- =========================================================================
-- SPRINT 2.0 — PRODUCTION READINESS & RECONCILIATION AUDIT
-- 1. Fix has_staff_access: support super_admin, hr, bootstrap safeguard & org email
-- 2. Auto-heal admin role for @stonetech.in users
-- 3. Update handle_new_user trigger
-- 4. Create bank_accounts & bank_transactions tables for real banking watchlist & SMS parser
-- =========================================================================

-- 1. Redefine has_staff_access with bootstrap safeguard and domain check
CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Bootstrap safeguard: if no user roles are defined yet, permit authenticated user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    RETURN true;
  END IF;

  -- Check if user has an explicit staff role
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'sales_manager', 'sales', 'purchase', 'hr')
  ) THEN
    RETURN true;
  END IF;

  -- Domain check: if user is from @stonetech.in or info@stonetech.in, grant staff access
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NOT NULL AND (v_email ILIKE '%@stonetech.in' OR v_email ILIKE 'info@stonetech.in') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_staff_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated, service_role;

-- 2. Auto-heal: Ensure all @stonetech.in users have 'admin' in user_roles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT id FROM auth.users
    WHERE email ILIKE '%@stonetech.in' OR email ILIKE 'info@stonetech.in'
  ) LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END;
$$;

-- 3. Update handle_new_user trigger to automatically assign admin to @stonetech.in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_count int;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_existing_count FROM public.user_roles;

  -- First user or any @stonetech.in email receives admin role
  IF v_existing_count = 0 OR NEW.email ILIKE '%@stonetech.in' OR NEW.email ILIKE 'info@stonetech.in' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_type TEXT NOT NULL DEFAULT 'current',
  upi_id TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 100,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read bank_accounts" ON public.bank_accounts;
CREATE POLICY "Staff can read bank_accounts" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff can write bank_accounts" ON public.bank_accounts;
CREATE POLICY "Staff can write bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- Seed standard clean operational accounts with ₹0.00 opening balance
INSERT INTO public.bank_accounts (name, bank_name, account_number, account_type, opening_balance, current_balance, is_primary, sort_order)
VALUES
  ('Stone Tech Operations (Current A/c)', 'State Bank of India', '•••• 4912', 'current', 0.00, 0.00, true, 1),
  ('Petty Cash & Site Float', 'Cash on Hand', 'Cash Drawer', 'cash', 0.00, 0.00, false, 2),
  ('Customer Collections Clearing', 'UPI & Digital Inflow', 'Paytm / GPay UPI', 'clearing', 0.00, 0.00, false, 3)
ON CONFLICT DO NOTHING;

-- 5. Create bank_transactions table for SMS / UPI message ingestion
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- 'paytm', 'gpay', 'phonepe', 'bank_sms', 'manual', 'statement'
  transaction_type TEXT NOT NULL DEFAULT 'credit', -- 'credit', 'debit'
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  utr_number TEXT,
  counterparty_name TEXT,
  raw_message TEXT,
  status TEXT NOT NULL DEFAULT 'reconciled', -- 'pending', 'reconciled'
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notes TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read bank_transactions" ON public.bank_transactions;
CREATE POLICY "Staff can read bank_transactions" ON public.bank_transactions
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff can write bank_transactions" ON public.bank_transactions;
CREATE POLICY "Staff can write bank_transactions" ON public.bank_transactions
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
