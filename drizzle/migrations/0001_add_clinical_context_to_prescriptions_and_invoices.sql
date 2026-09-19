ALTER TABLE public.prescriptions
  ADD COLUMN treatment_name TEXT,
  ADD COLUMN tooth_number TEXT;

ALTER TABLE public.invoice_items
  ADD COLUMN tooth_number TEXT;