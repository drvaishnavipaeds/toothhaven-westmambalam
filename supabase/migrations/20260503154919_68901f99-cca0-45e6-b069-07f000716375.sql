-- Patient investigations: CBCT, intraoral, clinical images organized by procedure type
CREATE TABLE public.patient_investigations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  treatment_id UUID,
  investigation_type TEXT NOT NULL DEFAULT 'clinical', -- 'cbct' | 'intraoral' | 'clinical' | 'xray' | 'opg'
  procedure_category TEXT NOT NULL DEFAULT 'general', -- 'orthodontics' | 'implants' | 'rct' | 'cosmetic' | 'pediatric' | 'surgery' | 'general'
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'pdf' | 'dicom'
  tooth_number TEXT,
  taken_on DATE,
  is_visible_to_patient BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_investigations_patient ON public.patient_investigations(patient_id);
CREATE INDEX idx_patient_investigations_type ON public.patient_investigations(investigation_type);
CREATE INDEX idx_patient_investigations_category ON public.patient_investigations(procedure_category);

ALTER TABLE public.patient_investigations ENABLE ROW LEVEL SECURITY;

-- Public read for patient portal lookup (filtered client-side by phone+OTP)
CREATE POLICY "Anyone can view visible investigations"
ON public.patient_investigations
FOR SELECT
USING (is_visible_to_patient = true);

CREATE POLICY "Authenticated users can manage investigations"
ON public.patient_investigations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_patient_investigations_updated_at
BEFORE UPDATE ON public.patient_investigations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();