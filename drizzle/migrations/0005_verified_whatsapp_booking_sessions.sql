CREATE TABLE public.whatsapp_booking_sessions (
 phone text PRIMARY KEY,
 state jsonb NOT NULL DEFAULT '{}'::jsonb,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_booking_sessions TO service_role;
ALTER TABLE public.whatsapp_booking_sessions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.whatsapp_booking_sessions IS 'Server-only verified WhatsApp booking progress; never contains OTP codes or clinical records.';