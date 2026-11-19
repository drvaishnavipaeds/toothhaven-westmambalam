CREATE TABLE public.clinic_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('service','tutorial','before_after')),
  service_slug TEXT,
  title_en TEXT NOT NULL,
  title_ta TEXT,
  description_en TEXT,
  description_ta TEXT,
  video_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload','youtube')),
  captions_en TEXT,
  captions_ta TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clinic_videos TO anon;
GRANT SELECT ON public.clinic_videos TO authenticated;
GRANT ALL ON public.clinic_videos TO service_role;

ALTER TABLE public.clinic_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published clinic videos"
ON public.clinic_videos FOR SELECT
USING (is_published = true);

CREATE POLICY "Staff manage clinic videos"
ON public.clinic_videos FOR ALL TO authenticated
USING (is_staff()) WITH CHECK (is_staff());