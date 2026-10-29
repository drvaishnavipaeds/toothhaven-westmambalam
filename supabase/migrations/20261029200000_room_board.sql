-- Room board: front-desk check-in and chair seating timestamps for today's live queue.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS seated_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_appointments_date_chair ON public.appointments (appointment_date, chair_id);
