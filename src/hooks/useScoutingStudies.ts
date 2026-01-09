import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

// Types
export interface ScoutingStudy {
  id: string;
  name: string;
  description: string | null;
  problem_statement: string | null;
  context: string | null;
  objectives: string[] | null;
  constraints: string[] | null;
  current_phase: number;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_by: string | null;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyResearch {
  id: string;
  study_id: string;
  session_id: string | null;
  title: string;
  source_type: 'paper' | 'report' | 'article' | 'patent' | 'website' | 'other' | null;
  source_url: string | null;
  authors: string | null;
  publication_date: string | null;
  summary: string | null;
  key_findings: string[] | null;
  relevance_score: number | null;
  ai_generated: boolean;
  ai_extracted: boolean | null;
  knowledge_doc_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StudySolution {
  id: string;
  study_id: string;
  category: string;
  name: string;
  description: string | null;
  advantages: string[] | null;
  disadvantages: string[] | null;
  applicable_contexts: string[] | null;
  estimated_trl_range: string | null;
  cost_range: string | null;
  implementation_time: string | null;
  priority: number;
  created_by: string | null;
  created_at: string;
}

export interface StudyLonglistItem {
  id: string;
  study_id: string;
  technology_id: string | null;
  existing_technology_id: string | null;
  solution_id: string | null;
  technology_name: string;
  provider: string | null;
  country: string | null;
  trl: number | null;
  brief_description: string | null;
  inclusion_reason: string | null;
  source: string | null;
  added_by: string | null;
  added_at: string;
  web: string | null;
  confidence_score: number | null;
  already_in_db: boolean | null;
  // Extended fields for complete tech sheets
  paises_actua: string | null;
  email: string | null;
  sector: string | null;
  type_suggested: string | null;
  subcategory_suggested: string | null;
  applications: string[] | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
  // Taxonomy IDs
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string | null;
  status: string | null;
}

export interface StudyShortlistItem {
  id: string;
  study_id: string;
  longlist_id: string;
  selection_reason: string | null;
  priority: number;
  notes: string | null;
  selected_by: string | null;
  selected_at: string;
  longlist?: StudyLonglistItem;
}

export interface StudyEvaluation {
  id: string;
  study_id: string;
  shortlist_id: string;
  trl_score: number | null;
  cost_score: number | null;
  scalability_score: number | null;
  trl_notes: string | null;
  cost_notes: string | null;
  scalability_notes: string | null;
  context_fit_score: number | null;
  requirements_met: string[] | null;
  requirements_unmet: string[] | null;
  context_notes: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  opportunities: string[] | null;
  threats: string[] | null;
  implementation_barriers: string[] | null;
  innovation_potential_score: number | null;
  competitive_advantages: string[] | null;
  competitive_disadvantages: string[] | null;
  market_position: string | null;
  benchmark_notes: string | null;
  ai_generated: boolean;
  ai_analysis_json: Record<string, unknown> | null;
  ai_external_data: Record<string, unknown> | null;
  ai_kb_insights: Record<string, unknown> | null;
  ai_analyzed_at: string | null;
  overall_score: number | null;
  recommendation: 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended' | null;
  recommendation_notes: string | null;
  evaluated_by: string | null;
  evaluated_at: string;
  shortlist?: StudyShortlistItem;
}

export interface StudyReport {
  id: string;
  study_id: string;
  version: number;
  title: string;
  executive_summary: string | null;
  methodology: string | null;
  problem_analysis: string | null;
  solutions_overview: string | null;
  technology_comparison: string | null;
  recommendations: string | null;
  conclusions: string | null;
  appendices: Record<string, unknown> | null;
  generated_by: string;
  file_path: string | null;
  created_by: string | null;
  created_at: string;
}

// Hooks for Studies
export function useScoutingStudies(status?: string) {
  return useQuery({
    queryKey: ['scouting-studies', status],
    queryFn: async () => {
      let query = supabase
        .from('scouting_studies')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ScoutingStudy[];
    },
  });
}

export function useScoutingStudy(studyId: string | undefined) {
  return useQuery({
    queryKey: ['scouting-study', studyId],
    queryFn: async () => {
      if (!studyId) return null;
      const { data, error } = await supabase
        .from('scouting_studies')
        .select('*')
        .eq('id', studyId)
        .single();
      if (error) throw error;
      return data as ScoutingStudy;
    },
    enabled: !!studyId,
  });
}

export function useCreateStudy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (study: Partial<ScoutingStudy>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('scouting_studies')
        .insert({
          name: study.name!,
          description: study.description,
          problem_statement: study.problem_statement,
          context: study.context,
          objectives: study.objectives,
          constraints: study.constraints,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-studies'] });
      toast({ title: 'Estudio creado', description: 'El estudio se ha creado correctamente' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStudy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScoutingStudy> & { id: string }) => {
      const { data, error } = await supabase
        .from('scouting_studies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scouting-studies'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-study', data.id] });
      toast({ title: 'Estudio actualizado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStudy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (studyId: string) => {
      const { error } = await supabase
        .from('scouting_studies')
        .delete()
        .eq('id', studyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-studies'] });
      toast({ title: 'Estudio eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Research (Phase 1)
export function useStudyResearch(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-research', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_research')
        .select('*')
        .eq('study_id', studyId)
        .order('relevance_score', { ascending: false });
      if (error) throw error;
      return data as StudyResearch[];
    },
    enabled: !!studyId,
  });
}

export function useAddResearch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (research: Partial<StudyResearch>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('study_research')
        .insert({
          study_id: research.study_id!,
          title: research.title!,
          source_type: research.source_type,
          source_url: research.source_url,
          authors: research.authors,
          summary: research.summary,
          key_findings: research.key_findings,
          relevance_score: research.relevance_score,
          knowledge_doc_id: research.knowledge_doc_id,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-research', data.study_id] });
      toast({ title: 'Investigación añadida' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateResearch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, study_id, ...updates }: Partial<StudyResearch> & { id: string; study_id: string }) => {
      const { data, error } = await supabase
        .from('study_research')
        .update({
          title: updates.title,
          source_type: updates.source_type,
          source_url: updates.source_url,
          authors: updates.authors,
          summary: updates.summary,
          key_findings: updates.key_findings,
          relevance_score: updates.relevance_score,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, study_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-research', data.study_id] });
      toast({ title: 'Investigación actualizada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteResearch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ researchId, studyId, knowledgeDocId, filePath }: { 
      researchId: string; 
      studyId: string; 
      knowledgeDocId?: string | null;
      filePath?: string | null;
    }) => {
      // Delete the research record
      const { error: researchError } = await supabase
        .from('study_research')
        .delete()
        .eq('id', researchId);
      if (researchError) throw researchError;

      // If there's an associated knowledge document, delete it and its chunks
      if (knowledgeDocId) {
        // Delete chunks first
        await supabase
          .from('knowledge_chunks')
          .delete()
          .eq('document_id', knowledgeDocId);

        // Delete the document record
        await supabase
          .from('knowledge_documents')
          .delete()
          .eq('id', knowledgeDocId);
      }

      // If there's a file in storage, delete it
      if (filePath) {
        await supabase.storage
          .from('knowledge-documents')
          .remove([filePath]);
      }

      return { studyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-research', data.studyId] });
      toast({ title: 'Fuente eliminada' });
    },
    onError: (error) => {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Solutions (Phase 2)
export function useStudySolutions(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-solutions', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_solutions')
        .select('*')
        .eq('study_id', studyId)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as StudySolution[];
    },
    enabled: !!studyId,
  });
}

export function useAddSolution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (solution: Partial<StudySolution>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('study_solutions')
        .insert({
          study_id: solution.study_id!,
          category: solution.category!,
          name: solution.name!,
          description: solution.description,
          advantages: solution.advantages,
          disadvantages: solution.disadvantages,
          estimated_trl_range: solution.estimated_trl_range,
          cost_range: solution.cost_range,
          implementation_time: solution.implementation_time,
          priority: solution.priority,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-solutions', data.study_id] });
      toast({ title: 'Solución añadida' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Longlist (Phase 3)
export type FullLonglistItem = Tables<'study_longlist'>;

export function useStudyLonglist(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-longlist', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_longlist')
        .select('*')
        .eq('study_id', studyId)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return data as FullLonglistItem[];
    },
    enabled: !!studyId,

    // Fallback: if realtime misses an event, keep UI consistent without requiring manual refresh
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useAddToLonglist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Partial<StudyLonglistItem>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('study_longlist')
        .insert({
          study_id: item.study_id!,
          technology_name: item.technology_name!,
          technology_id: item.technology_id,
          solution_id: item.solution_id,
          provider: item.provider,
          country: item.country,
          trl: item.trl,
          brief_description: item.brief_description,
          inclusion_reason: item.inclusion_reason,
          source: item.source,
          added_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', data.study_id] });
      toast({ title: 'Tecnología añadida a lista larga' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveFromLonglist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, studyId }: { id: string; studyId: string }) => {
      const { error } = await supabase
        .from('study_longlist')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return studyId;
    },
    onSuccess: (studyId) => {
      // Invalidate both longlist and extracted technologies queries (same table, different filters)
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      queryClient.invalidateQueries({ queryKey: ['study-extracted-technologies', studyId] });
      toast({ title: 'Tecnología eliminada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Shortlist (Phase 4)
export function useStudyShortlist(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-shortlist', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_shortlist')
        .select(`
          *,
          longlist:study_longlist(*)
        `)
        .eq('study_id', studyId)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as StudyShortlistItem[];
    },
    enabled: !!studyId,
  });
}

export function useAddToShortlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Partial<StudyShortlistItem>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('study_shortlist')
        .insert({
          study_id: item.study_id!,
          longlist_id: item.longlist_id!,
          selection_reason: item.selection_reason,
          priority: item.priority,
          notes: item.notes,
          selected_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-shortlist', data.study_id] });
      queryClient.invalidateQueries({ queryKey: ['study-longlist', data.study_id] });
      toast({ title: 'Tecnología añadida a lista corta' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveFromShortlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, studyId }: { id: string; studyId: string }) => {
      const { error } = await supabase
        .from('study_shortlist')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return studyId;
    },
    onSuccess: (studyId) => {
      queryClient.invalidateQueries({ queryKey: ['study-shortlist', studyId] });
      toast({ title: 'Tecnología eliminada de lista corta' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Evaluations (Phase 5)
export function useStudyEvaluations(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-evaluations', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_evaluations')
        .select(`
          *,
          shortlist:study_shortlist(
            *,
            longlist:study_longlist(*)
          )
        `)
        .eq('study_id', studyId)
        .order('overall_score', { ascending: false });
      if (error) throw error;
      return data as StudyEvaluation[];
    },
    enabled: !!studyId,
  });
}

export function useUpsertEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (evaluation: Partial<StudyEvaluation>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const insertData = {
        study_id: evaluation.study_id!,
        shortlist_id: evaluation.shortlist_id!,
        trl_score: evaluation.trl_score,
        cost_score: evaluation.cost_score,
        scalability_score: evaluation.scalability_score,
        trl_notes: evaluation.trl_notes,
        cost_notes: evaluation.cost_notes,
        scalability_notes: evaluation.scalability_notes,
        context_fit_score: evaluation.context_fit_score,
        context_notes: evaluation.context_notes,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        opportunities: evaluation.opportunities,
        threats: evaluation.threats,
        implementation_barriers: evaluation.implementation_barriers,
        innovation_potential_score: evaluation.innovation_potential_score,
        benchmark_notes: evaluation.benchmark_notes,
        overall_score: evaluation.overall_score,
        recommendation: evaluation.recommendation,
        recommendation_notes: evaluation.recommendation_notes,
        evaluated_by: user?.id,
      };
      const { data, error } = await supabase
        .from('study_evaluations')
        .upsert(insertData, { onConflict: 'study_id,shortlist_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-evaluations', data.study_id] });
      toast({ title: 'Evaluación guardada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hooks for Reports
export function useStudyReports(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-reports', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from('study_reports')
        .select('*')
        .eq('study_id', studyId)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as StudyReport[];
    },
    enabled: !!studyId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (report: Partial<StudyReport>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current max version
      const { data: existing } = await supabase
        .from('study_reports')
        .select('version')
        .eq('study_id', report.study_id!)
        .order('version', { ascending: false })
        .limit(1);
      
      const nextVersion = (existing?.[0]?.version ?? 0) + 1;
      
      const { data, error } = await supabase
        .from('study_reports')
        .insert({
          study_id: report.study_id!,
          title: report.title!,
          version: nextVersion,
          executive_summary: report.executive_summary,
          methodology: report.methodology,
          problem_analysis: report.problem_analysis,
          solutions_overview: report.solutions_overview,
          technology_comparison: report.technology_comparison,
          recommendations: report.recommendations,
          conclusions: report.conclusions,
          generated_by: report.generated_by,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-reports', data.study_id] });
      toast({ title: 'Informe creado', description: `Versión ${data.version}` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, study_id, ...updates }: Partial<StudyReport> & { id: string; study_id: string }) => {
      const { data, error } = await supabase
        .from('study_reports')
        .update({
          executive_summary: updates.executive_summary,
          methodology: updates.methodology,
          problem_analysis: updates.problem_analysis,
          solutions_overview: updates.solutions_overview,
          technology_comparison: updates.technology_comparison,
          recommendations: updates.recommendations,
          conclusions: updates.conclusions,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, study_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-reports', data.study_id] });
      toast({ title: 'Informe actualizado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Helper to get study stats
export function useStudyStats(studyId: string | undefined) {
  const { data: research } = useStudyResearch(studyId);
  const { data: solutions } = useStudySolutions(studyId);
  const { data: longlist } = useStudyLonglist(studyId);
  const { data: shortlist } = useStudyShortlist(studyId);
  const { data: evaluations } = useStudyEvaluations(studyId);

  return {
    researchCount: research?.length ?? 0,
    solutionsCount: solutions?.length ?? 0,
    longlistCount: longlist?.length ?? 0,
    shortlistCount: shortlist?.length ?? 0,
    evaluationsCount: evaluations?.length ?? 0,
    completedEvaluations: evaluations?.filter(e => e.recommendation).length ?? 0,
  };
}
