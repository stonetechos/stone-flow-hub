
CREATE POLICY "stonetech-files read auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stonetech-files');
CREATE POLICY "stonetech-files insert auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stonetech-files');
CREATE POLICY "stonetech-files update auth" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'stonetech-files');
CREATE POLICY "stonetech-files delete auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stonetech-files');
