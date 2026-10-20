-- Migration: Add upi_qr_url column and update active company profile with latest UPI ID & QR URL

ALTER TABLE public.company_profiles 
  ADD COLUMN IF NOT EXISTS upi_qr_url text;

UPDATE public.company_profiles
SET 
  upi_id = 'stonetech.ahmedabad@okicici',
  upi_qr_url = '/branding/upi-qr.png',
  bank_name = COALESCE(bank_name, 'Bank of Baroda'),
  bank_account_number = COALESCE(bank_account_number, '53130200000136'),
  bank_ifsc = COALESCE(bank_ifsc, 'BARB0CHAAHM'),
  updated_at = now()
WHERE is_active = true OR upi_id ILIKE '%stonetech%' OR upi_id IS NULL;
