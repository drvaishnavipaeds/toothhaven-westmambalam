ALTER TABLE public.clinic_videos ADD COLUMN IF NOT EXISTS audio_ta_url text;
ALTER TABLE public.clinic_videos ADD COLUMN IF NOT EXISTS audio_ta_source text;