ALTER TABLE public.admin_phones ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.admin_phones ADD CONSTRAINT admin_phones_phone_or_email CHECK (phone IS NOT NULL OR email IS NOT NULL);