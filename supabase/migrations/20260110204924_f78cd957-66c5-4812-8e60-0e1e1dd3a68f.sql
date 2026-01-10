-- Add case_study_id column to scouting_queue to track technologies from case studies
ALTER TABLE public.scouting_queue 
ADD COLUMN IF NOT EXISTS case_study_id uuid REFERENCES public.casos_de_estudio(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.scouting_queue.case_study_id IS 'ID del caso de estudio origen (si aplica)';