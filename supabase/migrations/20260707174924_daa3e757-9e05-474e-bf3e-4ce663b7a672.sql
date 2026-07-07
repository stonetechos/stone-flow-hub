
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'communication.mode',
  jsonb_build_object('mode','test','test_email','','test_phone',''),
  'Global TEST/LIVE switch. TEST redirects every outbound email/WhatsApp to test_email/test_phone regardless of recipient.'
)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_message_queue_status_next
  ON public.message_queue (status, next_retry_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_message_queue_channel_status_created
  ON public.message_queue (channel, status, created_at DESC);
