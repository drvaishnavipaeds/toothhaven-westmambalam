CREATE OR REPLACE FUNCTION public.guard_public_appointment_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_role text := coalesce(auth.role(), '');
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
$function$;