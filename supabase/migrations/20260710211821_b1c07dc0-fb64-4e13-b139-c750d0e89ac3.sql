
CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','intern','consultant');
CREATE TYPE public.employment_status AS ENUM ('active','on_leave','notice','terminated','resigned');
CREATE TYPE public.workforce_task_status AS ENUM ('pending','in_progress','completed','deferred','cancelled');
CREATE TYPE public.workforce_task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.kra_period AS ENUM ('daily','weekly','monthly','quarterly');
CREATE TYPE public.performance_grade AS ENUM ('a_plus','a','b','c','needs_attention');
CREATE TYPE public.owner_note_kind AS ENUM ('strength','improvement','observation');

CREATE OR REPLACE FUNCTION public.workforce_is_owner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR public.has_role(_uid, 'sales_manager');
$$;

-- designations
CREATE TABLE public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  purpose text,
  responsibilities text,
  expected_outcomes text,
  level integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.designations TO authenticated;
GRANT ALL ON public.designations TO service_role;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "designations read" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "designations owner write" ON public.designations FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_designations_updated BEFORE UPDATE ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL UNIQUE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  photo_url text,
  designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL,
  department text,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  reporting_manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  joining_date date,
  phone text,
  email text,
  emergency_contact text,
  address text,
  aadhaar text,
  pan text,
  bank_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  salary_ctc numeric(14,2),
  skills text[] NOT NULL DEFAULT '{}'::text[],
  employment_status public.employment_status NOT NULL DEFAULT 'active',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_employees_designation ON public.employees(designation_id);
