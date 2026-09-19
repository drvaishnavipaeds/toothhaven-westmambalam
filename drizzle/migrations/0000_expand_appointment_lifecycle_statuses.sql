ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'pending',
    'tentative',
    'confirmed',
    'rescheduled',
    'conflict',
    'expired',
    'completed',
    'cancelled'
  ));