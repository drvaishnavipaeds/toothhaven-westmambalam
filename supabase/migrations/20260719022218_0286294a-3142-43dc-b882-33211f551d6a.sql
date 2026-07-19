
-- Staff identity helper
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_phones ap
    WHERE ap.email IS NOT NULL
      AND lower(ap.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- ============ PATIENTS ============
DROP POLICY IF EXISTS "Anyone can read patients for portal lookup" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
CREATE POLICY "Staff manage patients" ON public.patients FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ APPOINTMENTS ============
DROP POLICY IF EXISTS "Anyone can view appointments by phone" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
CREATE POLICY "Public can book appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff view appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Staff delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.is_staff());

-- ============ TREATMENTS ============
DROP POLICY IF EXISTS "Anyone can view treatments" ON public.treatments;
DROP POLICY IF EXISTS "Authenticated users can manage treatments" ON public.treatments;
CREATE POLICY "Staff manage treatments" ON public.treatments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ PAYMENTS ============
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ PATIENT_INVESTIGATIONS ============
DROP POLICY IF EXISTS "Anyone can view visible investigations" ON public.patient_investigations;
DROP POLICY IF EXISTS "Authenticated users can manage investigations" ON public.patient_investigations;
CREATE POLICY "Staff manage investigations" ON public.patient_investigations FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ PATIENT_CONSENTS ============
DROP POLICY IF EXISTS "Authenticated users can manage consents" ON public.patient_consents;
CREATE POLICY "Staff manage consents" ON public.patient_consents FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ CASE STUDIES / MEDIA ============
DROP POLICY IF EXISTS "Authenticated users can manage case studies" ON public.case_studies;
CREATE POLICY "Staff manage case studies" ON public.case_studies FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Authenticated users can manage case study media" ON public.case_study_media;
CREATE POLICY "Staff manage case study media" ON public.case_study_media FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ TESTIMONIALS ============
DROP POLICY IF EXISTS "Authenticated users can manage testimonials" ON public.testimonials;
CREATE POLICY "Staff manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ ACHIEVEMENTS ============
DROP POLICY IF EXISTS "Authenticated users can manage achievements" ON public.achievements;
CREATE POLICY "Staff manage achievements" ON public.achievements FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ CLINIC CONTENT ============
DROP POLICY IF EXISTS "Authenticated users can manage content" ON public.clinic_content;
CREATE POLICY "Staff manage clinic content" ON public.clinic_content FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ ADMIN PHONES ============
DROP POLICY IF EXISTS "Authenticated users can view admin phones" ON public.admin_phones;
DROP POLICY IF EXISTS "Only admins can manage admin phones" ON public.admin_phones;
CREATE POLICY "Staff view admin phones" ON public.admin_phones FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff manage admin phones" ON public.admin_phones FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ Remaining admin tables ============
DROP POLICY IF EXISTS "auth manage branches" ON public.branches;
CREATE POLICY "Staff manage branches" ON public.branches FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage staff" ON public.staff;
CREATE POLICY "Staff manage staff" ON public.staff FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage catalog" ON public.treatment_catalog;
CREATE POLICY "Staff manage catalog" ON public.treatment_catalog FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage rx" ON public.prescriptions;
CREATE POLICY "Staff manage rx" ON public.prescriptions FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage inv items" ON public.invoice_items;
CREATE POLICY "Staff manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage memberships" ON public.memberships;
CREATE POLICY "Staff manage memberships" ON public.memberships FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage pat mem" ON public.patient_memberships;
CREATE POLICY "Staff manage patient memberships" ON public.patient_memberships FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage expenses" ON public.expenses;
CREATE POLICY "Staff manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage inventory" ON public.inventory;
CREATE POLICY "Staff manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage tutorials" ON public.tutorials;
CREATE POLICY "Staff manage tutorials" ON public.tutorials FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage campaigns" ON public.communication_campaigns;
CREATE POLICY "Staff manage campaigns" ON public.communication_campaigns FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth manage settings" ON public.clinic_settings;
CREATE POLICY "Staff manage settings" ON public.clinic_settings FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth read audit" ON public.audit_logs;
DROP POLICY IF EXISTS "auth insert audit" ON public.audit_logs;
CREATE POLICY "Staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- ============ portal_otp_codes: ensure locked down ============
ALTER TABLE public.portal_otp_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_otp_codes FROM anon, authenticated;
GRANT ALL ON public.portal_otp_codes TO service_role;

-- ============ STORAGE ============
DROP POLICY IF EXISTS "Public read patient investigations" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read patient-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to patient-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from patient-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage patient-media" ON storage.objects;

CREATE POLICY "Staff read patient-media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-media' AND public.is_staff());
CREATE POLICY "Staff write patient-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-media' AND public.is_staff());
CREATE POLICY "Staff update patient-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-media' AND public.is_staff()) WITH CHECK (bucket_id = 'patient-media' AND public.is_staff());
CREATE POLICY "Staff delete patient-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-media' AND public.is_staff());

-- clinic-media: remove broad public listing; public URLs still function via CDN.
DROP POLICY IF EXISTS "Public can read clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from clinic-media" ON storage.objects;
CREATE POLICY "Staff write clinic-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-media' AND public.is_staff());
CREATE POLICY "Staff update clinic-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-media' AND public.is_staff()) WITH CHECK (bucket_id = 'clinic-media' AND public.is_staff());
CREATE POLICY "Staff delete clinic-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-media' AND public.is_staff());
