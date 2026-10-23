CREATE SEQUENCE public.patient_number_seq;
GRANT USAGE ON SEQUENCE public.patient_number_seq TO authenticated, service_role;
ALTER TABLE public.patients ADD COLUMN patient_code text DEFAULT ('TH-' || lpad(nextval('public.patient_number_seq')::text, 6, '0'));
ALTER TABLE public.patients ADD COLUMN registered_on date DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date);
UPDATE public.patients SET registered_on = (created_at AT TIME ZONE 'Asia/Kolkata')::date;
CREATE UNIQUE INDEX patients_patient_code_unique ON public.patients (patient_code);
COMMENT ON COLUMN public.patients.patient_code IS 'Clinic identifier distinct from shared family contact phone.';
COMMENT ON COLUMN public.patients.registered_on IS 'Original clinic registration date, preserved on import independently of created_at.';