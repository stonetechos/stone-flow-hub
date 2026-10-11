-- Migration: 20261011172000_fix_activity_action_update_enum.sql
-- Fixes trigger error when creating dispatches: invalid input value for enum activity_action: "update"

-- 1. Ensure 'update' is added to activity_action enum if not present
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'update';

-- 2. Update record_project_milestone to use 'updated'::public.activity_action
CREATE OR REPLACE FUNCTION public.record_project_milestone(
  _project_id uuid,
  _milestone_key text,
  _completed_at timestamptz DEFAULT now(),
  _source_ref_type text DEFAULT NULL,
  _source_ref_id uuid DEFAULT NULL,
  _summary text DEFAULT NULL
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
    'project_milestone', _project_id, _project_id, 'updated'::public.activity_action, _milestone_key,
    to_jsonb(_completed_at), _summary, auth.uid(), v_dedupe
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END $$;

-- 3. Update suggest_stage to use 'updated'::public.activity_action
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
    'enquiry', _enquiry_id, _project_id, 'updated'::public.activity_action, 'stage_suggestion',
    to_jsonb(_suggested::text),
    'Suggested next stage: ' || _suggested::text || ' — ' || _reason,
    auth.uid(), v_dedupe
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END $$;

-- 4. Guard trg_dispatch_milestone so milestone logging failures never abort dispatch creation
CREATE OR REPLACE FUNCTION public.trg_dispatch_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid;
BEGIN
  BEGIN
    EXECUTE format('SELECT ($1).project_id') INTO v_project USING NEW;
  EXCEPTION WHEN undefined_column THEN v_project := NULL;
  END;
  IF v_project IS NULL THEN
    SELECT so.project_id INTO v_project
      FROM public.sales_orders so WHERE so.id = NEW.sales_order_id;
  END IF;
  IF v_project IS NOT NULL THEN
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'trg_dispatch_milestone milestone recording skipped: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
