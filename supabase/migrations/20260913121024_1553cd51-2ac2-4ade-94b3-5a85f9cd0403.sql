CREATE TABLE public.appointment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('request', 'confirmation', 'rescheduled', 'cancelled', 'reminder')),
  event_key text NOT NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'en',
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  wa_message_id text,
  error text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, event_key)
);

GRANT SELECT ON public.appointment_notifications TO authenticated;
GRANT ALL ON public.appointment_notifications TO service_role;

ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view appointment notifications"
ON public.appointment_notifications
FOR SELECT
TO authenticated
USING (public.is_staff());

CREATE INDEX idx_appointment_notifications_due
ON public.appointment_notifications (status, scheduled_for)
WHERE status = 'queued';

CREATE UNIQUE INDEX idx_appointment_notifications_wa_message_id
ON public.appointment_notifications (wa_message_id)
WHERE wa_message_id IS NOT NULL;

CREATE TRIGGER update_appointment_notifications_updated_at
BEFORE UPDATE ON public.appointment_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();