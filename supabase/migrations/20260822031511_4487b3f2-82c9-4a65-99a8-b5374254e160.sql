ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS instructions_en text,
  ADD COLUMN IF NOT EXISTS instructions_ta text;