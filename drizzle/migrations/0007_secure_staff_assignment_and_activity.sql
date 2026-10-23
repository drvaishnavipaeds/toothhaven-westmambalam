CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_catalog AS $$
 SELECT EXISTS (SELECT 1 FROM public.admin_phones ap WHERE ap.email IS NOT NULL AND lower(ap.email)=lower(coalesce(auth.jwt()->>'email','')) AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id=auth.uid() AND s.status <> 'active'))
 OR EXISTS (SELECT 1 FROM public.staff s JOIN public.user_roles r ON r.user_id=s.user_id WHERE s.user_id=auth.uid() AND s.status='active');
$$;
DROP POLICY IF EXISTS "Staff manage admin phones" ON public.admin_phones;
CREATE POLICY "Owners manage admin phones" ON public.admin_phones FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
DROP POLICY IF EXISTS "Staff manage staff" ON public.staff;
CREATE POLICY "Staff read staff" ON public.staff FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Owners manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
CREATE OR REPLACE FUNCTION public.save_staff_assignment(_actor uuid, _id uuid, _user uuid, _name text, _email text, _phone text, _role public.app_role, _status text, _branch uuid, _reason text) RETURNS uuid LANGUAGE plpgsql SET search_path=public,pg_catalog AS $$
DECLARE result_id uuid; previous public.staff; previous_roles jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='owner') THEN RAISE EXCEPTION 'Only owners can assign staff access'; END IF;
 IF length(btrim(coalesce(_name,'')))<2 OR _status NOT IN ('active','on_leave','inactive') OR length(btrim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'Name, status and change reason are required'; END IF;
 PERFORM pg_advisory_xact_lock(72819301);
 SELECT * INTO previous FROM public.staff WHERE id=_id;
 IF _id IS NOT NULL AND previous.id IS NULL THEN RAISE EXCEPTION 'Staff member not found'; END IF;
 IF previous.user_id IS NOT NULL AND previous.user_id IS DISTINCT FROM _user THEN RAISE EXCEPTION 'A linked login cannot be changed'; END IF;
 IF _user IS NOT NULL AND EXISTS(SELECT 1 FROM public.staff WHERE user_id=_user AND id IS DISTINCT FROM _id) THEN RAISE EXCEPTION 'This login is already linked to another staff member'; END IF;
 IF _user IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user AND role='owner') AND (_role<>'owner' OR _status<>'active') AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.role='owner' AND r.user_id<>_user AND NOT EXISTS(SELECT 1 FROM public.staff s WHERE s.user_id=r.user_id AND s.status<>'active')) THEN RAISE EXCEPTION 'Keep at least one active owner'; END IF;
 SELECT coalesce(jsonb_agg(role),'[]'::jsonb) INTO previous_roles FROM public.user_roles WHERE user_id=_user;
 IF _id IS NULL THEN INSERT INTO public.staff(name,email,phone,role,status,branch_id,user_id) VALUES(btrim(_name),lower(btrim(_email)),nullif(btrim(_phone),''),_role::text,_status,_branch,_user) RETURNING id INTO result_id;
 ELSE UPDATE public.staff SET name=btrim(_name),email=lower(btrim(_email)),phone=nullif(btrim(_phone),''),role=_role::text,status=_status,branch_id=_branch,user_id=_user WHERE id=_id RETURNING id INTO result_id; END IF;
 IF _user IS NOT NULL THEN
 DELETE FROM public.user_roles WHERE user_id=_user;
 INSERT INTO public.user_roles(user_id,role) VALUES(_user,_role);
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity,entity_id,details) VALUES(_actor,'staff_access_updated','staff',result_id::text,jsonb_build_object('reason',btrim(_reason),'previous_role',previous_roles,'role',_role,'status',_status,'branch_id',_branch,'linked_user_id',_user));
 RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_staff_assignment(uuid,uuid,uuid,text,text,text,public.app_role,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_staff_assignment(uuid,uuid,uuid,text,text,text,public.app_role,text,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.record_staff_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE row_data jsonb; changed text[];
BEGIN
 IF auth.uid() IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' THEN SELECT array_agg(k) INTO changed FROM jsonb_object_keys(row_data) k WHERE row_data->k IS DISTINCT FROM to_jsonb(OLD)->k; END IF;
 INSERT INTO public.audit_logs(actor_id,actor_email,action,entity,entity_id,details) VALUES(auth.uid(),auth.jwt()->>'email',lower(TG_OP),TG_TABLE_NAME,row_data->>'id',jsonb_build_object('changed_fields',changed));
 RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.record_staff_activity() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['patients','appointments','prescriptions','treatments','invoices','invoice_items','inventory','dental_chart_entries','patient_consents','treatment_plans','treatment_plan_items','medicine_catalog','clinical_templates'] LOOP EXECUTE format('CREATE TRIGGER staff_activity_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_staff_activity()',t); END LOOP; END; $$;
CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx ON public.audit_logs(actor_id,created_at DESC);