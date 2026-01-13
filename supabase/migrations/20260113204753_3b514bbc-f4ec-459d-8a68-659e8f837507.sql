ALTER TABLE case_study_jobs 
DROP COLUMN IF EXISTS phase_label,
DROP COLUMN IF EXISTS document_type,
DROP COLUMN IF EXISTS problem_title,
DROP COLUMN IF EXISTS processing_time_seconds,
DROP COLUMN IF EXISTS error_phase;