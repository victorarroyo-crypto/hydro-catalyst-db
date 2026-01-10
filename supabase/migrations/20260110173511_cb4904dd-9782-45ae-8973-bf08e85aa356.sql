-- Añadir campos para el módulo de procesamiento de casos de estudio
ALTER TABLE public.casos_de_estudio
ADD COLUMN IF NOT EXISTS solution_applied text,
ADD COLUMN IF NOT EXISTS results_achieved text,
ADD COLUMN IF NOT EXISTS problem_parameters jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS treatment_train text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS results_parameters jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS roi_percent numeric,
ADD COLUMN IF NOT EXISTS roi_rationale text,
ADD COLUMN IF NOT EXISTS capex numeric,
ADD COLUMN IF NOT EXISTS opex_year numeric,
ADD COLUMN IF NOT EXISTS payback_months integer,
ADD COLUMN IF NOT EXISTS lessons_learned text,
ADD COLUMN IF NOT EXISTS quality_score integer CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
ADD COLUMN IF NOT EXISTS source_folder text,
ADD COLUMN IF NOT EXISTS source_documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'::text;

-- Añadir comentarios descriptivos
COMMENT ON COLUMN public.casos_de_estudio.solution_applied IS 'Descripción de la solución implementada';
COMMENT ON COLUMN public.casos_de_estudio.results_achieved IS 'Descripción de los resultados obtenidos';
COMMENT ON COLUMN public.casos_de_estudio.problem_parameters IS 'Parámetros del problema: {dqo, dbo, caudal, contaminantes}';
COMMENT ON COLUMN public.casos_de_estudio.treatment_train IS 'Array de etapas del tren de tratamiento';
COMMENT ON COLUMN public.casos_de_estudio.results_parameters IS 'Parámetros de resultados: {dqo_final, reduccion_percent}';
COMMENT ON COLUMN public.casos_de_estudio.roi_percent IS 'Porcentaje de ROI';
COMMENT ON COLUMN public.casos_de_estudio.roi_rationale IS 'Justificación del cálculo de ROI';
COMMENT ON COLUMN public.casos_de_estudio.capex IS 'Inversión inicial en euros';
COMMENT ON COLUMN public.casos_de_estudio.opex_year IS 'Coste operativo anual en euros';
COMMENT ON COLUMN public.casos_de_estudio.payback_months IS 'Meses de retorno de inversión';
COMMENT ON COLUMN public.casos_de_estudio.lessons_learned IS 'Lecciones aprendidas del proyecto';
COMMENT ON COLUMN public.casos_de_estudio.quality_score IS 'Puntuación de calidad 0-100';
COMMENT ON COLUMN public.casos_de_estudio.source_folder IS 'Identificador de carpeta de documentos procesados';
COMMENT ON COLUMN public.casos_de_estudio.source_documents IS 'Lista de documentos procesados [{name, path, type}]';
COMMENT ON COLUMN public.casos_de_estudio.status IS 'Estado: draft, processing, approved, archived';

-- Crear índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_casos_de_estudio_status ON public.casos_de_estudio(status);