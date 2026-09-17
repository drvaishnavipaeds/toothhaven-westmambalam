ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS tentative_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS tentative_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS proposed_alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS calendar_sync_status text NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS calendar_sync_error text,
  ADD COLUMN IF NOT EXISTS last_lifecycle_action text,
  ADD COLUMN IF NOT EXISTS lifecycle_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_calendar_sync_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_calendar_sync_status_check
  CHECK (calendar_sync_status IN ('not_synced','pending','synced','failed','conflict','released'));

CREATE INDEX IF NOT EXISTS idx_appointments_lifecycle_deadline
  ON public.appointments (status, confirmation_deadline, tentative_expires_at);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_due
  ON public.appointments (appointment_date, appointment_time)
  WHERE status IN ('confirmed','rescheduled');
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_google_event_id
  ON public.appointments (google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_public_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF request_role = 'service_role' OR public.is_staff() THEN
    RETURN NEW;
  END IF;
  NEW.patient_id := NULL;
  NEW.status := 'pending';
  NEW.source := 'website';
  NEW.doctor_id := NULL;
  NEW.chair_id := NULL;
  NEW.duration_minutes := 30;
  NEW.confirmation_deadline := now() + interval '10 minutes';
  NEW.tentative_created_at := NULL;
  NEW.tentative_expires_at := NULL;
  NEW.expired_at := NULL;
  NEW.google_event_id := NULL;
  NEW.calendar_sync_status := 'not_synced';
  NEW.patient_name := left(btrim(coalesce(NEW.patient_name, '')), 100);
  NEW.patient_phone := left(btrim(coalesce(NEW.patient_phone, '')), 20);
  NEW.treatment_type := left(coalesce(NEW.treatment_type, ''), 100);
  NEW.notes := left(coalesce(NEW.notes, ''), 500);
  IF length(NEW.patient_name) < 2 OR length(regexp_replace(NEW.patient_phone, '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Invalid appointment details';
  END IF;
  IF NEW.appointment_date IS NULL OR NEW.appointment_date < current_date
     OR NEW.appointment_date > current_date + 365 THEN
    RAISE EXCEPTION 'Invalid appointment date';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_start timestamp;
  new_end timestamp;
BEGIN
  IF NEW.status NOT IN ('pending','tentative','confirmed','rescheduled') THEN
    RETURN NEW;
  END IF;
  IF NEW.appointment_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Appointment time must use HH:MM format';
  END IF;
  IF extract(isodow FROM NEW.appointment_date) = 7 THEN
    RAISE EXCEPTION 'Online appointments are unavailable on Sunday';
  END IF;
  IF NOT (
    NEW.appointment_time::time >= time '11:00' AND
    NEW.appointment_time::time + make_interval(mins => greatest(NEW.duration_minutes, 30)) <= time '14:00'
  ) AND NOT (
    NEW.appointment_time::time >= time '18:00' AND
    NEW.appointment_time::time + make_interval(mins => greatest(NEW.duration_minutes, 30)) <= time '21:00'
  ) THEN
    RAISE EXCEPTION 'Appointment is outside online clinic hours';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.appointment_date::text));
  new_start := NEW.appointment_date::timestamp + NEW.appointment_time::time;
  new_end := new_start + make_interval(mins => greatest(NEW.duration_minutes, 30));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id IS DISTINCT FROM NEW.id
      AND a.status IN ('pending','tentative','confirmed','rescheduled')
      AND a.appointment_date = NEW.appointment_date
      AND a.appointment_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND tsrange(
        a.appointment_date::timestamp + a.appointment_time::time,
        a.appointment_date::timestamp + a.appointment_time::time + make_interval(mins => greatest(a.duration_minutes, 30)),
        '[)'
      ) && tsrange(new_start, new_end, '[)')
  ) THEN
    RAISE EXCEPTION 'This appointment time is no longer available';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_appointment_overlap ON public.appointments;
CREATE TRIGGER trg_prevent_appointment_overlap
BEFORE INSERT OR UPDATE OF appointment_date, appointment_time, duration_minutes, status
ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_overlap();

ALTER TABLE public.appointment_notifications
  DROP CONSTRAINT IF EXISTS appointment_notifications_event_type_check;
ALTER TABLE public.appointment_notifications
  ADD CONSTRAINT appointment_notifications_event_type_check
  CHECK (event_type IN ('request','admin_request','confirmation','rescheduled','cancelled','tentative','expired','conflict','alternatives','reminder_24h','reminder_2h','admin_alert'));

REVOKE ALL ON FUNCTION public.prevent_appointment_overlap() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_appointment_overlap() TO service_role;
REVOKE ALL ON FUNCTION public.guard_public_appointment_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_public_appointment_insert() TO service_role;