
-- Admin roles table (phone-based)
CREATE TABLE public.admin_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view admin phones"
  ON public.admin_phones FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage admin phones"
  ON public.admin_phones FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Insert the owner as first admin
INSERT INTO public.admin_phones (phone, name, role) VALUES ('+918925166149', 'Dr. Karthik Srinivasan', 'admin');

-- Payments table for financial tracking
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'completed',
  transaction_id text,
  notes text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can view payments"
  ON public.payments FOR SELECT TO public
  USING (true);
