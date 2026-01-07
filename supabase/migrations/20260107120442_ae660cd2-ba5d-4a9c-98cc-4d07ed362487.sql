-- Update the knowledge-documents bucket to allow files up to 50MB
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'knowledge-documents';