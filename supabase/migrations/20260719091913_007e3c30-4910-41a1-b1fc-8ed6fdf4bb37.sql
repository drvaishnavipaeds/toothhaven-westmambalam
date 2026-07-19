-- Revert is_staff() to SECURITY INVOKER to satisfy the linter, and restrict
-- what authenticated users can read from admin_phones to the email column only.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_phones ap
    WHERE ap.email IS NOT NULL
      AND lower(ap.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- Column-level lockdown: authenticated may only read the `email` column
-- (needed to evaluate the self-match policy). Sensitive columns like
-- name and phone are never selectable by non-staff.
REVOKE SELECT ON public.admin_phones FROM authenticated;
GRANT SELECT (email) ON public.admin_phones TO authenticated;

-- service_role keeps full access for admin/edge-function code.
GRANT ALL ON public.admin_phones TO service_role;

-- Recreate the narrow self-match SELECT policy so RLS still permits
-- authenticated users to see (only) their own email row.
DROP POLICY IF EXISTS "Users can check own staff status" ON public.admin_phones;
CREATE POLICY "Users can check own staff status"
ON public.admin_phones
FOR SELECT
TO authenticated
USING (
  email IS NOT NULL
  AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);