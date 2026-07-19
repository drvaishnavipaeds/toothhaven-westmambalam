
CREATE OR REPLACE FUNCTION public.is_admin_identifier(_phone text DEFAULT NULL, _email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_phones ap
    WHERE (_phone IS NOT NULL AND ap.phone = _phone)
       OR (_email IS NOT NULL AND lower(ap.email) = lower(_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_identifier(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_identifier(text, text) TO anon, authenticated;
