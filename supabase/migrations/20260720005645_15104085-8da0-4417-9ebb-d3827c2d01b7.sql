REVOKE EXECUTE ON FUNCTION public.is_admin_identifier(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_identifier(text, text) TO service_role;

DROP POLICY IF EXISTS "Users can check own staff status" ON public.admin_phones;