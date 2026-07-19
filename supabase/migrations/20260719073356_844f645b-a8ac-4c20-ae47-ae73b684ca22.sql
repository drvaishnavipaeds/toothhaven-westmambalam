
-- 1) Tighten appointments INSERT to prevent arbitrary patient_id linking
DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;
CREATE POLICY "Public can book appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (patient_id IS NULL OR public.is_staff());

-- 2) Explicit lockdown on portal_otp_codes: only service_role
ALTER TABLE public.portal_otp_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_otp_codes FROM anon, authenticated, public;
GRANT ALL ON public.portal_otp_codes TO service_role;
DROP POLICY IF EXISTS "No client access to otp codes" ON public.portal_otp_codes;
CREATE POLICY "No client access to otp codes"
  ON public.portal_otp_codes FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 3) Storage policies for clinic-media (public read, staff-only writes)
DROP POLICY IF EXISTS "Public read clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Staff write clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Staff update clinic-media" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete clinic-media" ON storage.objects;

CREATE POLICY "Public read clinic-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-media');

CREATE POLICY "Staff write clinic-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'clinic-media' AND public.is_staff());

CREATE POLICY "Staff update clinic-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'clinic-media' AND public.is_staff())
  WITH CHECK (bucket_id = 'clinic-media' AND public.is_staff());

CREATE POLICY "Staff delete clinic-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'clinic-media' AND public.is_staff());

-- 4) Lock down SECURITY DEFINER functions from direct client execution.
--    Trigger functions never need EXECUTE from clients.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_workflow_publish_flag() FROM public, anon, authenticated;
--    is_staff() is used inside RLS policies; policies run under the querying role,
--    so authenticated must retain EXECUTE. Revoke from anon and public only.
REVOKE ALL ON FUNCTION public.is_staff() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
