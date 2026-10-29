-- Follow-ups worklist: next sittings, reviews and post-op checks the front desk must call about, with call outcomes.
CREATE TABLE IF NOT EXISTS public.patient_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  followup_type text NOT NULL DEFAULT 'review',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','booked','done','cancelled')),
  call_status text NOT NULL DEFAULT 'not_called' CHECK (call_status IN ('not_called','no_answer','call_back','booked','not_interested')),
  call_attempts integer NOT NULL DEFAULT 0,
  last_called_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followups_status_due ON public.patient_followups (status, due_date);
CREATE INDEX IF NOT EXISTS idx_followups_patient ON public.patient_followups (patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_followups TO authenticated;
GRANT ALL ON public.patient_followups TO service_role;
ALTER TABLE public.patient_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage follow-ups" ON public.patient_followups;
CREATE POLICY "Staff manage follow-ups" ON public.patient_followups FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP TRIGGER IF EXISTS trg_followups_updated ON public.patient_followups;
CREATE TRIGGER trg_followups_updated BEFORE UPDATE ON public.patient_followups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
