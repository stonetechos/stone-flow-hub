-- Migration: 20261022030000_invoice_fy_numbering_void_and_reuse.sql
-- Implements FY-based invoice numbering (e.g. INV-2627-0005, INV-2728-0001),
-- safe deletion (rewinds sequence if latest, voids if middle to prevent audit holes),
-- and reuse of voided invoice numbers.

-- 1. Ensure 'void' status exists in invoice_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'invoice_status' AND e.enumlabel = 'void'
  ) THEN
    ALTER TYPE public.invoice_status ADD VALUE 'void';
  END IF;
END $$;

-- 2. Financial Year Invoice Number Generator
CREATE OR REPLACE FUNCTION public.get_next_invoice_no(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_year int;
  v_month int;
  v_fy_start int;
  v_fy_end int;
  v_fy_code text;
  v_max_num int;
  v_next_num int;
BEGIN
  v_date := COALESCE(p_date, CURRENT_DATE);
  v_year := EXTRACT(YEAR FROM v_date)::int;
  v_month := EXTRACT(MONTH FROM v_date)::int;

  -- In India, FY runs from April 1 to March 31
  IF v_month >= 4 THEN
    v_fy_start := v_year;
    v_fy_end := v_year + 1;
  ELSE
    v_fy_start := v_year - 1;
    v_fy_end := v_year;
  END IF;

  v_fy_code := lpad((v_fy_start % 100)::text, 2, '0') || lpad((v_fy_end % 100)::text, 2, '0');

  -- Find highest sequence number currently existing for this FY
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_no ~ ('^INV-' || v_fy_code || '-[0-9]+$')
      THEN substring(invoice_no from '[0-9]+$')::int
      ELSE 0
    END
  ), 0)
  INTO v_max_num
  FROM public.invoices;

  -- For FY 2627, start from 0005 if no higher invoice exists (as 0001-0004 already accounted for)
  IF v_fy_code = '2627' THEN
    IF v_max_num < 4 THEN
      v_next_num := 5;
    ELSE
      v_next_num := v_max_num + 1;
    END IF;
  ELSE
    -- For next financial years (e.g. 2728), start from 0001
    v_next_num := v_max_num + 1;
  END IF;

  RETURN 'INV-' || v_fy_code || '-' || lpad(v_next_num::text, 4, '0');
END;
$$;

