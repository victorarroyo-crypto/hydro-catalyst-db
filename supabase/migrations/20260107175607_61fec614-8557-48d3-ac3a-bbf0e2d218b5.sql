-- Add technology extraction columns to study_research
ALTER TABLE public.study_research 
ADD COLUMN IF NOT EXISTS technology_mentioned text,
ADD COLUMN IF NOT EXISTS provider_mentioned text;

-- Add new columns to study_longlist for AI extraction
ALTER TABLE public.study_longlist
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES study_sessions(id),
ADD COLUMN IF NOT EXISTS web text,
ADD COLUMN IF NOT EXISTS type_suggested text,
ADD COLUMN IF NOT EXISTS subcategory_suggested text,
ADD COLUMN IF NOT EXISTS applications text[],
ADD COLUMN IF NOT EXISTS source_research_id uuid REFERENCES study_research(id),
ADD COLUMN IF NOT EXISTS confidence_score decimal(3,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS already_in_db boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS existing_technology_id uuid REFERENCES technologies(id);

-- Add index for faster querying of AI-extracted technologies
CREATE INDEX IF NOT EXISTS idx_study_longlist_source ON public.study_longlist(source);
CREATE INDEX IF NOT EXISTS idx_study_longlist_study_source ON public.study_longlist(study_id, source);