-- Eliminar constraint antiguo
ALTER TABLE case_study_jobs 
DROP CONSTRAINT IF EXISTS case_study_jobs_current_phase_check;

-- Crear nuevo constraint con todos los eventos v11
ALTER TABLE case_study_jobs 
ADD CONSTRAINT case_study_jobs_current_phase_check 
CHECK (current_phase IS NULL OR current_phase = ANY (ARRAY[
  -- Estados base
  'pending', 'completed', 'failed',
  -- Eventos v10 (legacy)
  'uploading', 'extracting', 'extraction_complete', 
  'reviewing', 'review_complete', 'checking_technologies', 
  'tech_check_complete', 'matching', 'matching_complete', 'saving',
  -- Eventos v11 (nuevos)
  'classifying', 'classification_complete',
  'extracting_context', 'context_complete',
  'listing_technologies', 'technologies_listed',
  'matching_db', 'matching_complete_v11',
  'extracting_results', 'results_complete',
  'extracting_lessons', 'lessons_complete',
  'enriching_technologies', 'enrichment_complete',
  'extracting_economics', 'economics_complete',
  'generating_overview', 'overview_complete',
  'saving_v11', 'waiting_confirmation'
]));