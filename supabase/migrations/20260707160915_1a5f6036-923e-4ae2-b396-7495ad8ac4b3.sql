-- 1) customer_payment_schedules
CREATE TABLE IF NOT EXISTS public.customer_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  milestone_no int NOT NULL,
  label text NOT NULL,
  pct numeric(6,3) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  last_reminder_stage text,
  last_reminder_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payment_schedules TO authenticated;
GRANT ALL ON public.customer_payment_schedules TO service_role;
ALTER TABLE public.customer_payment_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cps staff read"  ON public.customer_payment_schedules
    FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cps staff write" ON public.customer_payment_schedules
    FOR ALL TO authenticated
    USING (public.has_staff_access(auth.uid()))
    WITH CHECK (public.has_staff_access(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS cps_customer_idx   ON public.customer_payment_schedules(customer_id);
CREATE INDEX IF NOT EXISTS cps_project_idx    ON public.customer_payment_schedules(project_id);
CREATE INDEX IF NOT EXISTS cps_estimate_idx   ON public.customer_payment_schedules(estimate_id);
CREATE INDEX IF NOT EXISTS cps_due_status_idx ON public.customer_payment_schedules(due_date, status);

DROP TRIGGER IF EXISTS trg_cps_updated_at ON public.customer_payment_schedules;
CREATE TRIGGER trg_cps_updated_at BEFORE UPDATE ON public.customer_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Stone Tech default schedule policy
CREATE OR REPLACE FUNCTION public.default_customer_payment_schedule(_template text, _total numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF _template IN ('material_supply','custom_articles') THEN
    r := jsonb_build_array(
      jsonb_build_object('label','Advance','pct',80,'due_offset_days',0),
      jsonb_build_object('label','Before Dispatch','pct',20,'due_offset_days',20)
    );
  ELSIF _template IN ('material_install','custom_manufacturing') THEN
    IF COALESCE(_total,0) <= 75000 THEN
      r := jsonb_build_array(
        jsonb_build_object('label','Advance','pct',75,'due_offset_days',0),
        jsonb_build_object('label','On Completion','pct',25,'due_offset_days',15)
      );
    ELSIF _total <= 300000 THEN
      r := jsonb_build_array(
        jsonb_build_object('label','Advance','pct',40,'due_offset_days',0),
        jsonb_build_object('label','On Delivery','pct',40,'due_offset_days',15),
        jsonb_build_object('label','On Completion','pct',20,'due_offset_days',30)
      );
    ELSE
      r := jsonb_build_array(
        jsonb_build_object('label','Advance','pct',50,'due_offset_days',0),
        jsonb_build_object('label','On Completion','pct',50,'due_offset_days',30)
      );
    END IF;
  ELSE
    r := jsonb_build_array(jsonb_build_object('label','Full Payment','pct',100,'due_offset_days',0));
  END IF;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.default_customer_payment_schedule(text, numeric) TO authenticated, service_role;

-- 3) approve_estimate
CREATE OR REPLACE FUNCTION public.approve_estimate(
  _estimate_id uuid,
  _override_schedule jsonb DEFAULT NULL
)
RETURNS SETOF public.customer_payment_schedules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_est   public.estimates%ROWTYPE;
  v_sched jsonb;
  v_item  jsonb;
  v_n     int := 0;
  v_amt   numeric(14,2);
  v_due   date;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estimate % not found', _estimate_id; END IF;
  IF v_est.customer_id IS NULL THEN RAISE EXCEPTION 'Estimate has no customer'; END IF;

  UPDATE public.estimates SET status = 'accepted'
   WHERE id = _estimate_id AND status <> 'accepted';

  DELETE FROM public.customer_payment_schedules
   WHERE estimate_id = _estimate_id AND status = 'pending' AND paid_amount = 0;

  IF _override_schedule IS NOT NULL AND jsonb_array_length(_override_schedule) > 0 THEN
    v_sched := _override_schedule;
  ELSE
    SELECT jsonb_agg(jsonb_build_object(
             'label',label,'pct',pct,'due_offset_days',due_offset_days) ORDER BY sort_order)
      INTO v_sched
      FROM public.estimate_payment_schedules
     WHERE estimate_id = _estimate_id;
    IF v_sched IS NULL OR jsonb_array_length(v_sched) = 0 THEN
      v_sched := public.default_customer_payment_schedule(v_est.template::text, v_est.total);
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sched) LOOP
    v_n := v_n + 1;
    v_amt := round(COALESCE(v_est.total,0) * (COALESCE((v_item->>'pct')::numeric, 0) / 100.0), 2);
    v_due := v_today + COALESCE((v_item->>'due_offset_days')::int, 0);
    INSERT INTO public.customer_payment_schedules
      (customer_id, project_id, estimate_id, milestone_no, label, pct, amount, due_date)
    VALUES
      (v_est.customer_id, v_est.project_id, _estimate_id, v_n,
       COALESCE(v_item->>'label','Milestone '||v_n),
       COALESCE((v_item->>'pct')::numeric,0),
       v_amt, v_due);
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.customer_payment_schedules
   WHERE estimate_id = _estimate_id ORDER BY milestone_no;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_estimate(uuid, jsonb) TO authenticated, service_role;

-- 4) record_schedule_payment
CREATE OR REPLACE FUNCTION public.record_schedule_payment(
  _schedule_id uuid, _amount numeric, _receipt_no text DEFAULT NULL
)
RETURNS public.customer_payment_schedules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.customer_payment_schedules%ROWTYPE;
BEGIN
  UPDATE public.customer_payment_schedules
     SET paid_amount = LEAST(amount, COALESCE(paid_amount,0) + COALESCE(_amount,0)),
         status = CASE
                    WHEN COALESCE(paid_amount,0) + COALESCE(_amount,0) >= amount THEN 'paid'
                    WHEN COALESCE(paid_amount,0) + COALESCE(_amount,0) > 0       THEN 'partial'
                    ELSE 'pending'
                  END,
         notes = COALESCE(_receipt_no, notes),
         updated_at = now()
   WHERE id = _schedule_id
   RETURNING * INTO v;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule % not found', _schedule_id; END IF;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION public.record_schedule_payment(uuid, numeric, text) TO authenticated, service_role;

