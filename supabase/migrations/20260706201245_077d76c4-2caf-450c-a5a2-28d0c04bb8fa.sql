
-- =========================================================
-- Tighten RLS: exclude vendor-portal accounts from staff data
-- =========================================================

-- activity_log: staff-only read
DROP POLICY IF EXISTS "al read auth" ON public.activity_log;
CREATE POLICY "al read staff" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

-- comments: staff-only read (authors can already read via staff role in practice)
DROP POLICY IF EXISTS "Authenticated read comments" ON public.comments;
CREATE POLICY "comments read staff or author" ON public.comments
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()) OR created_by = auth.uid());

-- enquiries: staff-only read
DROP POLICY IF EXISTS "enquiries read auth" ON public.enquiries;
CREATE POLICY "enquiries read staff" ON public.enquiries
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

-- enquiry_items: staff-only
DROP POLICY IF EXISTS "enquiry_items auth all" ON public.enquiry_items;
CREATE POLICY "enquiry_items staff all" ON public.enquiry_items
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- enquiry_stage_history: staff-only read; keep insert as staff-only too
DROP POLICY IF EXISTS "esh read auth" ON public.enquiry_stage_history;
DROP POLICY IF EXISTS "esh insert auth" ON public.enquiry_stage_history;
CREATE POLICY "esh read staff" ON public.enquiry_stage_history
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "esh insert staff" ON public.enquiry_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

-- followups: staff-only
DROP POLICY IF EXISTS "followups auth all" ON public.followups;
CREATE POLICY "followups staff all" ON public.followups
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- product_images: read for all authenticated (vendor RFQ may show product imagery), writes staff-only
DROP POLICY IF EXISTS "product_images auth all" ON public.product_images;
CREATE POLICY "product_images read auth" ON public.product_images
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_images staff write" ON public.product_images
  FOR INSERT TO authenticated WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "product_images staff update" ON public.product_images
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "product_images staff delete" ON public.product_images
  FOR DELETE TO authenticated USING (public.has_staff_access(auth.uid()));

-- products: keep read for authenticated (vendors need to see product names on RFQs); staff-only writes
DROP POLICY IF EXISTS "products write auth" ON public.products;
CREATE POLICY "products staff insert" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "products staff update" ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "products staff delete" ON public.products
  FOR DELETE TO authenticated USING (public.has_staff_access(auth.uid()));

-- project_notes: staff-only
DROP POLICY IF EXISTS "notes auth all" ON public.project_notes;
CREATE POLICY "notes staff all" ON public.project_notes
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- projects: staff-only read
DROP POLICY IF EXISTS "projects read all auth" ON public.projects;
DROP POLICY IF EXISTS "projects insert auth" ON public.projects;
CREATE POLICY "projects read staff" ON public.projects
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "projects insert staff" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

-- site_visits: staff-only
DROP POLICY IF EXISTS "site_visits auth all" ON public.site_visits;
CREATE POLICY "site_visits staff all" ON public.site_visits
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- tag junction tables: staff-only for writes; reads staff-only too (tag context is internal)
DROP POLICY IF EXISTS "ct auth all" ON public.customer_tags;
DROP POLICY IF EXISTS "pt auth all" ON public.project_tags;
DROP POLICY IF EXISTS "et auth all" ON public.enquiry_tags;
DROP POLICY IF EXISTS "vt auth all" ON public.vendor_tags;
CREATE POLICY "ct staff all" ON public.customer_tags
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "pt staff all" ON public.project_tags
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "et staff all" ON public.enquiry_tags
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "vt staff all" ON public.vendor_tags
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

-- tags: read allowed for authenticated (for tag display), writes staff-only
DROP POLICY IF EXISTS "tags write auth" ON public.tags;
CREATE POLICY "tags staff insert" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "tags staff update" ON public.tags
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE POLICY "tags staff delete" ON public.tags
  FOR DELETE TO authenticated USING (public.has_staff_access(auth.uid()));

-- tasks: staff or owner/assignee read
DROP POLICY IF EXISTS "Authenticated read tasks" ON public.tasks;
CREATE POLICY "tasks read staff or owner" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.has_staff_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

-- vendor_products / vendor_product_categories: scope to owning vendor with staff bypass
DROP POLICY IF EXISTS "vp auth all" ON public.vendor_products;
CREATE POLICY "vp owner or staff" ON public.vendor_products
  FOR ALL TO authenticated
  USING (
    public.has_staff_access(auth.uid())
    OR vendor_id = public.current_vendor_id()
  )
  WITH CHECK (
    public.has_staff_access(auth.uid())
    OR vendor_id = public.current_vendor_id()
  );

DROP POLICY IF EXISTS "vpc auth all" ON public.vendor_product_categories;
CREATE POLICY "vpc owner or staff" ON public.vendor_product_categories
  FOR ALL TO authenticated
  USING (
    public.has_staff_access(auth.uid())
    OR vendor_id = public.current_vendor_id()
  )
  WITH CHECK (
    public.has_staff_access(auth.uid())
    OR vendor_id = public.current_vendor_id()
  );

-- =========================================================
-- Lock down SECURITY DEFINER functions that should not be
-- callable directly by anon/authenticated users. Keep the
-- helpers used by RLS policies executable.
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.enforce_single_approved_quote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_notification_event(public.notification_event, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_vendor_performance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_po() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vq() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_vendor_perf_vr() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_code(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_vendor_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_vendor_of(uuid, uuid) FROM anon;
