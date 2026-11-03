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

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_doctor_date ON public.invoices (doctor_id, invoice_date) WHERE doctor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.staff_salary_settings (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  pay_type text NOT NULL DEFAULT 'fixed' CHECK (pay_type IN ('fixed','commission','hybrid')),
  fixed_monthly numeric(12,2) NOT NULL DEFAULT 0 CHECK (fixed_monthly >= 0),
  commission_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_percent BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_month date NOT NULL CHECK (extract(day FROM period_month) = 1),
  pay_type text NOT NULL CHECK (pay_type IN ('fixed','commission','hybrid')),
  fixed_pay numeric(12,2) NOT NULL DEFAULT 0,
  collected numeric(12,2) NOT NULL DEFAULT 0,
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  commission numeric(12,2) NOT NULL DEFAULT 0,
  treatments integer NOT NULL DEFAULT 0,
  patients integer NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  deductions numeric(12,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid')),
  paid_on date,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period_month)
);

CREATE OR REPLACE FUNCTION public.is_clinic_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff() AND public.has_role(auth.uid(), 'owner');
$$;
REVOKE EXECUTE ON FUNCTION public.is_clinic_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_owner() TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_salary_settings, public.salary_slips TO authenticated;
GRANT ALL ON public.staff_salary_settings, public.salary_slips TO service_role;
ALTER TABLE public.staff_salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages salary settings" ON public.staff_salary_settings;
CREATE POLICY "Owner manages salary settings" ON public.staff_salary_settings FOR ALL TO authenticated
  USING (public.is_clinic_owner()) WITH CHECK (public.is_clinic_owner());
DROP POLICY IF EXISTS "Owner manages salary slips" ON public.salary_slips;
CREATE POLICY "Owner manages salary slips" ON public.salary_slips FOR ALL TO authenticated
  USING (public.is_clinic_owner()) WITH CHECK (public.is_clinic_owner());

DROP TRIGGER IF EXISTS trg_salary_settings_updated ON public.staff_salary_settings;
CREATE TRIGGER trg_salary_settings_updated BEFORE UPDATE ON public.staff_salary_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_salary_slips_updated ON public.salary_slips;
CREATE TRIGGER trg_salary_slips_updated BEFORE UPDATE ON public.salary_slips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.lock_paid_salary_slip()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'paid' THEN RAISE EXCEPTION 'Salary slip already paid'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lock_paid_salary_slip ON public.salary_slips;
CREATE TRIGGER trg_lock_paid_salary_slip BEFORE UPDATE ON public.salary_slips FOR EACH ROW EXECUTE FUNCTION public.lock_paid_salary_slip();

CREATE OR REPLACE FUNCTION public.mark_salary_slip_paid(_slip_id uuid, _paid_on date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE s record; _expense_id uuid;
BEGIN
  IF NOT public.is_clinic_owner() THEN RAISE EXCEPTION 'Only the clinic owner can pay salaries'; END IF;
  SELECT sl.*, st.name AS staff_name INTO s FROM public.salary_slips sl JOIN public.staff st ON st.id = sl.staff_id WHERE sl.id = _slip_id FOR UPDATE OF sl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Salary slip not found'; END IF;
  IF s.status <> 'draft' THEN RAISE EXCEPTION 'Salary slip already paid'; END IF;
  INSERT INTO public.expenses (expense_date, category, vendor, amount, description)
  VALUES (_paid_on, 'salaries', s.staff_name, s.net_pay, 'Salary for ' || to_char(s.period_month, 'FMMonth YYYY'))
  RETURNING id INTO _expense_id;
  UPDATE public.salary_slips SET status = 'paid', paid_on = _paid_on, expense_id = _expense_id WHERE id = _slip_id;
  RETURN _expense_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.mark_salary_slip_paid(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_salary_slip_paid(uuid, date) TO authenticated, service_role;