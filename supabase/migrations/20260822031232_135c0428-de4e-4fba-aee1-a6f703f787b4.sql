CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_message_id text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  phone text NOT NULL,
  profile_name text,
  body text,
  message_type text NOT NULL DEFAULT 'text',
  status text,
  ai_replied boolean NOT NULL DEFAULT false,
  handled_by_staff boolean NOT NULL DEFAULT false,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  raw jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_phone_created ON public.whatsapp_messages (phone, created_at DESC);
CREATE UNIQUE INDEX idx_whatsapp_messages_wa_id ON public.whatsapp_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can add whatsapp messages"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.clinical_ai_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  actor_email text,
  task text NOT NULL,
  input jsonb,
  output jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clinical_ai_logs TO authenticated;
GRANT ALL ON public.clinical_ai_logs TO service_role;

ALTER TABLE public.clinical_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view AI logs"
  ON public.clinical_ai_logs FOR SELECT TO authenticated
  USING (public.is_clinical());
