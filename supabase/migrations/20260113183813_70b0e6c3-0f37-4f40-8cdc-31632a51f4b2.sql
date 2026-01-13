-- Añadir columnas para CaseStudyCrew v11.0
ALTER TABLE case_study_jobs 
ADD COLUMN IF NOT EXISTS phase_label TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS problem_title TEXT,
ADD COLUMN IF NOT EXISTS processing_time_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS error_phase TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN case_study_jobs.phase_label IS 'Etiqueta legible de la fase actual';
COMMENT ON COLUMN case_study_jobs.document_type IS 'Tipo de documento clasificado por IA';
COMMENT ON COLUMN case_study_jobs.problem_title IS 'Título del problema extraído';
COMMENT ON COLUMN case_study_jobs.processing_time_seconds IS 'Tiempo total de procesamiento';
COMMENT ON COLUMN case_study_jobs.error_phase IS 'Fase donde ocurrió el error';