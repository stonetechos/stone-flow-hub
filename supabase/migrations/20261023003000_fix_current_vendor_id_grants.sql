-- Ensure public.current_vendor_id() has search_path set and is executable by authenticated and service_role
-- to prevent RLS evaluation failures on purchase_orders, vendor_quotes, and file_objects.

CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT vendor_id FROM public.vendor_users WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_vendor_id() TO authenticated, service_role, anon;
