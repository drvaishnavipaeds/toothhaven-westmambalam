CREATE OR REPLACE FUNCTION public.is_admin_identifier(_phone text DEFAULT NULL, _email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized_input AS (
    SELECT
      CASE
        WHEN regexp_replace(coalesce(_phone, ''), '\D', '', 'g') = '' THEN NULL
        WHEN length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) >= 10 THEN right(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), 10)
        ELSE regexp_replace(coalesce(_phone, ''), '\D', '', 'g')
      END AS phone_10,
      nullif(lower(trim(coalesce(_email, ''))), '') AS email_norm
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_phones ap
    CROSS JOIN normalized_input ni
    WHERE (
      ni.phone_10 IS NOT NULL
      AND ap.phone IS NOT NULL
      AND right(regexp_replace(ap.phone, '\D', '', 'g'), 10) = ni.phone_10
    )
    OR (
      ni.email_norm IS NOT NULL
      AND ap.email IS NOT NULL
      AND lower(trim(ap.email)) = ni.email_norm
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_identifier(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_identifier(text, text) TO anon, authenticated;