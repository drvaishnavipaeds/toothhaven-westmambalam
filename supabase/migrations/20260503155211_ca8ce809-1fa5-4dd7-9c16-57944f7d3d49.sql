-- Allow public read of investigation files (URLs use unguessable UUID paths)
CREATE POLICY "Public read patient investigations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-media' AND (storage.foldername(name))[1] = 'investigations');

CREATE POLICY "Authenticated manage patient-media"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'patient-media')
WITH CHECK (bucket_id = 'patient-media');