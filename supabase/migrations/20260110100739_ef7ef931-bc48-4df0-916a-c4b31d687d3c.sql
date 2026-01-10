-- Add category and sector columns to knowledge_documents
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS category text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sector text DEFAULT NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON public.knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_sector ON public.knowledge_documents(sector);

-- Add check constraints for valid values
ALTER TABLE public.knowledge_documents 
ADD CONSTRAINT knowledge_documents_category_check 
CHECK (category IS NULL OR category IN ('technical_guide', 'regulation'));

ALTER TABLE public.knowledge_documents 
ADD CONSTRAINT knowledge_documents_sector_check 
CHECK (sector IS NULL OR sector IN ('general', 'food_beverage', 'pulp_paper', 'textile', 'chemical', 'pharma', 'oil_gas', 'metal', 'mining', 'power', 'electronics', 'automotive', 'cosmetics'));