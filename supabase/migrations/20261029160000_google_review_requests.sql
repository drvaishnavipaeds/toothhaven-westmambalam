-- Post-visit Google review requests reuse the patient care message queue.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS google_review_url text;

CREATE OR REPLACE FUNCTION public.set_appointment_completed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_appointment_completed_at ON public.appointments;
CREATE TRIGGER set_appointment_completed_at BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointment_completed_at();

CREATE INDEX IF NOT EXISTS idx_appointments_completed_at ON public.appointments (completed_at) WHERE completed_at IS NOT NULL;

ALTER TABLE public.patient_care_messages DROP CONSTRAINT IF EXISTS patient_care_messages_kind_check;
ALTER TABLE public.patient_care_messages ADD CONSTRAINT patient_care_messages_kind_check
  CHECK (kind IN ('recall_6m','postop_d1','postop_d3','postop_d7','review_request'));
