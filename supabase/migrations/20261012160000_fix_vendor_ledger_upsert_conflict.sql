-- Fix: vendor_ledger_upsert used ON CONFLICT (source_type, source_id) but the
-- unique index (vle_source_uk) is a PARTIAL index with WHERE source_id IS NOT NULL.
-- PostgreSQL requires the ON CONFLICT predicate to exactly match the partial index's
-- WHERE clause when targeting a partial index.

CREATE OR REPLACE FUNCTION public.vendor_ledger_upsert(
  _vendor_id uuid, _entry_date date, _source_type text, _source_id uuid,
  _ref_no text, _description text, _debit numeric, _credit numeric,
  _currency_code text, _status text, _route text, _metadata jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.vendor_ledger_entries (
    vendor_id, entry_date, source_type, source_id, ref_no, description,
    debit, credit, currency_code, status, route, metadata, created_by
  ) VALUES (
    _vendor_id, COALESCE(_entry_date, CURRENT_DATE), _source_type, _source_id,
    _ref_no, _description, COALESCE(_debit,0), COALESCE(_credit,0),
    COALESCE(_currency_code,'INR'), _status, _route,
    COALESCE(_metadata, '{}'::jsonb), auth.uid()
  )
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE
    SET vendor_id=EXCLUDED.vendor_id, entry_date=EXCLUDED.entry_date,
        ref_no=EXCLUDED.ref_no, description=EXCLUDED.description,
        debit=EXCLUDED.debit, credit=EXCLUDED.credit,
        currency_code=EXCLUDED.currency_code, status=EXCLUDED.status,
        route=EXCLUDED.route, metadata=EXCLUDED.metadata
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.vendor_ledger_upsert(uuid,date,text,uuid,text,text,numeric,numeric,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
