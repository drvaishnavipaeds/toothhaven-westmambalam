REVOKE ALL ON FUNCTION public.is_admin_identifier(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_identifier(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_identifier(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_identifier(text, text) TO service_role;