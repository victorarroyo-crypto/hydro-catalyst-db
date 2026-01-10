-- Crear tabla case_study_jobs para trackear procesamiento de casos de estudio
CREATE TABLE public.case_study_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_study_id uuid REFERENCES public.casos_de_estudio(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  current_phase text CHECK (current_phase IN ('extracting', 'reviewing', 'checking_tech', 'completed', 'failed')),
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  documents_count integer,
  quality_score integer CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  technologies_found integer DEFAULT 0,
  technologies_new integer DEFAULT 0,
  error_message text,
  result_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Comentarios descriptivos
COMMENT ON TABLE public.case_study_jobs IS 'Trackea el procesamiento de documentos de casos de estudio';
COMMENT ON COLUMN public.case_study_jobs.current_phase IS 'extracting=extrayendo datos, reviewing=revisando, checking_tech=buscando tecnologías';
COMMENT ON COLUMN public.case_study_jobs.result_data IS 'JSON con datos extraídos por IA del procesamiento';

-- Crear índices
CREATE INDEX idx_case_study_jobs_status ON public.case_study_jobs(status);
CREATE INDEX idx_case_study_jobs_case_study_id ON public.case_study_jobs(case_study_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_case_study_jobs_updated_at
BEFORE UPDATE ON public.case_study_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.case_study_jobs ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Solo usuarios internos
CREATE POLICY "Internal users can view case_study_jobs"
ON public.case_study_jobs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Política INSERT: Solo usuarios internos
CREATE POLICY "Internal users can insert case_study_jobs"
ON public.case_study_jobs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Política UPDATE: Solo usuarios internos
CREATE POLICY "Internal users can update case_study_jobs"
ON public.case_study_jobs
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Política DELETE: Solo usuarios internos
CREATE POLICY "Internal users can delete case_study_jobs"
ON public.case_study_jobs
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);