-- Eliminar constraint actual que solo permite 7 fases
ALTER TABLE case_study_jobs 
DROP CONSTRAINT IF EXISTS case_study_jobs_current_phase_check;

-- Crear nuevo constraint con todas las fases que Railway envía
ALTER TABLE case_study_jobs 
ADD CONSTRAINT case_study_jobs_current_phase_check 
CHECK (
  current_phase IS NULL OR 
  current_phase = ANY (ARRAY[
    'pending',
    'uploading', 
    'extracting',
    'extraction_complete',
    'reviewing',
    'review_complete',
    'checking_technologies',
    'tech_check_complete',
    'matching',
    'matching_complete',
    'saving',
    'completed',
    'failed'
  ])
);

-- Habilitar REPLICA IDENTITY para capturar todos los datos en realtime
ALTER TABLE case_study_jobs REPLICA IDENTITY FULL;

-- Agregar a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE case_study_jobs;