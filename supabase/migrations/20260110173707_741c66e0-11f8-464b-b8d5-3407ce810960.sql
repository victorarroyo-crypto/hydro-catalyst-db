-- Crear tabla case_study_technologies para vincular casos de estudio con tecnologías
CREATE TABLE public.case_study_technologies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_study_id uuid NOT NULL REFERENCES public.casos_de_estudio(id) ON DELETE CASCADE,
  technology_id uuid REFERENCES public.technologies(id) ON DELETE SET NULL,
  technology_name text NOT NULL,
  provider text,
  role text NOT NULL CHECK (role IN ('recommended', 'evaluated')),
  selection_rationale text,
  economic_analysis jsonb DEFAULT '{}'::jsonb,
  scouting_queue_id uuid REFERENCES public.scouting_queue(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Comentarios descriptivos
COMMENT ON TABLE public.case_study_technologies IS 'Vincula casos de estudio con tecnologías recomendadas o evaluadas';
COMMENT ON COLUMN public.case_study_technologies.role IS 'recommended = tecnología seleccionada, evaluated = tecnología considerada';
COMMENT ON COLUMN public.case_study_technologies.economic_analysis IS 'Análisis económico: {capex, opex, payback, roi}';

-- Crear índices para búsquedas frecuentes
CREATE INDEX idx_case_study_technologies_case_study_id ON public.case_study_technologies(case_study_id);
CREATE INDEX idx_case_study_technologies_technology_id ON public.case_study_technologies(technology_id);
CREATE INDEX idx_case_study_technologies_role ON public.case_study_technologies(role);

-- Habilitar RLS
ALTER TABLE public.case_study_technologies ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Cualquiera puede leer
CREATE POLICY "Anyone can read case_study_technologies"
ON public.case_study_technologies
FOR SELECT
USING (true);

-- Política INSERT: Solo usuarios internos
CREATE POLICY "Internal users can insert case_study_technologies"
ON public.case_study_technologies
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Política UPDATE: Solo usuarios internos
CREATE POLICY "Internal users can update case_study_technologies"
ON public.case_study_technologies
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Política DELETE: Solo admins
CREATE POLICY "Admins can delete case_study_technologies"
ON public.case_study_technologies
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));