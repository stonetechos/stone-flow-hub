-- 1. Seed WhatsApp status singleton (never overwrites existing values)
INSERT INTO public.app_settings (key, value)
VALUES ('communication.whatsapp.status', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Allow 'retrying' in message_queue.status (dispatcher already writes it)
ALTER TABLE public.message_queue DROP CONSTRAINT IF EXISTS message_queue_status_check;
ALTER TABLE public.message_queue ADD CONSTRAINT message_queue_status_check
  CHECK (status = ANY (ARRAY['queued'::text,'sending'::text,'sent'::text,'retrying'::text,'failed'::text,'cancelled'::text]));