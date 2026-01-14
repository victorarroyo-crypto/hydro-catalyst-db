-- Eliminar constraint actual
ALTER TABLE case_study_jobs 
DROP CONSTRAINT IF EXISTS case_study_jobs_current_phase_check;

-- Crear nuevo constraint con todos los eventos v12
ALTER TABLE case_study_jobs 
ADD CONSTRAINT case_study_jobs_current_phase_check 
CHECK (current_phase IS NULL OR current_phase = ANY (ARRAY[
  -- Estados base
  'pending', 'completed', 'failed',
  
  -- v12: Multi-documento
  'accumulating',
  
  -- v10 legacy
  'uploading', 'extracting', 'extraction_complete', 
  'reviewing', 'review_complete', 'checking_technologies', 
  'tech_check_complete', 'matching', 'matching_complete', 'saving',
  
  -- v11 Bloque A: Caso de Estudio
  'classifying', 'classification_complete',
  'extracting_context', 'context_complete',
  'extracting_methodology', 'methodology_complete',
  'extracting_analysis', 'analysis_complete',
  'extracting_results', 'results_complete',
  'extracting_lessons', 'lessons_complete',
  
  -- v11 Bloque B: Tech Scouting  
  'listing_technologies', 'technologies_listed',
  'enriching_technologies', 'technologies_enriched',
  'matching_technologies', 'matching_complete_v11',
  
  -- Otros v11
  'matching_db', 'enrichment_complete',
  'extracting_economics', 'economics_complete',
  'generating_overview', 'overview_complete',
  'saving_v11', 'waiting_confirmation'
]));