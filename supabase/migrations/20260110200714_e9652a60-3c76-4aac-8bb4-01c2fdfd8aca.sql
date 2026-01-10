-- Eliminar constraint actual
ALTER TABLE case_study_jobs DROP CONSTRAINT IF EXISTS case_study_jobs_current_phase_check;

-- Recrear con valores adicionales que Railway puede enviar
ALTER TABLE case_study_jobs ADD CONSTRAINT case_study_jobs_current_phase_check 
CHECK (current_phase IS NULL OR current_phase = ANY (ARRAY[
  'pending',
  'uploading',
  'extracting',
  'reviewing',
  'checking_tech',
  'completed',
  'failed'
]));