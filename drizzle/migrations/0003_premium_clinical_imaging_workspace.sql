CREATE TABLE public.medicine_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  strength text,
  form text,
  default_dose text,
  default_frequency text,
  default_duration text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, strength, form)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicine_catalog TO authenticated;
GRANT ALL ON public.medicine_catalog TO service_role;
ALTER TABLE public.medicine_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage medicine catalogue" ON public.medicine_catalog FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.clinical_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL CHECK (template_type IN ('prescription','advice','consent')),
  name text NOT NULL,
  diagnosis_tag text,
  treatment_name text,
  drugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions_en text,
  instructions_ta text,
  body_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_templates TO authenticated;
GRANT ALL ON public.clinical_templates TO service_role;
ALTER TABLE public.clinical_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage clinical templates" ON public.clinical_templates FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.patient_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  audio_path text NOT NULL,
  duration_seconds integer,
  transcript text,
  clinical_summary text,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_voice_notes TO authenticated;
GRANT ALL ON public.patient_voice_notes TO service_role;
ALTER TABLE public.patient_voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage patient voice notes" ON public.patient_voice_notes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX patient_voice_notes_patient_idx ON public.patient_voice_notes(patient_id, recorded_at DESC);

CREATE TABLE public.treatment_timeline_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  stage text NOT NULL CHECK (stage IN ('before','progress','after')),
  tooth_number text,
  storage_path text NOT NULL,
  caption text,
  taken_on date NOT NULL DEFAULT current_date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_timeline_media TO authenticated;
GRANT ALL ON public.treatment_timeline_media TO service_role;
ALTER TABLE public.treatment_timeline_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage treatment timeline" ON public.treatment_timeline_media FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX treatment_timeline_patient_idx ON public.treatment_timeline_media(patient_id, taken_on DESC);

CREATE TABLE public.investigation_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.patient_investigations(id) ON DELETE CASCADE,
  frame_index integer NOT NULL DEFAULT 0,
  annotation_type text NOT NULL CHECK (annotation_type IN ('measurement','note','marker')),
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  value_mm numeric,
  label text,
  tooth_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigation_annotations TO authenticated;
GRANT ALL ON public.investigation_annotations TO service_role;
ALTER TABLE public.investigation_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage investigation annotations" ON public.investigation_annotations FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX investigation_annotations_lookup_idx ON public.investigation_annotations(investigation_id, frame_index);

ALTER TABLE public.patient_consents ADD COLUMN IF NOT EXISTS treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL;
ALTER TABLE public.patient_consents ADD COLUMN IF NOT EXISTS consent_text text;
ALTER TABLE public.patient_consents ADD COLUMN IF NOT EXISTS signed_by_name text;
ALTER TABLE public.patient_consents ADD COLUMN IF NOT EXISTS signature_path text;
ALTER TABLE public.patient_consents ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.clinical_templates(id) ON DELETE SET NULL;
ALTER TABLE public.treatment_plans ADD COLUMN IF NOT EXISTS valid_until date;
ALTER TABLE public.treatment_plans ADD COLUMN IF NOT EXISTS gst_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.treatment_plan_items ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.patient_investigations ADD COLUMN IF NOT EXISTS is_series boolean NOT NULL DEFAULT false;
ALTER TABLE public.patient_investigations ADD COLUMN IF NOT EXISTS series_paths text[];

CREATE TRIGGER medicine_catalog_updated_at BEFORE UPDATE ON public.medicine_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER clinical_templates_updated_at BEFORE UPDATE ON public.clinical_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();