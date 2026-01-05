-- Add description column to knowledge_documents
ALTER TABLE public.knowledge_documents 
ADD COLUMN description TEXT DEFAULT NULL;