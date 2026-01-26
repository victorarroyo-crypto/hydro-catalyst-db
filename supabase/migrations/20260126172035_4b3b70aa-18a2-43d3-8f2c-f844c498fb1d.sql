-- Create storage bucket for advisor attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-attachments',
  'advisor-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'image/png', 'image/jpeg', 'image/webp']
);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload their own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'advisor-attachments'
);

-- Create policy to allow public read access
CREATE POLICY "Anyone can read advisor attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'advisor-attachments');

-- Create policy to allow users to delete their own files
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'advisor-attachments');