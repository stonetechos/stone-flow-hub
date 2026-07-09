
-- Restrict ownership_transfers reads to staff only
DROP POLICY IF EXISTS "ownership_transfers_read" ON public.ownership_transfers;
CREATE POLICY "ownership_transfers_read" ON public.ownership_transfers
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

-- Revoke anon EXECUTE on privileged SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.preview_ownership_transfer(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_commercial_ownership(text, uuid, uuid, uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rollback_ownership_transfer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dependency_summary(text, uuid) FROM anon, public;

-- Reminder generator: cron-only (service role). Remove authenticated access.
REVOKE EXECUTE ON FUNCTION public.generate_customer_payment_reminders() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.generate_customer_payment_reminders() TO service_role;