CREATE INDEX idx_employees_manager ON public.employees(reporting_manager_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees self read" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.workforce_is_owner(auth.uid()));
CREATE POLICY "employees owner write" ON public.employees FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE VIEW public.employees_sensitive AS
  SELECT e.id, e.employee_code, e.full_name, e.aadhaar, e.pan, e.bank_details, e.salary_ctc
  FROM public.employees e
  WHERE public.workforce_is_owner(auth.uid());
GRANT SELECT ON public.employees_sensitive TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.employee_code_seq START 1001;
CREATE OR REPLACE FUNCTION public.set_employee_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := 'EMP-' || lpad(nextval('public.employee_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_employee_code BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_employee_code();

-- employee_documents
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_object_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  doc_type text NOT NULL,
  title text,
  notes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_emp_docs_employee ON public.employee_documents(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_docs self read" ON public.employee_documents FOR SELECT TO authenticated
  USING (
    public.workforce_is_owner(auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "emp_docs owner write" ON public.employee_documents FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_emp_docs_updated BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- kras
CREATE TABLE public.kras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation_id uuid NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weightage numeric(5,2) NOT NULL DEFAULT 1.0 CHECK (weightage >= 0),
  target_value numeric(12,2) NOT NULL DEFAULT 0,
  target_period public.kra_period NOT NULL DEFAULT 'monthly',
  metric_source text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kras_designation ON public.kras(designation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kras TO authenticated;
GRANT ALL ON public.kras TO service_role;
ALTER TABLE public.kras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kras read" ON public.kras FOR SELECT TO authenticated USING (true);
CREATE POLICY "kras owner write" ON public.kras FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_kras_updated BEFORE UPDATE ON public.kras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workload_capacities
CREATE TABLE public.workload_capacities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation_id uuid NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_label text NOT NULL,
  ideal_capacity numeric(10,2) NOT NULL DEFAULT 0,
  maximum_capacity numeric(10,2) NOT NULL DEFAULT 0,
  overload_threshold numeric(10,2) NOT NULL DEFAULT 0,
  period public.kra_period NOT NULL DEFAULT 'daily',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (designation_id, metric_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workload_capacities TO authenticated;
GRANT ALL ON public.workload_capacities TO service_role;
ALTER TABLE public.workload_capacities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wlcap read" ON public.workload_capacities FOR SELECT TO authenticated USING (true);
CREATE POLICY "wlcap owner write" ON public.workload_capacities FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_wlcap_updated BEFORE UPDATE ON public.workload_capacities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workforce_rule_assignments
CREATE TABLE public.workforce_rule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL,
  fallback_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_rule_assignments TO authenticated;
GRANT ALL ON public.workforce_rule_assignments TO service_role;
ALTER TABLE public.workforce_rule_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rasn read" ON public.workforce_rule_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "rasn owner write" ON public.workforce_rule_assignments FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_rasn_updated BEFORE UPDATE ON public.workforce_rule_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workforce_tasks
CREATE TABLE public.workforce_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority public.workforce_task_priority NOT NULL DEFAULT 'medium',
  due_at timestamptz,
  estimated_minutes integer,
  status public.workforce_task_status NOT NULL DEFAULT 'pending',
  source_type text,
  source_id uuid,
  source_deep_link text,
  rule_key text,
  dedup_key text NOT NULL UNIQUE,
  auto_generated boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  deferred_until date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_tasks_employee_status ON public.workforce_tasks(employee_id, status);
CREATE INDEX idx_wf_tasks_due ON public.workforce_tasks(due_at);
CREATE INDEX idx_wf_tasks_source ON public.workforce_tasks(source_type, source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_tasks TO authenticated;
GRANT ALL ON public.workforce_tasks TO service_role;
ALTER TABLE public.workforce_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wftasks self read" ON public.workforce_tasks FOR SELECT TO authenticated
  USING (
    public.workforce_is_owner(auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "wftasks self update" ON public.workforce_tasks FOR UPDATE TO authenticated
  USING (
    public.workforce_is_owner(auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    public.workforce_is_owner(auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "wftasks owner insert" ON public.workforce_tasks FOR INSERT TO authenticated
  WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE POLICY "wftasks owner delete" ON public.workforce_tasks FOR DELETE TO authenticated
  USING (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_wftasks_updated BEFORE UPDATE ON public.workforce_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workforce_score_snapshots
CREATE TABLE public.workforce_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kra_id uuid REFERENCES public.kras(id) ON DELETE SET NULL,
  kra_name text NOT NULL,
  period public.kra_period NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target numeric(12,2) NOT NULL DEFAULT 0,
  achieved numeric(12,2) NOT NULL DEFAULT 0,
  pct numeric(6,2) NOT NULL DEFAULT 0,
  weight numeric(6,2) NOT NULL DEFAULT 1,
  weighted_score numeric(8,2) NOT NULL DEFAULT 0,
  overall_pct numeric(6,2),
  grade public.performance_grade,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, kra_id, period_start, period_end)
);
CREATE INDEX idx_wf_snap_employee ON public.workforce_score_snapshots(employee_id, period_end DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_score_snapshots TO authenticated;
GRANT ALL ON public.workforce_score_snapshots TO service_role;
ALTER TABLE public.workforce_score_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wfsnap self read" ON public.workforce_score_snapshots FOR SELECT TO authenticated
  USING (
    public.workforce_is_owner(auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "wfsnap owner write" ON public.workforce_score_snapshots FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));

-- owner_notes
CREATE TABLE public.owner_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind public.owner_note_kind NOT NULL,
  title text NOT NULL,
  body text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_owner_notes_employee ON public.owner_notes(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_notes TO authenticated;
GRANT ALL ON public.owner_notes TO service_role;
ALTER TABLE public.owner_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onotes owner only" ON public.owner_notes FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid())) WITH CHECK (public.workforce_is_owner(auth.uid()));
CREATE TRIGGER trg_onotes_updated BEFORE UPDATE ON public.owner_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED designations
INSERT INTO public.designations (code, name, purpose, responsibilities, expected_outcomes, level) VALUES
  ('MD','Managing Director','Overall business leadership','Strategy, growth, key relationships','Revenue growth and profitability',100),
  ('OPS_DIR','Operations Director','Own end-to-end operations','Procurement, inventory, dispatch, installation','Smooth site execution and vendor performance',80),
  ('OPS_COORD','Operations Coordinator','Coordinate ERP-driven daily operations','ERP entries, quotations, SO, DC, statements, reminders','Accurate ERP and on-time coordination',60),
  ('OPS_SUP_EXEC','Operations Support Executive','Field support and coordination','Cash collections, transport, site supervision, vendor follow-up','Reliable field execution',40),
  ('OFF_SUP_EXEC','Office Support Executive','Office and showroom support','Showroom, samples, courier, banking, hospitality','Well-run office and showroom',20);

INSERT INTO public.kras (designation_id, name, weightage, target_value, target_period, metric_source, sort_order)
SELECT d.id, k.name, k.weight, k.target, k.period::public.kra_period, k.metric, k.ord
FROM public.designations d
JOIN (VALUES
  ('MD','Revenue Growth',25,1000000,'monthly','revenue_growth',1),
  ('MD','Business Development',15,10,'monthly','new_customers',2),
  ('MD','Architect Relationships',10,5,'monthly','architect_meetings',3),
  ('MD','Vendor Negotiations',15,3,'monthly','vendor_negotiations',4),
  ('MD','Strategic Planning',15,1,'monthly','strategy_reviews',5),
  ('MD','Profitability',20,15,'monthly','gross_margin_pct',6),
  ('OPS_DIR','Procurement',20,20,'monthly','po_completed',1),
  ('OPS_DIR','Inventory',15,95,'monthly','inventory_accuracy_pct',2),
  ('OPS_DIR','Vendor Management',15,10,'monthly','vendor_reviews',3),
  ('OPS_DIR','Dispatch Planning',20,25,'monthly','dispatches_completed',4),
  ('OPS_DIR','Installation Coordination',15,10,'monthly','installations_completed',5),
  ('OPS_DIR','Site Execution',15,10,'monthly','site_visits_completed',6),
  ('OPS_COORD','ERP Accuracy',10,98,'monthly','erp_accuracy_pct',1),
  ('OPS_COORD','Customer Entries',10,300,'monthly','customers_created',2),
  ('OPS_COORD','Enquiry Entries',10,200,'monthly','enquiries_created',3),
  ('OPS_COORD','Quotations',15,160,'monthly','quotations_created',4),
  ('OPS_COORD','Sales Orders',15,50,'monthly','sales_orders_processed',5),
  ('OPS_COORD','Delivery Challans',10,120,'monthly','dispatches_prepared',6),
  ('OPS_COORD','Customer Statements',10,80,'monthly','statements_sent',7),
  ('OPS_COORD','Reminder Calls',10,600,'monthly','reminder_calls',8),
  ('OPS_COORD','Logistics Coordination',10,40,'monthly','transport_booked',9),
  ('OPS_SUP_EXEC','Cash Collections',20,20,'monthly','cash_collections',1),
  ('OPS_SUP_EXEC','Transport Coordination',15,40,'monthly','transport_booked',2),
  ('OPS_SUP_EXEC','Site Supervision',15,20,'monthly','site_visits_completed',3),
  ('OPS_SUP_EXEC','Customer Coordination',10,30,'monthly','customer_touchpoints',4),
  ('OPS_SUP_EXEC','Material Tracking',10,50,'monthly','material_moves',5),
  ('OPS_SUP_EXEC','Dispatch Assistance',10,25,'monthly','dispatches_assisted',6),
  ('OPS_SUP_EXEC','Vendor Follow-up',10,25,'monthly','vendor_followups',7),
  ('OPS_SUP_EXEC','Emergency Support',10,5,'monthly','emergency_response',8),
  ('OFF_SUP_EXEC','Showroom Readiness',20,22,'monthly','showroom_checks',1),
  ('OFF_SUP_EXEC','Sample Packing',15,40,'monthly','samples_packed',2),
  ('OFF_SUP_EXEC','Courier',10,25,'monthly','couriers_sent',3),
  ('OFF_SUP_EXEC','Banking',15,15,'monthly','bank_visits',4),
  ('OFF_SUP_EXEC','Hospitality',10,30,'monthly','guest_hospitality',5),
  ('OFF_SUP_EXEC','Local Purchases',10,20,'monthly','local_purchases',6),
  ('OFF_SUP_EXEC','Material Handling',10,40,'monthly','material_handling',7),
  ('OFF_SUP_EXEC','Stock Assistance',10,20,'monthly','stock_assistance',8)
) AS k(code,name,weight,target,period,metric,ord) ON k.code = d.code;

INSERT INTO public.workload_capacities (designation_id, metric_key, metric_label, ideal_capacity, maximum_capacity, overload_threshold, period)
SELECT d.id, c.mk, c.ml, c.ideal, c.max, c.overload, 'daily'::public.kra_period
FROM public.designations d
JOIN (VALUES
  ('OPS_COORD','customer_entries','Customer Entries',15,22,18),
  ('OPS_COORD','enquiries','Enquiries',10,15,12),
  ('OPS_COORD','quotations','Quotations',8,12,10),
  ('OPS_COORD','transport_bookings','Transport Bookings',12,18,15),
  ('OPS_COORD','statements','Statements',20,30,25),
  ('OPS_COORD','reminder_calls','Reminder Calls',30,45,38),
  ('OPS_SUP_EXEC','cash_collections','Cash Collections',5,8,6),
  ('OPS_SUP_EXEC','site_visits','Site Visits',3,5,4),
  ('OPS_SUP_EXEC','transport_coord','Transport Coordination',6,10,8),
  ('OFF_SUP_EXEC','sample_packing','Sample Packing',10,15,12),
  ('OFF_SUP_EXEC','courier','Courier',6,10,8),
  ('OFF_SUP_EXEC','bank_visits','Bank Visits',2,4,3)
) AS c(code,mk,ml,ideal,max,overload) ON c.code = d.code;

INSERT INTO public.workforce_rule_assignments (rule_key, designation_id, notes)
SELECT r.rk, d.id, r.note FROM public.designations d
JOIN (VALUES
  ('pending_quotation','OPS_COORD','Quotation pending on active enquiry'),
  ('outstanding_payment','OPS_COORD','Overdue customer payment reminder'),
  ('statement_pending','OPS_COORD','Customer statement due'),
  ('transport_pending','OPS_COORD','Transport not yet booked'),
  ('dispatch_pending','OPS_DIR','Delivery challan ready for dispatch'),
  ('vendor_confirmation','OPS_DIR','Purchase order awaiting vendor confirmation'),
  ('site_visit_due','OPS_SUP_EXEC','Scheduled site visit'),
  ('installation_pending','OPS_DIR','Installation to be scheduled'),
  ('grn_pending','OPS_DIR','GRN awaited against PO'),
  ('cash_collection','OPS_SUP_EXEC','Cash collection on delivery')
) AS r(rk,dc,note) ON r.dc = d.code;

-- Hybrid rule engine helpers
CREATE OR REPLACE FUNCTION public.workforce_upsert_task(
  _rule_key text, _source_type text, _source_id uuid,
  _title text, _priority public.workforce_task_priority,
  _due timestamptz, _deep_link text, _description text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _dedup text := _rule_key || ':' || coalesce(_source_id::text, gen_random_uuid()::text);
  _designation_id uuid;
  _employee_id uuid;
BEGIN
  SELECT ra.designation_id, ra.fallback_employee_id
    INTO _designation_id, _employee_id
    FROM public.workforce_rule_assignments ra
    WHERE ra.rule_key = _rule_key AND ra.active LIMIT 1;

  IF _employee_id IS NULL AND _designation_id IS NOT NULL THEN
    SELECT id INTO _employee_id FROM public.employees
     WHERE designation_id = _designation_id AND employment_status = 'active'
     ORDER BY created_at LIMIT 1;
  END IF;

  INSERT INTO public.workforce_tasks
    (employee_id, designation_id, title, description, priority, due_at, status,
     source_type, source_id, source_deep_link, rule_key, dedup_key, auto_generated)
  VALUES
    (_employee_id, _designation_id, _title, _description, _priority, _due, 'pending',
     _source_type, _source_id, _deep_link, _rule_key, _dedup, true)
  ON CONFLICT (dedup_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    due_at = EXCLUDED.due_at,
    source_deep_link = EXCLUDED.source_deep_link,
    updated_at = now(),
    status = CASE WHEN public.workforce_tasks.status = 'completed'
                  THEN public.workforce_tasks.status
                  ELSE 'pending' END;
END $$;

CREATE OR REPLACE FUNCTION public.workforce_close_task(_rule_key text, _source_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.workforce_tasks
     SET status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
   WHERE rule_key = _rule_key AND source_id = _source_id AND status <> 'completed';
$$;

CREATE OR REPLACE FUNCTION public.trg_wf_enquiry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.stage IS DISTINCT FROM OLD.stage) THEN
    IF NEW.stage::text IN ('estimation','quote','new','contacted','qualified','proposal') THEN
      PERFORM public.workforce_upsert_task('pending_quotation','enquiry', NEW.id,
        'Prepare quotation for enquiry', 'high'::public.workforce_task_priority,
        now() + interval '2 days',
        '/enquiries/' || NEW.id, coalesce(NEW.requirement,''));
    ELSE
      PERFORM public.workforce_close_task('pending_quotation', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_enquiry AFTER INSERT OR UPDATE OF stage ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_enquiry();

CREATE OR REPLACE FUNCTION public.trg_wf_po() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status::text IN ('draft','sent','pending','issued','acknowledged') THEN
      PERFORM public.workforce_upsert_task('vendor_confirmation','purchase_order', NEW.id,
        'Follow up vendor for PO confirmation','high'::public.workforce_task_priority,
        now() + interval '1 day',
        '/purchase-orders/' || NEW.id, NULL);
    ELSE
      PERFORM public.workforce_close_task('vendor_confirmation', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_po AFTER INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_po();

CREATE OR REPLACE FUNCTION public.trg_wf_dispatch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status::text IN ('draft','scheduled','ready','in_transit','planned') THEN
      PERFORM public.workforce_upsert_task('dispatch_pending','dispatch', NEW.id,
        'Prepare / complete delivery','high'::public.workforce_task_priority,
        now() + interval '1 day',
        '/dispatch/' || NEW.id, NULL);
    ELSE
      PERFORM public.workforce_close_task('dispatch_pending', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_dispatch AFTER INSERT OR UPDATE OF status ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_dispatch();

CREATE OR REPLACE FUNCTION public.trg_wf_site_visit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _due timestamptz;
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status::text IN ('scheduled','pending','planned') THEN
      BEGIN _due := (to_jsonb(NEW) ->> 'scheduled_date')::timestamptz; EXCEPTION WHEN OTHERS THEN _due := now() + interval '1 day'; END;
      PERFORM public.workforce_upsert_task('site_visit_due','site_visit', NEW.id,
        'Conduct scheduled site visit','medium'::public.workforce_task_priority,
        _due, '/site-visits/' || NEW.id, NULL);
    ELSE
      PERFORM public.workforce_close_task('site_visit_due', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_site_visit AFTER INSERT OR UPDATE OF status ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_site_visit();

CREATE OR REPLACE FUNCTION public.trg_wf_payment_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.due_date IS DISTINCT FROM OLD.due_date) THEN
    IF NEW.status::text IN ('pending','partial','overdue','scheduled') THEN
      PERFORM public.workforce_upsert_task('outstanding_payment','payment_schedule', NEW.id,
        'Follow up customer payment','high'::public.workforce_task_priority,
        NEW.due_date::timestamptz,
        '/receipts?schedule=' || NEW.id, NULL);
    ELSE
      PERFORM public.workforce_close_task('outstanding_payment', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_payment_schedule AFTER INSERT OR UPDATE ON public.customer_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_payment_schedule();

CREATE OR REPLACE FUNCTION public.trg_wf_installation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _due timestamptz;
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status::text IN ('pending','scheduled','in_progress','planned') THEN
      BEGIN _due := (to_jsonb(NEW) ->> 'scheduled_date')::timestamptz; EXCEPTION WHEN OTHERS THEN _due := now() + interval '1 day'; END;
      PERFORM public.workforce_upsert_task('installation_pending','installation', NEW.id,
        'Coordinate installation','medium'::public.workforce_task_priority,
        _due, '/installations/' || NEW.id, NULL);
    ELSE
      PERFORM public.workforce_close_task('installation_pending', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wf_installation AFTER INSERT OR UPDATE OF status ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.trg_wf_installation();
