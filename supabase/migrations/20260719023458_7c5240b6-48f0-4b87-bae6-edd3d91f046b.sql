
-- Draft / Approve / Publish workflow for promotional and success-story content
DO $$ BEGIN
  CREATE TYPE public.content_workflow_status AS ENUM ('draft','pending_review','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: add workflow columns to a table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['case_studies','testimonials','achievements','clinic_content'] LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS workflow_status public.content_workflow_status NOT NULL DEFAULT ''draft'',
      ADD COLUMN IF NOT EXISTS submitted_by uuid,
      ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
      ADD COLUMN IF NOT EXISTS reviewed_by uuid,
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
      ADD COLUMN IF NOT EXISTS review_notes text', t);
  END LOOP;
END $$;

-- Backfill: anything already flagged live becomes 'approved'
UPDATE public.case_studies   SET workflow_status='approved' WHERE is_published = true AND workflow_status='draft';
UPDATE public.testimonials   SET workflow_status='approved' WHERE is_published = true AND workflow_status='draft';
UPDATE public.achievements   SET workflow_status='approved' WHERE is_active    = true AND workflow_status='draft';
UPDATE public.clinic_content SET workflow_status='approved' WHERE is_active    = true AND workflow_status='draft';

-- Sync trigger: an item is live only when approved
CREATE OR REPLACE FUNCTION public.sync_workflow_publish_flag()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE flag_col text;
BEGIN
  IF TG_TABLE_NAME IN ('achievements','clinic_content') THEN flag_col := 'is_active';
  ELSE flag_col := 'is_published';
  END IF;

  IF NEW.workflow_status = 'approved' THEN
    EXECUTE format('SELECT ($1).%I', flag_col) INTO STRICT NEW USING NEW; -- no-op guard
  END IF;

  -- Use dynamic assignment via jsonb round-trip
  IF NEW.workflow_status = 'approved' THEN
    IF flag_col = 'is_active' THEN NEW.is_active := true; ELSE NEW.is_published := true; END IF;
  ELSE
    IF flag_col = 'is_active' THEN NEW.is_active := false; ELSE NEW.is_published := false; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['case_studies','testimonials','achievements','clinic_content'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_workflow_publish ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_workflow_publish BEFORE INSERT OR UPDATE OF workflow_status ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_workflow_publish_flag()', t);
  END LOOP;
END $$;
