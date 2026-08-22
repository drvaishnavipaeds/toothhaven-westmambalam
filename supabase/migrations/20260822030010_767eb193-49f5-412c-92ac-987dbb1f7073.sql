-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner','dentist','receptionist','assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
CREATE POLICY "user_roles_self_read" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());

-- Clinical role helper: dentists/owners (fallback to staff when no role rows assigned yet)
CREATE OR REPLACE FUNCTION public.is_clinical()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff() AND (
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner','dentist','assistant'))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_clinical() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinical() TO authenticated, service_role;

-- 2. Dental chart
CREATE TABLE IF NOT EXISTS public.dental_chart_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentition text NOT NULL DEFAULT 'permanent',
  tooth_number integer NOT NULL,
  surfaces text[] NOT NULL DEFAULT '{}',
  condition text NOT NULL DEFAULT 'healthy',
  notes text,
  recorded_on date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dental_chart_patient_idx ON public.dental_chart_entries(patient_id, tooth_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dental_chart_entries TO authenticated;
GRANT ALL ON public.dental_chart_entries TO service_role;
ALTER TABLE public.dental_chart_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chart_clinical_all" ON public.dental_chart_entries;
CREATE POLICY "chart_clinical_all" ON public.dental_chart_entries
  FOR ALL TO authenticated USING (public.is_clinical()) WITH CHECK (public.is_clinical());
DROP TRIGGER IF EXISTS trg_chart_updated ON public.dental_chart_entries;
CREATE TRIGGER trg_chart_updated BEFORE UPDATE ON public.dental_chart_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Treatment plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  discount numeric NOT NULL DEFAULT 0,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_staff_all" ON public.treatment_plans;
CREATE POLICY "plans_staff_all" ON public.treatment_plans
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP TRIGGER IF EXISTS trg_plans_updated ON public.treatment_plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  phase integer NOT NULL DEFAULT 1,
  treatment_name text NOT NULL,
  tooth_number text,
  sittings integer NOT NULL DEFAULT 1,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_items_plan_idx ON public.treatment_plan_items(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plan_items TO authenticated;
GRANT ALL ON public.treatment_plan_items TO service_role;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_items_staff_all" ON public.treatment_plan_items;
CREATE POLICY "plan_items_staff_all" ON public.treatment_plan_items
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());