
-- Fix 1: SECURITY DEFINER function executable by authenticated
-- Switch is_staff() to SECURITY INVOKER and add a self-scoped SELECT policy on admin_phones
-- so authenticated users can only read their own row via email match.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_phones ap
    WHERE ap.email IS NOT NULL
      AND lower(ap.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

-- Ensure authenticated can read their own admin_phones row (needed by is_staff under INVOKER)
DROP POLICY IF EXISTS "Users can check own staff status" ON public.admin_phones;
CREATE POLICY "Users can check own staff status"
ON public.admin_phones
FOR SELECT
TO authenticated
USING (
  email IS NOT NULL
  AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

-- Fix 2: Public bucket allows listing — remove broad SELECT policy on storage.objects for clinic-media.
-- Public bucket files remain accessible via their public URLs; only API-based listing is disabled.
DROP POLICY IF EXISTS "Public read clinic-media" ON storage.objects;
