-- =====================================================================
-- Hardening pass: fix send_rfq + guard vendor quote approvals
-- =====================================================================

-- C-1 + C-2 + M-3: rewrite send_rfq to use the correct table, supply
-- project_id, copy enquiry items into rfq_items, and validate inputs.
CREATE OR REPLACE FUNCTION public.send_rfq(
  p_enquiry_id uuid,
  p_vendor_ids uuid[],
  p_due_date date,
  p_notes text DEFAULT NULL
)
RETURNS public.rfqs
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rfq public.rfqs;
  v_project_id uuid;
  v_vendor_id uuid;
  v_item_count int;
BEGIN
  IF array_length(p_vendor_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one vendor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT project_id INTO v_project_id
    FROM public.enquiries
   WHERE id = p_enquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Assign this enquiry to a project before sending an RFQ' USING ERRCODE = 'P0003';
  END IF;

  SELECT count(*) INTO v_item_count
    FROM public.enquiry_items WHERE enquiry_id = p_enquiry_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Enquiry has no items to request quotes for' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO public.rfqs (enquiry_id, project_id, due_date, notes, status, created_by)
  VALUES (p_enquiry_id, v_project_id, p_due_date, p_notes, 'sent', auth.uid())
  RETURNING * INTO v_rfq;

  -- Snapshot enquiry items into rfq_items so vendors see the request.
  INSERT INTO public.rfq_items (
    rfq_id, enquiry_item_id, product_id, product_name_snapshot,
    quantity, unit, specs, sort_order
  )
  SELECT v_rfq.id, ei.id, ei.product_id, ei.product_name_snapshot,
         ei.quantity, ei.unit, ei.remarks, ei.sort_order
    FROM public.enquiry_items ei
   WHERE ei.enquiry_id = p_enquiry_id
   ORDER BY ei.sort_order;

  -- Vendor requests (was incorrectly using rfq_vendors).
  FOREACH v_vendor_id IN ARRAY p_vendor_ids LOOP
    INSERT INTO public.vendor_requests
      (rfq_id, vendor_id, response_status, sent_at, sent_by)
    VALUES (v_rfq.id, v_vendor_id, 'pending', now(), auth.uid());
  END LOOP;

  UPDATE public.enquiries
     SET stage = 'rfq_sent', stage_changed_at = now()
   WHERE id = p_enquiry_id AND stage <> 'rfq_sent';

  RETURN v_rfq;
END;
$function$;

-- C-3: prevent a second approval on the same RFQ. Uses a trigger because
-- vendor_quotes doesn't carry rfq_id directly; a partial unique index would
-- need a functional index that references vendor_requests.
CREATE OR REPLACE FUNCTION public.enforce_single_approved_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rfq_id uuid;
  v_conflict_count int;
BEGIN
  IF NEW.is_approved IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_approved = true THEN
    RETURN NEW; -- no-op re-approval
  END IF;

  SELECT vr.rfq_id INTO v_rfq_id
    FROM public.vendor_requests vr
   WHERE vr.id = NEW.vendor_request_id;

  SELECT count(*) INTO v_conflict_count
    FROM public.vendor_quotes vq
    JOIN public.vendor_requests vr ON vr.id = vq.vendor_request_id
   WHERE vr.rfq_id = v_rfq_id
     AND vq.is_approved = true
     AND vq.id <> NEW.id;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Another vendor has already been approved for this RFQ. Reject the current approval before approving a new one.'
      USING ERRCODE = 'P0005';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_single_approved_quote ON public.vendor_quotes;
CREATE TRIGGER trg_enforce_single_approved_quote
  BEFORE INSERT OR UPDATE OF is_approved ON public.vendor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_approved_quote();

-- M-5: block staff from mutating an already-approved vendor quote.
-- The existing broad staff policy allowed edits to approved rows.
CREATE OR REPLACE FUNCTION public.block_edit_approved_quote()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow the very transition that flips is_approved (approve/reject flow).
  IF OLD.is_approved = true
     AND NEW.is_approved = true
     AND (
       NEW.total_inr        IS DISTINCT FROM OLD.total_inr        OR
       NEW.freight_inr      IS DISTINCT FROM OLD.freight_inr      OR
       NEW.gst_included     IS DISTINCT FROM OLD.gst_included     OR
       NEW.dispatch_days    IS DISTINCT FROM OLD.dispatch_days    OR
       NEW.stock_available  IS DISTINCT FROM OLD.stock_available  OR
       NEW.remarks          IS DISTINCT FROM OLD.remarks          OR
       NEW.valid_until      IS DISTINCT FROM OLD.valid_until      OR
       NEW.quote_pdf_file_id IS DISTINCT FROM OLD.quote_pdf_file_id
     )
  THEN
    RAISE EXCEPTION 'Approved quotes are locked. Reject the approval before editing pricing or terms.'
      USING ERRCODE = 'P0006';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_block_edit_approved_quote ON public.vendor_quotes;
CREATE TRIGGER trg_block_edit_approved_quote
  BEFORE UPDATE ON public.vendor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.block_edit_approved_quote();
