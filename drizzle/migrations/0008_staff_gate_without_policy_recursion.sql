CREATE OR REPLACE FUNCTION app_private.is_active_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$
 SELECT EXISTS (SELECT 1 FROM public.admin_phones ap WHERE ap.email IS NOT NULL AND lower(ap.email)=lower(coalesce(auth.jwt()->>'email','')) AND NOT EXISTS(SELECT 1 FROM public.staff s WHERE s.user_id=auth.uid() AND s.status<>'active')) OR EXISTS(SELECT 1 FROM public.staff s JOIN public.user_roles r ON r.user_id=s.user_id WHERE s.user_id=auth.uid() AND s.status='active');
$$;
REVOKE ALL ON FUNCTION app_private.is_active_staff() FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA app_private TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.is_active_staff() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE SET search_path=public,pg_catalog AS $$ SELECT app_private.is_active_staff(); $$;