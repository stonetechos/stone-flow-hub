-- =========================================================================
-- Update Designations to Official 6 Roles & Enable Multi-Seat Super Admin
-- =========================================================================

-- 1. UPSERT THE 6 OFFICIAL DESIGNATIONS
INSERT INTO public.designations (code, name, purpose, responsibilities, expected_outcomes, level, active)
VALUES
  ('MD', 'Managing Director', 'Overall business leadership and strategic direction', 'Strategy, key architect and client relationships, vendor negotiations, executive governance', 'Revenue growth, operational excellence, profitability', 100, true),
  ('SALES_HEAD', 'Sales Head', 'Head of sales operations and revenue targets', 'Sales pipeline management, quota achievement, team coordination, high-value quotation closures', 'Monthly sales quota achievement and lead conversion', 80, true),
  ('FIELD_SALES_EXEC', 'Field Sales Executive', 'On-site client acquisition, architect visits, and site measurements', 'Architect visits, builder presentations, site inspections, stone sampling, warm lead generation', 'New customer acquisition and active pipeline building', 60, true),
  ('OFFICE_SALES_EXEC', 'Office Sales Executive', 'Showroom consultation, estimate preparation, and client closing', 'In-showroom client walkthroughs, fast estimate and quotation generation, follow-up calls, payment tracking', 'High conversion rate of showroom enquiries and timely closures', 50, true),
  ('DATA_ENTRY_EXEC', 'Data Entry Executive', 'ERP data processing and operational transaction entry', 'Accurate logging of quotations, sales orders, delivery challans, purchase invoices, and inventory receipts', 'Zero-defect ERP records, rapid turnaround of operational entries', 40, true),
  ('OFFICE_ADMIN', 'Office Admin', 'Office facilities, administrative support, and showroom coordination', 'Office administration, sample kit inventory management, front-desk coordination, billing support, logistics liaison', 'Smooth showroom presentation, organized document filing, on-time admin support', 30, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  responsibilities = EXCLUDED.responsibilities,
  expected_outcomes = EXCLUDED.expected_outcomes,
  level = EXCLUDED.level,
  active = true;

-- 2. MULTI-SEAT SUPER ADMIN: DROP SINGLE SUPER ADMIN TRIGGER
DROP TRIGGER IF EXISTS limit_super_admin_count ON public.user_roles;

CREATE OR REPLACE FUNCTION public.limit_single_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Multi-seat super admin is enabled; allow inserting multiple super_admin roles
  RETURN NEW;
END;
$$;

-- 3. ENSURE AT LEAST ONE SUPER ADMIN REMAINS (LAST-STANDING SAFETY LOCK)
CREATE OR REPLACE FUNCTION public.protect_super_admin_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' AND (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.role <> 'super_admin')) THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
      RAISE EXCEPTION 'This account is protected. At least one Super Admin must remain on the system.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.is_super_admin(OLD.id) AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
      RAISE EXCEPTION 'This account is protected. At least one Super Admin must remain on the system.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF public.is_super_admin(OLD.id) AND NEW.is_active = false AND OLD.is_active = true THEN
    IF (SELECT count(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role = 'super_admin' AND p.is_active = true) <= 1 THEN
      RAISE EXCEPTION 'This account is protected. At least one active Super Admin must remain.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
