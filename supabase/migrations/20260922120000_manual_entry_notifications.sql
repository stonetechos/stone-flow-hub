-- =====================================================================
-- Trigger-based In-app Notifications for Manual Office Entries
-- =====================================================================
-- STATUS: PENDING — authored by Claude (Cowork), NOT applied to any
-- database yet. This file must be run manually in the Lovable Cloud
-- SQL editor (Cloud icon -> Database -> SQL editor).
--
-- Scope: Automatically inserts a row into the `notifications` table 
-- whenever a staff member creates a new Enquiry (Lead) or enters a 
-- Payment (Receipt). This triggers the realtime bell icon in the UI.
-- =====================================================================

-- 1. Trigger for New Enquiries / Leads
CREATE OR REPLACE FUNCTION public.notify_new_enquiry()
RETURNS TRIGGER AS $$
BEGIN
  -- We broadcast the notification to all staff (user_id IS NULL).
  INSERT INTO public.notifications (
    user_id,
    tier,
    title,
    body,
    entity_type,
    entity_id,
    link_path,
    created_by
  )
  VALUES (
    NULL,
    'info',
    'New Lead / Enquiry: ' || NEW.enquiry_no,
    'A new lead was generated. Source: ' || COALESCE(NEW.source, 'Manual Entry'),
    'enquiry',
    NEW.id,
    '/enquiries/' || NEW.id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_enquiry ON public.enquiries;
CREATE TRIGGER trigger_notify_new_enquiry
AFTER INSERT ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_enquiry();

-- 2. Trigger for New Receipts (Payments)
CREATE OR REPLACE FUNCTION public.notify_new_receipt()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    tier,
    title,
    body,
    entity_type,
    entity_id,
    link_path,
    created_by
  )
  VALUES (
    NULL,
    'important',
    'Payment Received: ' || NEW.receipt_no,
    'Amount: ₹' || NEW.amount_inr || ' received via ' || COALESCE(NEW.payment_mode, 'Unknown'),
    'receipt',
    NEW.id,
    '/receipts/' || NEW.id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_receipt ON public.receipts;
CREATE TRIGGER trigger_notify_new_receipt
AFTER INSERT ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_receipt();
