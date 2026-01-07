-- =====================================================
-- ESTUDIOS DE SCOUTING - Módulo completo de 5 fases
-- =====================================================

-- Tabla principal de estudios
CREATE TABLE public.scouting_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  problem_statement TEXT, -- Descripción del problema a resolver
  context TEXT, -- Contexto técnico/económico
  objectives TEXT[], -- Objetivos del estudio
  constraints TEXT[], -- Restricciones/limitaciones
  current_phase INTEGER NOT NULL DEFAULT 1, -- Fase actual (1-5)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fase 1: Investigación Bibliográfica
CREATE TABLE public.study_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('paper', 'report', 'article', 'patent', 'website', 'other')),
  source_url TEXT,
  authors TEXT,
  publication_date DATE,
  summary TEXT,
  key_findings TEXT[],
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 5),
  ai_extracted BOOLEAN DEFAULT false,
  knowledge_doc_id UUID REFERENCES public.knowledge_documents(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fase 2: Soluciones Genéricas Propuestas
CREATE TABLE public.study_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- Categoría de solución
  name TEXT NOT NULL,
  description TEXT,
  advantages TEXT[],
  disadvantages TEXT[],
  applicable_contexts TEXT[],
  estimated_trl_range TEXT, -- ej: "4-6"
  cost_range TEXT, -- ej: "Bajo", "Medio", "Alto"
  implementation_time TEXT, -- ej: "6-12 meses"
  priority INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fase 3: Lista Larga de Tecnologías
CREATE TABLE public.study_longlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  technology_id UUID REFERENCES public.technologies(id),
  solution_id UUID REFERENCES public.study_solutions(id),
  technology_name TEXT NOT NULL, -- Por si no existe en technologies
  provider TEXT,
  country TEXT,
  trl INTEGER,
  brief_description TEXT,
  inclusion_reason TEXT,
  source TEXT, -- De dónde viene: "database", "manual", "ai_scouting"
  added_by UUID,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fase 4: Lista Corta (refinada manualmente)
CREATE TABLE public.study_shortlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  longlist_id UUID NOT NULL REFERENCES public.study_longlist(id) ON DELETE CASCADE,
  selection_reason TEXT,
  priority INTEGER DEFAULT 0, -- Orden de prioridad
  notes TEXT,
  selected_by UUID,
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(study_id, longlist_id)
);

-- Fase 5: Evaluación y Comparativa Final
CREATE TABLE public.study_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  shortlist_id UUID NOT NULL REFERENCES public.study_shortlist(id) ON DELETE CASCADE,
  
  -- Criterio 1: TRL + Coste + Escalabilidad
  trl_score INTEGER CHECK (trl_score BETWEEN 1 AND 10),
  cost_score INTEGER CHECK (cost_score BETWEEN 1 AND 10),
  scalability_score INTEGER CHECK (scalability_score BETWEEN 1 AND 10),
  trl_notes TEXT,
  cost_notes TEXT,
  scalability_notes TEXT,
  
  -- Criterio 2: Adecuación al contexto
  context_fit_score INTEGER CHECK (context_fit_score BETWEEN 1 AND 10),
  requirements_met TEXT[],
  requirements_unmet TEXT[],
  context_notes TEXT,
  
  -- Criterio 3: Riesgos y oportunidades
  strengths TEXT[],
  weaknesses TEXT[],
  opportunities TEXT[],
  threats TEXT[],
  implementation_barriers TEXT[],
  innovation_potential_score INTEGER CHECK (innovation_potential_score BETWEEN 1 AND 10),
  
  -- Criterio 4: Benchmark competitivo
  competitive_advantages TEXT[],
  competitive_disadvantages TEXT[],
  market_position TEXT,
  benchmark_notes TEXT,
  
  -- Datos extraídos por IA
  ai_analysis_json JSONB, -- Análisis completo de IA
  ai_external_data JSONB, -- Datos extraídos de web
  ai_kb_insights JSONB, -- Insights de base de conocimiento
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Puntuación final
  overall_score NUMERIC(4,2),
  recommendation TEXT CHECK (recommendation IN ('highly_recommended', 'recommended', 'conditional', 'not_recommended')),
  recommendation_notes TEXT,
  
  evaluated_by UUID,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(study_id, shortlist_id)
);

-- Informe Final del Estudio
CREATE TABLE public.study_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.scouting_studies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  executive_summary TEXT,
  methodology TEXT,
  problem_analysis TEXT,
  solutions_overview TEXT,
  technology_comparison TEXT,
  recommendations TEXT,
  conclusions TEXT,
  appendices JSONB,
  generated_by TEXT DEFAULT 'manual', -- 'manual' o 'ai'
  file_path TEXT, -- Path al documento generado
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(study_id, version)
);

-- Índices para rendimiento
CREATE INDEX idx_study_research_study ON public.study_research(study_id);
CREATE INDEX idx_study_solutions_study ON public.study_solutions(study_id);
CREATE INDEX idx_study_longlist_study ON public.study_longlist(study_id);
CREATE INDEX idx_study_shortlist_study ON public.study_shortlist(study_id);
CREATE INDEX idx_study_evaluations_study ON public.study_evaluations(study_id);
CREATE INDEX idx_scouting_studies_status ON public.scouting_studies(status);
CREATE INDEX idx_scouting_studies_phase ON public.scouting_studies(current_phase);

-- RLS Policies
ALTER TABLE public.scouting_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_longlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_reports ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden ver y editar
CREATE POLICY "Authenticated users can view studies" ON public.scouting_studies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create studies" ON public.scouting_studies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update studies" ON public.scouting_studies
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete studies" ON public.scouting_studies
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para tablas hijas (heredan del estudio padre)
CREATE POLICY "Authenticated users can manage research" ON public.study_research
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage solutions" ON public.study_solutions
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage longlist" ON public.study_longlist
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage shortlist" ON public.study_shortlist
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage evaluations" ON public.study_evaluations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage reports" ON public.study_reports
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_scouting_studies_updated_at
  BEFORE UPDATE ON public.scouting_studies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for study updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouting_studies;