-- 5) Dashboard view
CREATE OR REPLACE VIEW public.customer_payment_dashboard AS
SELECT
  s.id,
  s.customer_id,
  c.name  AS customer_name,
  c.customer_code,
  s.project_id,
  p.name  AS project_name,
  s.estimate_id,
  e.estimate_no,
  s.milestone_no,
  s.label,
  s.amount,
  s.paid_amount,
  GREATEST(0, s.amount - COALESCE(s.paid_amount,0))::numeric(14,2) AS balance_due,
  s.due_date,
  s.status,
  s.last_reminder_stage,
  s.last_reminder_at,
  (s.due_date - CURRENT_DATE)::int AS days_to_due,
  CASE
    WHEN s.status = 'paid'                                THEN 'paid'
    WHEN s.due_date IS NULL                               THEN 'unscheduled'
    WHEN s.due_date  <  CURRENT_DATE                      THEN 'overdue'
    WHEN s.due_date  =  CURRENT_DATE                      THEN 'due_today'
    WHEN s.due_date <= (CURRENT_DATE + INTERVAL '7 days') THEN 'due_week'
    ELSE 'upcoming'
  END AS bucket
FROM public.customer_payment_schedules s
LEFT JOIN public.customers c ON c.id = s.customer_id
LEFT JOIN public.projects  p ON p.id = s.project_id
LEFT JOIN public.estimates e ON e.id = s.estimate_id
WHERE s.status <> 'cancelled';
GRANT SELECT ON public.customer_payment_dashboard TO authenticated, service_role;

-- 6) Reminder generator
CREATE OR REPLACE FUNCTION public.generate_customer_payment_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r         record;
  v_stage   text;
  v_days    int;
  v_channel text;
  v_to      text;
  v_body    text;
  v_count   int := 0;
BEGIN
  FOR r IN
    SELECT s.*, c.name AS customer_name, c.primary_email, c.whatsapp, c.primary_phone,
           e.estimate_no, p.name AS project_name
      FROM public.customer_payment_schedules s
      JOIN public.customers c ON c.id = s.customer_id
      LEFT JOIN public.estimates e ON e.id = s.estimate_id
      LEFT JOIN public.projects  p ON p.id = s.project_id
     WHERE s.status IN ('pending','partial')
       AND s.due_date IS NOT NULL
       AND s.amount - COALESCE(s.paid_amount,0) > 0
  LOOP
    v_days  := (r.due_date - CURRENT_DATE);
    v_stage := CASE
                 WHEN v_days =   3 THEN 'T-3'
                 WHEN v_days =   0 THEN 'T-0'
                 WHEN v_days =  -3 THEN 'T+3'
                 WHEN v_days =  -7 THEN 'T+7'
                 WHEN v_days = -14 THEN 'T+14'
                 ELSE NULL
               END;
    CONTINUE WHEN v_stage IS NULL;
    CONTINUE WHEN r.last_reminder_stage IS NOT DISTINCT FROM v_stage;

    v_channel := CASE WHEN COALESCE(r.whatsapp, r.primary_phone) IS NOT NULL
                       THEN 'whatsapp' ELSE 'email' END;
    v_to := CASE WHEN v_channel = 'whatsapp'
                   THEN COALESCE(r.whatsapp, r.primary_phone)
                   ELSE COALESCE(r.primary_email, '') END;
    IF v_to IS NULL OR v_to = '' THEN CONTINUE; END IF;

    v_body := format(
      E'Hello %s,\n\nGentle reminder for milestone "%s" on %s (%s).\nAmount due: %s\nDue date: %s\n\nRef: %s\n— Stone Tech',
      r.customer_name, r.label, COALESCE(r.project_name,'your project'),
      COALESCE(r.estimate_no,'—'),
      to_char(r.amount - COALESCE(r.paid_amount,0), 'FM999,999,990.00'),
      to_char(r.due_date, 'DD Mon YYYY'), COALESCE(r.estimate_no,'—')
    );

    INSERT INTO public.message_queue
      (channel, template_code, to_address, subject, body,
       related_type, related_id, customer_id, status, max_attempts)
    VALUES
      (v_channel::message_channel, 'customer_payment_reminder', v_to,
       CASE WHEN v_channel = 'email' THEN concat('Payment reminder — ', COALESCE(r.estimate_no,'')) ELSE NULL END,
       v_body, 'customer_payment_schedule', r.id, r.customer_id, 'queued', 5);

    UPDATE public.customer_payment_schedules
       SET last_reminder_stage = v_stage, last_reminder_at = now()
     WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.generate_customer_payment_reminders() TO authenticated, service_role;

COMMENT ON TABLE public.customer_payment_schedules IS
  'Contractual customer payment milestones materialised on estimate approval. Reused by dashboards + reminder cron.';