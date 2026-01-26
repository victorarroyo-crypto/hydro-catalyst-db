-- Create advisor-attachments bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-attachments', 
  'advisor-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access for advisor attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'advisor-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Anyone can upload advisor attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'advisor-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own advisor attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'advisor-attachments');