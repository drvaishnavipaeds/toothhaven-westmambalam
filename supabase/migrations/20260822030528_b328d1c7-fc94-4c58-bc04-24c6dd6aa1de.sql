-- Chairs / operatories
CREATE TABLE IF NOT EXISTS public.chairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chairs TO authenticated;
GRANT ALL ON public.chairs TO service_role;
ALTER TABLE public.chairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chairs_staff_all" ON public.chairs;
CREATE POLICY "chairs_staff_all" ON public.chairs FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP TRIGGER IF EXISTS trg_chairs_updated ON public.chairs;
CREATE TRIGGER trg_chairs_updated BEFORE UPDATE ON public.chairs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduling fields on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS chair_id uuid REFERENCES public.chairs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

-- Waitlist
CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  treatment_type text,
  preferred_date date,
  preferred_time_slot text,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'waiting',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_waitlist TO authenticated;
GRANT ALL ON public.appointment_waitlist TO service_role;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_staff_all" ON public.appointment_waitlist;
CREATE POLICY "waitlist_staff_all" ON public.appointment_waitlist FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP TRIGGER IF EXISTS trg_waitlist_updated ON public.appointment_waitlist;
CREATE TRIGGER trg_waitlist_updated BEFORE UPDATE ON public.appointment_waitlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalls
CREATE TABLE IF NOT EXISTS public.patient_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  recall_type text NOT NULL DEFAULT 'checkup',
  due_date date NOT NULL,
  interval_months integer NOT NULL DEFAULT 6,
  status text NOT NULL DEFAULT 'pending',
  last_contacted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recalls_due_idx ON public.patient_recalls(due_date, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_recalls TO authenticated;
GRANT ALL ON public.patient_recalls TO service_role;
ALTER TABLE public.patient_recalls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recalls_staff_all" ON public.patient_recalls;
CREATE POLICY "recalls_staff_all" ON public.patient_recalls FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP TRIGGER IF EXISTS trg_recalls_updated ON public.patient_recalls;
CREATE TRIGGER trg_recalls_updated BEFORE UPDATE ON public.patient_recalls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GST on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS cgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS patient_gstin text;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS hsn_sac text,
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS default_gst_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.treatment_catalog
  ADD COLUMN IF NOT EXISTS hsn_sac text,
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 0;