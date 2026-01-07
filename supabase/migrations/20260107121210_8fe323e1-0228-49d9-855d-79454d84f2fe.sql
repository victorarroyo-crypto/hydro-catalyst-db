-- Ensure authenticated users can read uploaded knowledge documents
-- (required for opening files via signed URLs)

DO $$
BEGIN
  -- Create policy only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated can read knowledge documents'
  ) THEN
    CREATE POLICY "Authenticated can read knowledge documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'knowledge-documents');
  END IF;
END $$;