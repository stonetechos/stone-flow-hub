DROP POLICY IF EXISTS "al insert self" ON public.activity_log;
CREATE POLICY "al insert staff self" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.has_staff_access(auth.uid()));