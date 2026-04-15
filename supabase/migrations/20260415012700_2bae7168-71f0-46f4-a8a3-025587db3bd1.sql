
-- Add email to admin_phones
ALTER TABLE public.admin_phones ADD COLUMN email text UNIQUE;

-- Add source to appointments to track origin
ALTER TABLE public.appointments ADD COLUMN source text NOT NULL DEFAULT 'website';

-- Update existing admin with email
UPDATE public.admin_phones SET email = 'toothhaven.wm@gmail.com' WHERE phone = '+918925166149';
