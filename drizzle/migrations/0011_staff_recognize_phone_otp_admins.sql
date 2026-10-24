CREATE OR REPLACE FUNCTION app_private.is_active_staff()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
 SELECT (
   NOT EXISTS(SELECT 1 FROM public.staff s WHERE s.user_id=auth.uid() AND s.status<>'active')
   AND EXISTS (
     SELECT 1 FROM public.admin_phones ap, (SELECT lower(coalesce(auth.jwt()->>'email','')) AS e) j
     WHERE (ap.email IS NOT NULL AND lower(ap.email)=j.e)
        OR (ap.phone IS NOT NULL AND j.e ~ '^admin\+[0-9]{10}@toothhaven\.internal$'
            AND right(regexp_replace(ap.phone,'\D','','g'),10) = substring(j.e from '^admin\+([0-9]{10})@'))
   )
 ) OR EXISTS(SELECT 1 FROM public.staff s JOIN public.user_roles r ON r.user_id=s.user_id WHERE s.user_id=auth.uid() AND s.status='active');
$function$;