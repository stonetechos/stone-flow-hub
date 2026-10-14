-- Fix: record_project_milestone and suggest_stage used ON CONFLICT (dedupe_key)
-- but the unique index on activity_log (activity_log_dedupe_uq) was created with
-- a partial index predicate WHERE dedupe_key IS NOT NULL.
-- PostgreSQL requires the ON CONFLICT specification to match the partial index's WHERE clause,
-- otherwise it throws error 42P10 ("there is no unique or exclusion constraint matching the ON CONFLICT specification").

-- 1. Create a non-partial unique index on dedupe_key so any ON CONFLICT (dedupe_key) always matches.
-- In PostgreSQL, standard UNIQUE indexes allow multiple NULLs natively.
CREATE UNIQUE INDEX IF NOT EXISTS activity_log_dedupe_key_full_idx
  ON public.activity_log (dedupe_key);

-- 2. Update record_project_milestone to include WHERE dedupe_key IS NOT NULL
-- and wrap in EXCEPTION handler so milestone logging never aborts user workflows.
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

  BEGIN
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
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Milestone logging failure must never abort business operations
    NULL;
  END;
END $$;

-- 3. Update suggest_stage to include WHERE dedupe_key IS NOT NULL and wrap in EXCEPTION handler.
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
  IF v_current = _suggested OR v_current IN ('lost','cancelled','completed') THEN
    RETURN;
  END IF;

  BEGIN
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
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Stage suggestion failure must never abort business operations
    NULL;
  END;
END $$;

-- 4. Guard trg_quote_milestone so quote status updates never fail due to milestone logging
CREATE OR REPLACE FUNCTION public.trg_quote_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;
