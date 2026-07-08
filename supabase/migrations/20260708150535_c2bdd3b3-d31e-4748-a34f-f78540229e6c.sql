
-- ============================================================================
-- Phase 1: Backend automation for operational milestones + stage recommendations
-- Backward compatible: no existing table, trigger, or function is altered.
-- ============================================================================

-- 1. project_milestones ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id),
  source text NOT NULL DEFAULT 'auto',          -- 'auto' | 'manual'
  source_ref_type text,
  source_ref_id uuid,
  notes text,
  is_manual_override boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_milestones_key_uq UNIQUE (project_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS project_milestones_project_idx
  ON public.project_milestones(project_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS project_milestones_demo_idx
  ON public.project_milestones(is_demo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm read staff" ON public.project_milestones
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));

-- Manual writes: admins only. Automatic writes go through SECURITY DEFINER trigger
-- functions and bypass this check.
CREATE POLICY "pm write admin" ON public.project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pm update admin" ON public.project_milestones
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pm delete admin" ON public.project_milestones
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- demo isolation
ALTER TABLE public.project_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY "pm demo isolation" ON public.project_milestones
  AS RESTRICTIVE TO authenticated
  USING (is_demo = public.current_demo_mode())
  WITH CHECK (is_demo = public.current_demo_mode());

CREATE TRIGGER trg_pm_set_demo BEFORE INSERT ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_pm_touch BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. stage_recommendations ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stage_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  suggested_stage public.lead_stage NOT NULL,
  reason text NOT NULL,
  source_event text NOT NULL,
  source_ref_type text,
  source_ref_id uuid,
  status text NOT NULL DEFAULT 'pending',      -- pending | accepted | rejected
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sr_status_check CHECK (status IN ('pending','accepted','rejected')),
  CONSTRAINT sr_dedupe_uq UNIQUE (enquiry_id, source_event, source_ref_id)
);

