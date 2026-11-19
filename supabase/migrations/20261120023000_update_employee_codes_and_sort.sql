-- Migration: Standardize Employee Codes (001 Gautam, 002 Rahul, 003 Vijay)
-- Gautam (Office Support) -> 001 (Active)
-- Rahul (Data Entry) -> 002 (Terminated)
-- Vijay (Field Sales) -> 003 (Active)

DO $$
BEGIN
  -- 1. Gautam: 001
  UPDATE public.employees
  SET employee_code = '001', updated_at = now()
  WHERE email ILIKE 'guvtamsolanki36@gmail.com'
     OR full_name ILIKE '%Gautam%';

  -- 2. Rahul: 002, Terminated
  UPDATE public.employees
  SET employee_code = '002', employment_status = 'terminated', updated_at = now()
  WHERE email ILIKE 'rp140528@gmail.com'
     OR full_name ILIKE '%Rahul Parmar%';

  -- 3. Vijay: 003, Active
  UPDATE public.employees
  SET employee_code = '003', employment_status = 'active', updated_at = now()
  WHERE email ILIKE 'vijaydave3476@gmail.com'
     OR full_name ILIKE '%Vijay Dave%';
END $$;
