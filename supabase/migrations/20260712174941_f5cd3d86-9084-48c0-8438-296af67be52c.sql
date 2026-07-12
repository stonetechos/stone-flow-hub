
-- Fix 1: Prevent vendors from self-approving quotes via vq_vendor_update policy.
DROP POLICY IF EXISTS vq_vendor_update ON public.vendor_quotes;
CREATE POLICY vq_vendor_update ON public.vendor_quotes
  AS PERMISSIVE
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_quotes.vendor_request_id
        AND vr.vendor_id = current_vendor_id()
    )
    AND is_approved = false
    AND rejected_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_requests vr
      WHERE vr.id = vendor_quotes.vendor_request_id
        AND vr.vendor_id = current_vendor_id()
    )
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejected_at IS NULL
    AND rejected_by IS NULL
  );

-- Fix 2: Pin search_path on the four email-queue helper functions.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;
