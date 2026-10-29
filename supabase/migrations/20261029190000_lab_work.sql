-- Dental lab work: crowns, dentures and appliances tracked from impression to fit, per external lab.
CREATE TABLE IF NOT EXISTS public.lab_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  lab_id uuid REFERENCES public.lab_vendors(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  work_type text NOT NULL,
  tooth_numbers text,
  shade text,
  material text,
  instructions text,
  status text NOT NULL DEFAULT 'impression' CHECK (status IN ('impression','sent','received','delivered','rework','cancelled')),
  sent_on date,
  due_date date,
  received_on date,
  delivered_on date,
  cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  rework_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_cases_status_due ON public.lab_cases (status, due_date);
CREATE INDEX IF NOT EXISTS idx_lab_cases_patient ON public.lab_cases (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_cases_lab_sent ON public.lab_cases (lab_id, sent_on);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_vendors, public.lab_cases TO authenticated;
GRANT ALL ON public.lab_vendors, public.lab_cases TO service_role;
ALTER TABLE public.lab_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage lab vendors" ON public.lab_vendors;
CREATE POLICY "Staff manage lab vendors" ON public.lab_vendors FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "Staff manage lab cases" ON public.lab_cases;
CREATE POLICY "Staff manage lab cases" ON public.lab_cases FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_lab_vendors_updated ON public.lab_vendors;
CREATE TRIGGER trg_lab_vendors_updated BEFORE UPDATE ON public.lab_vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_lab_cases_updated ON public.lab_cases;
CREATE TRIGGER trg_lab_cases_updated BEFORE UPDATE ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
