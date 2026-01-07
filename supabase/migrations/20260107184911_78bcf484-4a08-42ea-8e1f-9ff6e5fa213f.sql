-- Add source and detailed info fields to study_solutions
ALTER TABLE public.study_solutions 
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_title TEXT,
  ADD COLUMN IF NOT EXISTS detailed_info TEXT,
  ADD COLUMN IF NOT EXISTS applicable_sectors TEXT[],
  ADD COLUMN IF NOT EXISTS key_providers TEXT[],
  ADD COLUMN IF NOT EXISTS case_studies TEXT[];