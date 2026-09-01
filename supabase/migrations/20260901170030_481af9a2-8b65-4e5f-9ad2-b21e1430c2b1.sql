-- Patients: promotional opt-out
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false;

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'en',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_text text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  total_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage campaigns" ON public.campaigns;
CREATE POLICY "Staff manage campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign recipients
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  phone text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'queued',
  wa_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage campaign recipients" ON public.campaign_recipients;
CREATE POLICY "Staff manage campaign recipients" ON public.campaign_recipients
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id, status);

-- WhatsApp message log traceability
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS template_name text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Drain the campaign queue every minute
DO $$
BEGIN
  PERFORM cron.unschedule('campaign-send-drain');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'campaign-send-drain',
    '* * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/campaign-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Lovable-Context', 'cron',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := '{"source":"cron"}'::jsonb
    );
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'campaign cron schedule failed: %', SQLERRM;
END $$;