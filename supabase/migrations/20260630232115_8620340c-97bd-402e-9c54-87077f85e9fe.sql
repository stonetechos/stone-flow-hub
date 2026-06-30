
CREATE OR REPLACE FUNCTION public.send_rfq(
  p_enquiry_id uuid,
  p_vendor_ids uuid[],
  p_due_date date,
  p_notes text DEFAULT NULL
) RETURNS public.rfqs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rfq public.rfqs;
  v_vendor_id uuid;
BEGIN
  IF array_length(p_vendor_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one vendor is required';
  END IF;

  INSERT INTO public.rfqs (enquiry_id, due_date, notes, status)
  VALUES (p_enquiry_id, p_due_date, p_notes, 'sent')
  RETURNING * INTO v_rfq;

  FOREACH v_vendor_id IN ARRAY p_vendor_ids LOOP
    INSERT INTO public.rfq_vendors (rfq_id, vendor_id, status)
    VALUES (v_rfq.id, v_vendor_id, 'sent');
  END LOOP;

  UPDATE public.enquiries
     SET stage = 'rfq_sent', stage_changed_at = now()
   WHERE id = p_enquiry_id AND stage <> 'rfq_sent';

  RETURN v_rfq;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_rfq(uuid, uuid[], date, text) TO authenticated;