CREATE INDEX IF NOT EXISTS sr_enquiry_idx
  ON public.stage_recommendations(enquiry_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS sr_demo_idx
  ON public.stage_recommendations(is_demo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_recommendations TO authenticated;
GRANT ALL ON public.stage_recommendations TO service_role;

ALTER TABLE public.stage_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr read staff" ON public.stage_recommendations
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "sr update staff" ON public.stage_recommendations
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
-- No direct INSERT/DELETE from clients — only trigger helpers create rows,
-- admins may clean up via service role if needed.

ALTER TABLE public.stage_recommendations FORCE ROW LEVEL SECURITY;
CREATE POLICY "sr demo isolation" ON public.stage_recommendations
  AS RESTRICTIVE TO authenticated
  USING (is_demo = public.current_demo_mode())
  WITH CHECK (is_demo = public.current_demo_mode());

CREATE TRIGGER trg_sr_set_demo BEFORE INSERT ON public.stage_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_sr_touch BEFORE UPDATE ON public.stage_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. activity_log dedupe_key -------------------------------------------------
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS activity_log_dedupe_uq
  ON public.activity_log(dedupe_key) WHERE dedupe_key IS NOT NULL;


-- 4. helper functions --------------------------------------------------------

-- Insert-or-ignore milestone + emit a human-readable activity_log entry.
CREATE OR REPLACE FUNCTION public.record_project_milestone(
  _project_id uuid,
  _milestone_key text,
  _completed_at timestamptz,
  _source_ref_type text,
  _source_ref_id uuid,
  _summary text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dedupe text;
BEGIN
  IF _project_id IS NULL OR _milestone_key IS NULL THEN RETURN; END IF;

  INSERT INTO public.project_milestones (
    project_id, milestone_key, completed_at, completed_by,
    source, source_ref_type, source_ref_id
  ) VALUES (
    _project_id, _milestone_key, COALESCE(_completed_at, now()), auth.uid(),
    'auto', _source_ref_type, _source_ref_id
  )
  ON CONFLICT (project_id, milestone_key) DO NOTHING;

  v_dedupe := 'milestone:' || _project_id::text || ':' || _milestone_key
              || ':' || COALESCE(_source_ref_id::text, '_');
  INSERT INTO public.activity_log (
    entity_type, entity_id, project_id, action, field_name,
    new_value, summary, actor_id, dedupe_key
  ) VALUES (
    'project_milestone', _project_id, _project_id, 'update', _milestone_key,
    to_jsonb(_completed_at), _summary, auth.uid(), v_dedupe
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END $$;

-- Insert-or-ignore stage recommendation + activity_log entry.
CREATE OR REPLACE FUNCTION public.suggest_stage(
  _enquiry_id uuid,
  _project_id uuid,
  _suggested public.lead_stage,
  _reason text,
  _source_event text,
  _source_ref_type text,
  _source_ref_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dedupe text; v_current public.lead_stage;
BEGIN
  IF _enquiry_id IS NULL OR _suggested IS NULL THEN RETURN; END IF;
  SELECT stage INTO v_current FROM public.enquiries WHERE id = _enquiry_id;
  -- Don't suggest a stage the enquiry is already on or past terminal states.
  IF v_current = _suggested OR v_current IN ('lost','cancelled','completed') THEN
    RETURN;
  END IF;

  INSERT INTO public.stage_recommendations (
    enquiry_id, project_id, suggested_stage, reason,
    source_event, source_ref_type, source_ref_id
  ) VALUES (
    _enquiry_id, _project_id, _suggested, _reason,
    _source_event, _source_ref_type, _source_ref_id
  )
  ON CONFLICT (enquiry_id, source_event, source_ref_id) DO NOTHING;

  v_dedupe := 'suggest:' || _enquiry_id::text || ':' || _source_event
              || ':' || COALESCE(_source_ref_id::text, '_');
  INSERT INTO public.activity_log (
    entity_type, entity_id, project_id, action, field_name,
    new_value, summary, actor_id, dedupe_key
  ) VALUES (
    'enquiry', _enquiry_id, _project_id, 'update', 'stage_suggestion',
    to_jsonb(_suggested::text),
    'Suggested next stage: ' || _suggested::text || ' — ' || _reason,
    auth.uid(), v_dedupe
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END $$;

-- Fan-out recommendation to every open enquiry on a project.
CREATE OR REPLACE FUNCTION public.suggest_stage_for_project(
  _project_id uuid,
  _suggested public.lead_stage,
  _reason text,
  _source_event text,
  _source_ref_type text,
  _source_ref_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF _project_id IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT id FROM public.enquiries
     WHERE project_id = _project_id
       AND stage NOT IN ('lost','cancelled','completed')
  LOOP
    PERFORM public.suggest_stage(
      r.id, _project_id, _suggested, _reason,
      _source_event, _source_ref_type, _source_ref_id
    );
  END LOOP;
END $$;


-- 5. Trigger functions -------------------------------------------------------

-- site_visits
CREATE OR REPLACE FUNCTION public.trg_sv_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_project_milestone(
      NEW.project_id, 'site_visit_scheduled',
      COALESCE(NEW.scheduled_at, NEW.created_at, now()),
      'site_visit', NEW.id,
      'Site visit scheduled'
    );
    PERFORM public.suggest_stage_for_project(
      NEW.project_id, 'site_visit_scheduled'::public.lead_stage,
      'Site visit was scheduled', 'site_visit_created', 'site_visit', NEW.id
    );
  END IF;
  IF (TG_OP = 'INSERT' AND NEW.conducted_at IS NOT NULL)
     OR (TG_OP = 'UPDATE'
         AND (NEW.conducted_at IS DISTINCT FROM OLD.conducted_at
              OR NEW.status IS DISTINCT FROM OLD.status)
         AND (NEW.conducted_at IS NOT NULL OR NEW.status = 'completed'::public.site_visit_status)) THEN
    PERFORM public.record_project_milestone(
      NEW.project_id, 'site_visit_completed',
      COALESCE(NEW.conducted_at, now()),
      'site_visit', NEW.id,
      'Site visit completed'
    );
    PERFORM public.suggest_stage_for_project(
      NEW.project_id, 'site_visit_completed'::public.lead_stage,
      'Site visit completed', 'site_visit_completed', 'site_visit', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sv_milestone ON public.site_visits;
CREATE TRIGGER trg_sv_milestone AFTER INSERT OR UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_sv_milestone();

-- rfqs
CREATE OR REPLACE FUNCTION public.trg_rfq_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_project_milestone(
    NEW.project_id, 'rfq_sent',
    COALESCE(NEW.created_at, now()),
    'rfq', NEW.id,
    'RFQ ' || COALESCE(NEW.rfq_no, '') || ' created'
  );
  IF NEW.enquiry_id IS NOT NULL THEN
    PERFORM public.suggest_stage(
      NEW.enquiry_id, NEW.project_id, 'rfq_sent'::public.lead_stage,
      'RFQ ' || COALESCE(NEW.rfq_no, '') || ' created',
      'rfq_created', 'rfq', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rfq_milestone ON public.rfqs;
CREATE TRIGGER trg_rfq_milestone AFTER INSERT ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.trg_rfq_milestone();

-- vendor_quotes approval
CREATE OR REPLACE FUNCTION public.trg_vq_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rfq public.rfqs%ROWTYPE;
BEGIN
  IF NEW.is_approved IS DISTINCT FROM COALESCE(OLD.is_approved, false)
     AND NEW.is_approved = true THEN
    SELECT r.* INTO v_rfq
      FROM public.rfqs r
      JOIN public.vendor_requests vr ON vr.rfq_id = r.id
     WHERE vr.id = NEW.vendor_request_id;
    IF v_rfq.project_id IS NOT NULL THEN
      PERFORM public.record_project_milestone(
        v_rfq.project_id, 'vendor_approved',
        now(), 'vendor_quote', NEW.id,
        'Vendor quote approved'
      );
      IF v_rfq.enquiry_id IS NOT NULL THEN
        PERFORM public.suggest_stage(
          v_rfq.enquiry_id, v_rfq.project_id, 'vendor_approved'::public.lead_stage,
          'Vendor quote approved',
          'vendor_approved', 'vendor_quote', NEW.id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vq_milestone ON public.vendor_quotes;
CREATE TRIGGER trg_vq_milestone AFTER INSERT OR UPDATE ON public.vendor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_vq_milestone();

-- production_orders
CREATE OR REPLACE FUNCTION public.trg_prod_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    PERFORM public.record_project_milestone(
      NEW.project_id, 'production_started',
      COALESCE(NEW.created_at, now()),
      'production_order', NEW.id,
      'Production order created'
    );
    PERFORM public.suggest_stage_for_project(
      NEW.project_id, 'production'::public.lead_stage,
      'Production started', 'production_created', 'production_order', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prod_milestone ON public.production_orders;
CREATE TRIGGER trg_prod_milestone AFTER INSERT ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_prod_milestone();

-- dispatches
CREATE OR REPLACE FUNCTION public.trg_dispatch_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid;
BEGIN
  -- dispatches.project_id may or may not exist; fall back to sales_order.
  BEGIN
    EXECUTE format('SELECT ($1).project_id') INTO v_project USING NEW;
  EXCEPTION WHEN undefined_column THEN v_project := NULL;
  END;
  IF v_project IS NULL THEN
    SELECT so.project_id INTO v_project
      FROM public.sales_orders so WHERE so.id = NEW.sales_order_id;
  END IF;
  IF v_project IS NOT NULL THEN
    PERFORM public.record_project_milestone(
      v_project, 'dispatch_created',
      COALESCE(NEW.created_at, now()),
      'dispatch', NEW.id,
      'Dispatch ' || COALESCE(NEW.dispatch_no, '') || ' created'
    );
    PERFORM public.suggest_stage_for_project(
      v_project, 'dispatch'::public.lead_stage,
      'Dispatch created', 'dispatch_created', 'dispatch', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_milestone ON public.dispatches;
CREATE TRIGGER trg_dispatch_milestone AFTER INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_milestone();

-- installations completion
CREATE OR REPLACE FUNCTION public.trg_install_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('completed','signed_off')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.project_id IS NOT NULL THEN
    PERFORM public.record_project_milestone(
      NEW.project_id, 'installation_completed',
      COALESCE(NEW.actual_end_date::timestamptz, now()),
      'installation', NEW.id,
      'Installation ' || COALESCE(NEW.installation_no, '') || ' completed'
    );
    PERFORM public.suggest_stage_for_project(
      NEW.project_id, 'completed'::public.lead_stage,
      'Installation completed', 'installation_completed', 'installation', NEW.id
    );
    IF NEW.status = 'signed_off' THEN
      PERFORM public.record_project_milestone(
        NEW.project_id, 'handover_completed',
        now(), 'installation', NEW.id,
        'Handover signed off'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_install_milestone ON public.installations;
CREATE TRIGGER trg_install_milestone AFTER INSERT OR UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.trg_install_milestone();

-- quotes -> sent
CREATE OR REPLACE FUNCTION public.trg_quote_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'sent'::public.quote_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.project_id IS NOT NULL THEN
    PERFORM public.record_project_milestone(
      NEW.project_id, 'quotation_sent',
      COALESCE(NEW.updated_at, now()),
      'quote', NEW.id,
      'Quotation ' || COALESCE(NEW.quote_no, '') || ' sent'
    );
    IF NEW.enquiry_id IS NOT NULL THEN
      PERFORM public.suggest_stage(
        NEW.enquiry_id, NEW.project_id,
        'customer_quotation_sent'::public.lead_stage,
        'Quote ' || COALESCE(NEW.quote_no, '') || ' sent to customer',
        'quote_sent', 'quote', NEW.id
      );
    ELSE
      PERFORM public.suggest_stage_for_project(
        NEW.project_id, 'customer_quotation_sent'::public.lead_stage,
        'Quote ' || COALESCE(NEW.quote_no, '') || ' sent',
        'quote_sent', 'quote', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_quote_milestone ON public.quotes;
CREATE TRIGGER trg_quote_milestone AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_quote_milestone();

-- receipts -> advance received (only when linked to a customer with an open enquiry)
CREATE OR REPLACE FUNCTION public.trg_receipt_advance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.amount = NEW.amount THEN
    RETURN NEW; -- nothing meaningful changed
  END IF;

  FOR r IN
    SELECT DISTINCT e.id AS enquiry_id, e.project_id
      FROM public.enquiries e
     WHERE e.customer_id = NEW.customer_id
       AND e.stage NOT IN ('lost','cancelled','completed')
  LOOP
    PERFORM public.suggest_stage(
      r.enquiry_id, r.project_id, 'customer_approved'::public.lead_stage,
      'Payment received: ' || NEW.amount::text || ' ' || NEW.currency_code,
      'receipt_confirmed', 'receipt', NEW.id
    );
    IF r.project_id IS NOT NULL THEN
      PERFORM public.record_project_milestone(
        r.project_id, 'advance_received',
        COALESCE(NEW.received_at::timestamptz, now()),
        'receipt', NEW.id,
        'Advance received (receipt ' || COALESCE(NEW.receipt_no, '') || ')'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_receipt_advance ON public.receipts;
CREATE TRIGGER trg_receipt_advance AFTER INSERT OR UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.trg_receipt_advance();
