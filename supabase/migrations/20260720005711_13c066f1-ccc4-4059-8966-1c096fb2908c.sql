CREATE POLICY "Users can check own staff status"
ON public.admin_phones
FOR SELECT
TO authenticated
USING (email IS NOT NULL AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));