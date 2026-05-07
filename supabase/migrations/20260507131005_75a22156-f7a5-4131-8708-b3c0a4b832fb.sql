ALTER TABLE public.patient_investigations
ADD COLUMN IF NOT EXISTS series_paths text[],
ADD COLUMN IF NOT EXISTS is_series boolean NOT NULL DEFAULT false;