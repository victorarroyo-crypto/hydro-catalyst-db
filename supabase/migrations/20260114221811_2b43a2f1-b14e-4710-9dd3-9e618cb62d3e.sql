-- Add 'similar_found' to current_phase check constraint
-- Add 'awaiting_user_decision' to status check constraint

-- Drop existing constraints
ALTER TABLE public.case_study_jobs DROP CONSTRAINT IF EXISTS case_study_jobs_current_phase_check;
ALTER TABLE public.case_study_jobs DROP CONSTRAINT IF EXISTS case_study_jobs_status_check;

-- Recreate current_phase constraint with 'similar_found' included
ALTER TABLE public.case_study_jobs ADD CONSTRAINT case_study_jobs_current_phase_check CHECK (
  current_phase IS NULL OR current_phase = ANY (ARRAY[
    'pending', 'completed', 'failed', 'accumulating', 'uploading', 'extracting', 
    'extraction_complete', 'reviewing', 'review_complete', 'checking_technologies', 
    'tech_check_complete', 'matching', 'matching_complete', 'saving', 'classifying', 
    'classification_complete', 'extracting_context', 'context_complete', 
    'extracting_methodology', 'methodology_complete', 'extracting_analysis', 
    'analysis_complete', 'extracting_results', 'results_complete', 
    'extracting_lessons', 'lessons_complete', 'listing_technologies', 
    'technologies_listed', 'enriching_technologies', 'technologies_enriched', 
    'matching_technologies', 'matching_complete_v11', 'matching_db', 
    'enrichment_complete', 'extracting_economics', 'economics_complete', 
    'generating_overview', 'overview_complete', 'saving_v11', 'waiting_confirmation',
    'similar_found'
  ]::text[])
);

-- Recreate status constraint with 'awaiting_user_decision' included
ALTER TABLE public.case_study_jobs ADD CONSTRAINT case_study_jobs_status_check CHECK (
  status = ANY (ARRAY['pending', 'processing', 'completed', 'failed', 'awaiting_user_decision']::text[])
);