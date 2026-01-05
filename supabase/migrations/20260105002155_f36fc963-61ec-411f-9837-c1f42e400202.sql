-- Create knowledge_documents table for storing document metadata
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_chunks table for storing document text chunks
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for full-text search on chunks
CREATE INDEX idx_knowledge_chunks_content_fts ON public.knowledge_chunks 
USING gin(to_tsvector('spanish', content));

-- Create index for document_id lookups
CREATE INDEX idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_documents
CREATE POLICY "Authenticated users can view documents"
  ON public.knowledge_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Internal users can insert documents"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor') OR 
    has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Internal users can update documents"
  ON public.knowledge_documents FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor') OR 
    has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Admins can delete documents"
  ON public.knowledge_documents FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for knowledge_chunks
CREATE POLICY "Authenticated users can view chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Internal users can insert chunks"
  ON public.knowledge_chunks FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor') OR 
    has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Internal users can delete chunks"
  ON public.knowledge_chunks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor') OR 
    has_role(auth.uid(), 'analyst')
  );

-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-docs',
  'knowledge-docs',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Storage policies
CREATE POLICY "Authenticated users can view knowledge docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-docs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Internal users can upload knowledge docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'knowledge-docs' AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'supervisor') OR 
      has_role(auth.uid(), 'analyst')
    )
  );

CREATE POLICY "Admins can delete knowledge docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'knowledge-docs' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();