-- 3. Update BEFORE INSERT Trigger on public.invoices
CREATE OR REPLACE FUNCTION public.assign_invoice_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := public.get_next_invoice_no(NEW.issue_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_code ON public.invoices;
CREATE TRIGGER trg_invoices_code
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_invoice_code();

-- 4. Safe Delete or Void Invoice RPC
-- If an invoice is the latest one, deleting it allows rewinding the counter.
-- If higher invoices exist (middle of sequence), it is marked VOID so tax/audit sequence is never broken.
CREATE OR REPLACE FUNCTION public.delete_or_void_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invoices;
  v_fy_code text;
  v_num int;
  v_higher_count int;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Determine if higher-numbered invoice exists in the same sequence
  IF v_inv.invoice_no ~ '^INV-[0-9]{4}-[0-9]+$' THEN
    v_fy_code := substring(v_inv.invoice_no from '^INV-([0-9]{4})-');
    v_num := substring(v_inv.invoice_no from '[0-9]+$')::int;

    SELECT count(*) INTO v_higher_count
    FROM public.invoices
    WHERE id <> v_inv.id
      AND invoice_no ~ ('^INV-' || v_fy_code || '-[0-9]+$')
      AND substring(invoice_no from '[0-9]+$')::int > v_num;
  ELSE
    -- Legacy format e.g. INV-000005 or INV-005
    v_num := COALESCE(substring(v_inv.invoice_no from '[0-9]+$')::int, 0);

    SELECT count(*) INTO v_higher_count
    FROM public.invoices
    WHERE id <> v_inv.id
      AND invoice_no ~ '^INV-[0-9]+$'
      AND substring(invoice_no from '[0-9]+$')::int > v_num;
  END IF;

  IF v_higher_count > 0 THEN
    -- Higher invoices exist -> Void invoice, preserve number for future reuse
    UPDATE public.invoices
    SET status = 'void',
        notes = CASE
          WHEN notes IS NULL OR notes = '' THEN '[VOIDED on ' || CURRENT_DATE::text || ']'
          ELSE notes || ' [VOIDED on ' || CURRENT_DATE::text || ']'
        END
    WHERE id = v_inv.id;

    -- If linked to a quote, revert quote status to accepted so quote is not blocked
    IF v_inv.quote_id IS NOT NULL THEN
      UPDATE public.quotes SET status = 'accepted' WHERE id = v_inv.quote_id;
    END IF;

    RETURN jsonb_build_object(
      'action', 'voided',
      'invoice_id', v_inv.id,
      'invoice_no', v_inv.invoice_no,
      'message', 'Invoice ' || v_inv.invoice_no || ' has been marked as VOID because higher-numbered invoices exist. The invoice number is preserved in your ledger and is available to reuse.'
    );
  ELSE
    -- Latest invoice -> Completely hard delete to rewind sequence counter
    DELETE FROM public.invoices WHERE id = v_inv.id;

    -- If linked to a quote, revert quote status to accepted
    IF v_inv.quote_id IS NOT NULL THEN
      UPDATE public.quotes SET status = 'accepted' WHERE id = v_inv.quote_id;
    END IF;

    RETURN jsonb_build_object(
      'action', 'deleted',
      'invoice_id', v_inv.id,
      'invoice_no', v_inv.invoice_no,
      'message', 'Invoice ' || v_inv.invoice_no || ' has been deleted. Its number is now available to be re-issued.'
    );
  END IF;
END;
$$;

-- 5. Reuse Void Invoice RPC
-- Replaces a void invoice with a new quote/customer and valid dates
CREATE OR REPLACE FUNCTION public.reuse_void_invoice(
  p_invoice_id uuid,
  p_quote_id uuid,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_due_date date DEFAULT NULL
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invoices;
  v_q public.quotes;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_inv.status NOT IN ('void', 'cancelled') THEN
    RAISE EXCEPTION 'Only void or cancelled invoices can be reused (current status: %)', v_inv.status;
  END IF;

  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Delete old line items
  DELETE FROM public.invoice_items WHERE invoice_id = v_inv.id;

  -- Update invoice record with new quote and customer details
  UPDATE public.invoices
  SET customer_id = v_q.customer_id,
      project_id = v_q.project_id,
      quote_id = v_q.id,
      status = 'draft',
      issue_date = COALESCE(p_issue_date, CURRENT_DATE),
      due_date = COALESCE(p_due_date, COALESCE(p_issue_date, CURRENT_DATE) + INTERVAL '15 days'),
      currency_code = v_q.currency_code,
      company_id = v_q.company_id,
      notes = v_q.notes,
      terms = v_q.terms,
      amount_paid = 0,
      subtotal = v_q.subtotal,
      tax_amount = v_q.tax_amount,
      total = v_q.total,
      balance_due = v_q.total,
      workflow_state = jsonb_set(
        COALESCE(workflow_state, '{}'::jsonb),
        '{reused_at}',
        to_jsonb(NOW()::text)
      )
  WHERE id = v_inv.id
  RETURNING * INTO v_inv;

  -- Populate line items from the accepted quote
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, notes, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order
  )
  SELECT
    v_inv.id, product_id, description, notes, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order
  FROM public.quote_items
  WHERE quote_id = v_q.id;

  -- Mark the quote as converted
  UPDATE public.quotes SET status = 'converted' WHERE id = v_q.id;

  RETURN v_inv;
END;
$$;

-- 6. Helper to inspect date boundaries for void invoice reuse
CREATE OR REPLACE FUNCTION public.get_void_invoice_date_window(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invoices;
  v_fy_code text;
  v_num int;
  v_prev_date date;
  v_prev_no text;
  v_next_date date;
  v_next_no text;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_inv.invoice_no ~ '^INV-[0-9]{4}-[0-9]+$' THEN
    v_fy_code := substring(v_inv.invoice_no from '^INV-([0-9]{4})-');
    v_num := substring(v_inv.invoice_no from '[0-9]+$')::int;

    -- Previous active/issued invoice in sequence
    SELECT issue_date, invoice_no INTO v_prev_date, v_prev_no
    FROM public.invoices
    WHERE id <> v_inv.id
      AND invoice_no ~ ('^INV-' || v_fy_code || '-[0-9]+$')
      AND substring(invoice_no from '[0-9]+$')::int < v_num
      AND status NOT IN ('void', 'cancelled')
    ORDER BY substring(invoice_no from '[0-9]+$')::int DESC
    LIMIT 1;

    -- Next active/issued invoice in sequence
    SELECT issue_date, invoice_no INTO v_next_date, v_next_no
    FROM public.invoices
    WHERE id <> v_inv.id
      AND invoice_no ~ ('^INV-' || v_fy_code || '-[0-9]+$')
      AND substring(invoice_no from '[0-9]+$')::int > v_num
      AND status NOT IN ('void', 'cancelled')
    ORDER BY substring(invoice_no from '[0-9]+$')::int ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'invoice_no', v_inv.invoice_no,
    'prev_invoice_no', v_prev_no,
    'prev_date', v_prev_date,
    'next_invoice_no', v_next_no,
    'next_date', v_next_date,
    'suggested_min_date', v_prev_date,
    'suggested_max_date', v_next_date
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_next_invoice_no(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_or_void_invoice(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reuse_void_invoice(uuid, uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_void_invoice_date_window(uuid) TO authenticated, service_role;
