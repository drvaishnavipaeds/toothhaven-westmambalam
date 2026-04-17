-- =========================================
-- PHASE 1: TRUST FOUNDATION
-- =========================================

-- 1. CASE STUDIES (Before/After Showcases)
CREATE TABLE public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  title_ta TEXT,
  summary TEXT,
  summary_ta TEXT,
  treatment_duration TEXT,
  anonymization_level TEXT NOT NULL DEFAULT 'anonymized',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  consent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_studies_category_chk CHECK (category IN ('orthodontics','implants','cosmetic','rct','pediatric','smile_design','general')),
  CONSTRAINT case_studies_anon_chk CHECK (anonymization_level IN ('anonymized','full_face'))
);

ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published case studies"
  ON public.case_studies FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authenticated users can manage case studies"
  ON public.case_studies FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER case_studies_updated_at
  BEFORE UPDATE ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_case_studies_category ON public.case_studies(category) WHERE is_published = true;
CREATE INDEX idx_case_studies_featured ON public.case_studies(is_featured) WHERE is_published = true;

-- 2. CASE STUDY MEDIA (multiple per case)
CREATE TABLE public.case_study_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id UUID NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image',
  stage TEXT NOT NULL DEFAULT 'after',
  url TEXT NOT NULL,
  caption TEXT,
  caption_ta TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_study_media_type_chk CHECK (media_type IN ('image','video')),
  CONSTRAINT case_study_media_stage_chk CHECK (stage IN ('before','during','after'))
);

ALTER TABLE public.case_study_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media of published case studies"
  ON public.case_study_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.case_studies cs WHERE cs.id = case_study_id AND cs.is_published = true));

CREATE POLICY "Authenticated users can manage case study media"
  ON public.case_study_media FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_case_study_media_case ON public.case_study_media(case_study_id, sort_order);

-- 3. TESTIMONIALS
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_name_ta TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  quote TEXT NOT NULL,
  quote_ta TEXT,
  video_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  consent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT testimonials_rating_chk CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT testimonials_category_chk CHECK (category IN ('orthodontics','implants','cosmetic','rct','pediatric','smile_design','home_visit','general'))
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published testimonials"
  ON public.testimonials FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authenticated users can manage testimonials"
  ON public.testimonials FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_testimonials_category ON public.testimonials(category) WHERE is_published = true;
CREATE INDEX idx_testimonials_featured ON public.testimonials(is_featured) WHERE is_published = true;

-- 4. ACHIEVEMENTS / AWARDS / MILESTONES
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type TEXT NOT NULL DEFAULT 'milestone',
  title TEXT NOT NULL,
  title_ta TEXT,
  description TEXT,
  description_ta TEXT,
  achieved_on DATE,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT achievements_type_chk CHECK (badge_type IN ('award','certification','milestone','conference','media','partnership'))
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage achievements"
  ON public.achievements FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. PATIENT CONSENTS (two-tier)
CREATE TABLE public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_consents_scope_chk CHECK (scope IN ('internal_records','public_marketing','full_face_publish'))
);

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- consents: admin-only access (no public read)
CREATE POLICY "Authenticated users can manage consents"
  ON public.patient_consents FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER patient_consents_updated_at
  BEFORE UPDATE ON public.patient_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_patient_consents_patient ON public.patient_consents(patient_id, scope);

-- 6. PATIENT PORTAL OTP
CREATE TABLE public.portal_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_otp_codes ENABLE ROW LEVEL SECURITY;
-- No public policies: edge functions use service role to read/write.

CREATE INDEX idx_portal_otp_phone ON public.portal_otp_codes(phone, created_at DESC);

-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-media', 'clinic-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-media', 'patient-media', false)
ON CONFLICT (id) DO NOTHING;

-- clinic-media policies (public read, admin write)
CREATE POLICY "Public can read clinic-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-media');

CREATE POLICY "Authenticated users can upload to clinic-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'clinic-media');

CREATE POLICY "Authenticated users can update clinic-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'clinic-media');

CREATE POLICY "Authenticated users can delete from clinic-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'clinic-media');

-- patient-media policies (admin only)
CREATE POLICY "Authenticated users can read patient-media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-media');

CREATE POLICY "Authenticated users can upload to patient-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-media');

CREATE POLICY "Authenticated users can update patient-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'patient-media');

CREATE POLICY "Authenticated users can delete from patient-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-media');

-- 8. Realtime: enable on credibility tables + clinic_content
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_studies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_study_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.testimonials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;