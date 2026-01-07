-- Create storage bucket for knowledge documents (study research files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents', 
  true,
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "Authenticated users can upload knowledge documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-documents');

CREATE POLICY "Anyone can view knowledge documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'knowledge-documents');

CREATE POLICY "Authenticated users can update their knowledge documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'knowledge-documents');

CREATE POLICY "Authenticated users can delete their knowledge documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-documents');