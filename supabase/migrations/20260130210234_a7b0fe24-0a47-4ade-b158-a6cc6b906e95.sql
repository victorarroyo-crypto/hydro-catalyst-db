-- Add pdf_url column to advisor_messages for Deep Advisor PDF exports
ALTER TABLE public.advisor_messages 
ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT NULL;