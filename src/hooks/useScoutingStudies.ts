import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studySessionsService } from '@/services/studySessionsService';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api';
import type { Tables } from '@/integrations/supabase/types';

// Types - keeping backward compatibility
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
  paises_actua: string | null;
  email: string | null;
  sector: string | null;
  type_suggested: string | null;
  subcategory_suggested: string | null;
  applications: string[] | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
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

// ============================================================================
// SCOUTING STUDIES (Main entity - uses Railway API)
// ============================================================================

const STUDIES_URL = `${API_URL}/api/scouting-studies`;

export function useScoutingStudies(status?: string) {
  return useQuery({
    queryKey: ['scouting-studies', status],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (status) searchParams.append('status', status);
      
      const url = searchParams.toString() ? `${STUDIES_URL}?${searchParams}` : STUDIES_URL;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch studies');
      const data = await response.json();
      return (data.studies || data.data || data || []) as ScoutingStudy[];
    },
  });
}

export function useScoutingStudy(studyId: string | undefined) {
  return useQuery({
    queryKey: ['scouting-study', studyId],
    queryFn: async () => {
      if (!studyId) return null;
      const response = await fetch(`${STUDIES_URL}/${studyId}`);
      if (!response.ok) throw new Error('Failed to fetch study');
      const data = await response.json();
      return (data.study || data) as ScoutingStudy;
    },
    enabled: !!studyId,
  });
}

export function useCreateStudy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (study: Partial<ScoutingStudy>) => {
      const response = await fetch(STUDIES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: study.name,
          description: study.description,
          problem_statement: study.problem_statement,
          context: study.context,
          objectives: study.objectives,
          constraints: study.constraints,
        }),
      });
      if (!response.ok) throw new Error('Failed to create study');
      const data = await response.json();
      return data.study || data;
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
      const response = await fetch(`${STUDIES_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update study');
      const data = await response.json();
      return { ...(data.study || data), id };
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
      const response = await fetch(`${STUDIES_URL}/${studyId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete study');
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

// ============================================================================
// RESEARCH (Phase 1) - Uses studySessionsService
// ============================================================================

export function useStudyResearch(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-research', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listResearch(studyId);
      return (response.research || response.data || response || []) as StudyResearch[];
    },
    enabled: !!studyId,
  });
}

export function useAddResearch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (research: Partial<StudyResearch>) => {
      const response = await studySessionsService.addResearch(research.study_id!, {
        title: research.title!,
        source_type: research.source_type || undefined,
        source_url: research.source_url || undefined,
        summary: research.summary || undefined,
        key_findings: research.key_findings || undefined,
        relevance_score: research.relevance_score || undefined,
      });
      return { ...(response.research || response), study_id: research.study_id };
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
      const response = await studySessionsService.updateResearch(study_id, id, updates);
      return { ...(response.research || response), study_id };
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
    mutationFn: async ({ researchId, studyId }: { 
      researchId: string; 
      studyId: string; 
      knowledgeDocId?: string | null;
      filePath?: string | null;
    }) => {
      await studySessionsService.deleteResearch(studyId, researchId);
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

// ============================================================================
// SOLUTIONS (Phase 2)
// ============================================================================

export function useStudySolutions(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-solutions', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listSolutions(studyId);
      return (response.solutions || response.data || response || []) as StudySolution[];
    },
    enabled: !!studyId,
  });
}

export function useAddSolution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (solution: Partial<StudySolution>) => {
      const response = await studySessionsService.addSolution(solution.study_id!, {
        category: solution.category!,
        name: solution.name!,
        description: solution.description || undefined,
        advantages: solution.advantages || undefined,
        disadvantages: solution.disadvantages || undefined,
      });
      return { ...(response.solution || response), study_id: solution.study_id };
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

// ============================================================================
// LONGLIST (Phase 3)
// ============================================================================

export type FullLonglistItem = Tables<'study_longlist'>;

export function useStudyLonglist(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-longlist', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listLonglist(studyId);
      return (response.longlist || response.data || response || []) as FullLonglistItem[];
    },
    enabled: !!studyId,
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
      const response = await studySessionsService.addToLonglist(item.study_id!, {
        technology_name: item.technology_name!,
        technology_id: item.technology_id || undefined,
        solution_id: item.solution_id || undefined,
        provider: item.provider || undefined,
        country: item.country || undefined,
        trl: item.trl || undefined,
        brief_description: item.brief_description || undefined,
        inclusion_reason: item.inclusion_reason || undefined,
        source: item.source || undefined,
      });
      return { ...(response.item || response), study_id: item.study_id };
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
      await studySessionsService.removeFromLonglist(studyId, id);
      return studyId;
    },
    onSuccess: (studyId) => {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      queryClient.invalidateQueries({ queryKey: ['study-extracted-technologies', studyId] });
      toast({ title: 'Tecnología eliminada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// SHORTLIST (Phase 4)
// ============================================================================

export function useStudyShortlist(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-shortlist', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listShortlist(studyId);
      return (response.shortlist || response.data || response || []) as StudyShortlistItem[];
    },
    enabled: !!studyId,
  });
}

export function useAddToShortlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Partial<StudyShortlistItem>) => {
      const response = await studySessionsService.addToShortlist(item.study_id!, {
        longlist_id: item.longlist_id!,
        selection_reason: item.selection_reason || undefined,
        priority: item.priority || undefined,
        notes: item.notes || undefined,
      });
      return { ...(response.item || response), study_id: item.study_id };
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
      await studySessionsService.removeFromShortlist(studyId, id);
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

// ============================================================================
// EVALUATIONS (Phase 5)
// ============================================================================

export function useStudyEvaluations(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-evaluations', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listEvaluations(studyId);
      return (response.evaluations || response.data || response || []) as StudyEvaluation[];
    },
    enabled: !!studyId,
  });
}

export function useUpsertEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (evaluation: Partial<StudyEvaluation>) => {
      const { shortlist, ...evalData } = evaluation;
      const response = await studySessionsService.upsertEvaluation(evaluation.study_id!, evalData as any);
      return { ...(response.evaluation || response), study_id: evaluation.study_id };
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

// ============================================================================
// REPORTS (Phase 6)
// ============================================================================

export function useStudyReports(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-reports', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const response = await studySessionsService.listReports(studyId);
      return (response.reports || response.data || response || []) as StudyReport[];
    },
    enabled: !!studyId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (report: Partial<StudyReport>) => {
      const response = await studySessionsService.createReport(report.study_id!, report);
      return { ...(response.report || response), study_id: report.study_id };
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
      const response = await studySessionsService.updateReport(study_id, id, updates);
      return { ...(response.report || response), study_id };
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

// ============================================================================
// STATS HELPER
// ============================================================================

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
