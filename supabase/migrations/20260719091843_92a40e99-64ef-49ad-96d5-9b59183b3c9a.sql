-- Remove direct authenticated SELECT access on admin_phones to prevent
-- staff phone/name leakage. Access is instead gated through a
-- SECURITY DEFINER helper that returns only a boolean.

DROP POLICY IF EXISTS "Users can check own staff status" ON public.admin_phones;

-- Recreate is_staff() as SECURITY DEFINER so RLS evaluation does not
-- require any role to read admin_phones directly. The function only
-- returns a boolean and never exposes row contents.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_phones ap
    WHERE ap.email IS NOT NULL
      AND lower(ap.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

-- Lock down execute privileges: only authenticated callers (whose JWT
-- email is compared inside the function) need to invoke it for RLS.
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- Ensure admin_phones itself remains staff-only for direct table reads.
-- (The existing staff SELECT/manage policies already cover this; no changes.)