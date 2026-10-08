-- =====================================================================
-- Migration: Add liability_payments table for recurring/one-time liabilities
-- (Rental liabilities, loans, recurring lease & debt payments)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.liability_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference_no TEXT,
  month_for TEXT, -- e.g. "October 2026", "2026-10"
  notes TEXT,
  paid_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS liability_payments_liability_id_idx ON public.liability_payments(liability_id);
CREATE INDEX IF NOT EXISTS liability_payments_date_idx ON public.liability_payments(payment_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.liability_payments TO authenticated;
GRANT ALL ON public.liability_payments TO service_role;

ALTER TABLE public.liability_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read liability_payments" ON public.liability_payments;
CREATE POLICY "Staff can read liability_payments" ON public.liability_payments FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff can write liability_payments" ON public.liability_payments;
CREATE POLICY "Staff can write liability_payments" ON public.liability_payments FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

DROP TRIGGER IF EXISTS liability_payments_touch ON public.liability_payments;
CREATE TRIGGER liability_payments_touch BEFORE UPDATE ON public.liability_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger for in-app / phone notification when liability payment is entered
CREATE OR REPLACE FUNCTION public.notify_new_liability_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_liability_name TEXT;
BEGIN
  SELECT name INTO v_liability_name FROM public.liabilities WHERE id = NEW.liability_id;
  
  INSERT INTO public.notifications (
    user_id,
    tier,
    title,
    body,
    entity_type,
    entity_id,
    link_path,
    created_by
  )
  VALUES (
    NULL,
    'important',
    'Liability Payment Recorded: ' || COALESCE(v_liability_name, 'Liability'),
    '₹' || NEW.amount || ' paid on ' || NEW.payment_date || ' via ' || COALESCE(NEW.payment_mode, 'Bank Transfer') || CASE WHEN NEW.month_for IS NOT NULL THEN ' for ' || NEW.month_for ELSE '' END,
    'liability',
    NEW.liability_id,
    '/liabilities',
    NEW.paid_by
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the payment insert if notifications table has a constraint or is missing
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_liability_payment ON public.liability_payments;
CREATE TRIGGER trigger_notify_new_liability_payment
AFTER INSERT ON public.liability_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_liability_payment();

NOTIFY pgrst, 'reload schema';
