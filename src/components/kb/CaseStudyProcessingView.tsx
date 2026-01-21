import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileSearch,
  Target,
  GitBranch,
  Scale,
  TrendingUp,
  Lightbulb,
  List,
  FileSpreadsheet,
  Database,
  Save,
  RefreshCw,
  XOctagon,
  AlertTriangle,
  GitMerge,
  Info,
} from 'lucide-react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { supabase } from '@/integrations/supabase/client'; // Lovable Supabase for broadcasts
import { cn } from '@/lib/utils';
import { SimilarCasesModal, SimilarCase } from './SimilarCasesModal';

// 10 fases visuales para v11
const PHASES = [
  { id: 'classifying', label: 'Clasificación', icon: FileSearch, range: [0, 10] },
  { id: 'extracting_context', label: 'Contexto', icon: Target, range: [10, 20] },
  { id: 'extracting_methodology', label: 'Metodología', icon: GitBranch, range: [20, 28] },
  { id: 'extracting_analysis', label: 'Análisis', icon: Scale, range: [28, 40] },
  { id: 'extracting_results', label: 'Resultados', icon: TrendingUp, range: [40, 50] },
  { id: 'extracting_lessons', label: 'Lecciones', icon: Lightbulb, range: [50, 58] },
  { id: 'listing_technologies', label: 'Inventario', icon: List, range: [58, 65] },
  { id: 'enriching_technologies', label: 'Fichas', icon: FileSpreadsheet, range: [65, 85] },
  { id: 'matching_technologies', label: 'Matching', icon: Database, range: [85, 95] },
  { id: 'saving', label: 'Guardando', icon: Save, range: [95, 100] },
] as const;

// Mapeo de todas las fases webhook a steps visuales (incluye legacy v10 y v12)
const PHASE_TO_STEP_MAP: Record<string, string> = {
  // v12: Multi-documento
  'accumulating': 'classifying',
  
  // v11 phases
  'classifying': 'classifying',
  'classification_complete': 'extracting_context',
  'extracting_context': 'extracting_context',
  'context_complete': 'extracting_methodology',
  'extracting_methodology': 'extracting_methodology',
  'methodology_complete': 'extracting_analysis',
  'extracting_analysis': 'extracting_analysis',
  'analysis_complete': 'extracting_results',
  'extracting_results': 'extracting_results',
  'results_complete': 'extracting_lessons',
  'extracting_lessons': 'extracting_lessons',
  'lessons_complete': 'listing_technologies',
  'listing_technologies': 'listing_technologies',
  'technologies_listed': 'enriching_technologies',
  'enriching_technologies': 'enriching_technologies',
  'technologies_enriched': 'matching_technologies',
  'matching_technologies': 'matching_technologies',
  'matching_complete': 'saving',
  'similar_found': 'matching_technologies', // Show in matching phase
  'saving': 'saving',
  'completed': 'saving',
  'complete': 'saving',
  
  // Legacy v10 mapping
  'pending': 'classifying',
  'uploading': 'classifying',
  'extracting': 'extracting_context',
  'extraction_complete': 'extracting_analysis',
  'reviewing': 'extracting_analysis',
  'review_complete': 'extracting_results',
  'checking_technologies': 'listing_technologies',
  'tech_check_complete': 'enriching_technologies',
  'matching': 'matching_technologies',
  'processing': 'extracting_context',
};

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_user_decision';

interface ResultData {
  similar_cases?: SimilarCase[];
  current_problem?: string;
  awaiting_merge_decision?: boolean;
  [key: string]: unknown;
}

interface CaseStudyJob {
  id: string;
  status: JobStatus;
  current_phase: string | null;
  progress_percentage: number;
  error_message: string | null;
  quality_score?: number | null;
  technologies_found?: number | null;
  technologies_new?: number | null;
  case_study_id?: string | null;
  result_data?: ResultData | null;
}

interface CaseStudyProcessingViewProps {
  jobId: string;
  onCompleted: (jobId: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}

function getPhaseIndex(currentPhase: string | null, progress: number): number {
  if (!currentPhase) {
    // Estimate from progress
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (progress >= PHASES[i].range[0]) {
        return i;
      }
    }
    return 0;
  }
  
  const mappedStep = PHASE_TO_STEP_MAP[currentPhase] || currentPhase;
  const index = PHASES.findIndex(p => p.id === mappedStep);
  return index >= 0 ? index : 0;
}

function getStepStatus(
  stepIndex: number, 
  currentIndex: number, 
  jobStatus: 'completed' | 'processing' | 'failed'
): 'completed' | 'processing' | 'pending' | 'failed' {
  if (jobStatus === 'failed') {
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'failed';
    return 'pending';
  }
  
  if (jobStatus === 'completed') {
    return 'completed';
  }
  
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'processing';
  return 'pending';
}

function StepIcon({ 
  status, 
  Icon 
}: { 
  status: 'completed' | 'processing' | 'pending' | 'failed';
  Icon: React.ElementType;
}) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  if (status === 'processing') {
    return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
  }
  if (status === 'failed') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Icon className="h-4 w-4 text-muted-foreground/50" />;
}

function QualityScoreBadge({ score }: { score: number }) {
  const colorClass = score >= 70 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : score >= 50 
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  
  return (
    <Badge className={colorClass}>
      Calidad: {score}%
    </Badge>
  );
}

export const CaseStudyProcessingView: React.FC<CaseStudyProcessingViewProps> = ({
  jobId,
  onCompleted,
  onCancel,
  onRetry,
}) => {
  const [job, setJob] = useState<CaseStudyJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSimilarModal, setShowSimilarModal] = useState(false);

  // Fetch initial job state
  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await externalSupabase
        .from('case_study_jobs')
        .select('id, status, current_phase, progress_percentage, error_message, quality_score, technologies_found, technologies_new, case_study_id, result_data')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('[ProcessingView] Error fetching job:', error);
      } else if (data) {
        console.log('[ProcessingView] Initial job state:', data);
        const jobData = data as CaseStudyJob;
        setJob(jobData);
        
        if (data.status === 'completed') {
          onCompleted(data.id);
        }
        
        // v12.4: similar_found is now INFO only, modal shown post-completion if has_similar_cases
        // No automatic modal opening during processing
      }
      setIsLoading(false);
    };

    fetchJob();
  }, [jobId, onCompleted]);

  // Subscribe to Lovable broadcast channel for real-time updates from webhook
  useEffect(() => {
    console.log(`[ProcessingView] Subscribing to broadcast channel for job ${jobId}`);
    
    const channel = supabase
      .channel(`case-study-progress-${jobId}`)
      .on('broadcast', { event: 'progress' }, (payload) => {
        console.log('[ProcessingView] Broadcast received:', payload);
        
        const data = payload.payload;
        if (!data) return;
        
        // Map broadcast payload to job state
        setJob(prev => {
          const status = data.status || prev?.status || 'processing';
          const newJob: CaseStudyJob = {
            id: jobId,
            status: status as JobStatus,
            current_phase: data.event || data.current_phase || prev?.current_phase || null,
            progress_percentage: data.progress ?? data.progress_percentage ?? prev?.progress_percentage ?? 0,
            error_message: data.error_message || prev?.error_message || null,
            quality_score: data.quality_score ?? prev?.quality_score,
            technologies_found: data.technologies_count ?? data.technologies_found ?? prev?.technologies_found,
            technologies_new: data.technologies_new ?? prev?.technologies_new,
            case_study_id: data.case_study_id || prev?.case_study_id,
            result_data: data.result_data || prev?.result_data,
          };
          
          console.log('[ProcessingView] Updated job state:', newJob);
          return newJob;
        });
        
        // Check for completion
        if (data.status === 'completed') {
          console.log('[ProcessingView] Job completed via broadcast');
          onCompleted(jobId);
        }
      })
      .subscribe((status) => {
        console.log(`[ProcessingView] Broadcast subscription status: ${status}`);
      });

    return () => {
      console.log(`[ProcessingView] Unsubscribing from broadcast channel for job ${jobId}`);
      supabase.removeChannel(channel);
    };
  }, [jobId, onCompleted]);

  // Polling fallback: fetch from external DB every 5 seconds
  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed') {
      return; // Stop polling when job is done
    }

    const pollInterval = setInterval(async () => {
      console.log('[ProcessingView] Polling external DB for job status');
      const { data, error } = await externalSupabase
        .from('case_study_jobs')
        .select('id, status, current_phase, progress_percentage, error_message, quality_score, technologies_found, technologies_new, case_study_id, result_data')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        console.log('[ProcessingView] Poll result:', data);
        const jobData = data as CaseStudyJob;
        setJob(jobData);

        if (jobData.status === 'completed') {
          onCompleted(jobData.id);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [jobId, job?.status, onCompleted]);

  const handleSimilarDecisionMade = () => {
    // Refetch job state after decision
    externalSupabase
      .from('case_study_jobs')
      .select('id, status, current_phase, progress_percentage, error_message, quality_score, technologies_found, technologies_new, case_study_id, result_data')
      .eq('id', jobId)
      .single()
      .then(({ data }) => {
        if (data) {
          setJob(data as CaseStudyJob);
        }
      });
  };

  // Get similar cases data for modal - support both completed (similar_cases) and preview (similar_cases_preview)
  const similarCasesRaw = job?.result_data?.similar_cases || job?.result_data?.similar_cases_preview || [];
  const similarCases = Array.isArray(similarCasesRaw) ? similarCasesRaw as SimilarCase[] : [];
  const currentProblem = (job?.result_data?.current_problem || job?.result_data?.current_problem_preview) as string | undefined;
  const hasSimilarCasesPostCompletion = job?.result_data?.has_similar_cases && similarCases.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <p className="text-muted-foreground">No se encontró el trabajo de procesamiento</p>
          <Button variant="outline" onClick={onCancel}>
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentIndex = getPhaseIndex(job.current_phase, job.progress_percentage);
  const currentPhaseLabel = PHASES[currentIndex]?.label || 'Procesando...';
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';
  // v12.4: awaiting_user_decision is now legacy, kept for backward compatibility
  const isAwaitingDecision = job.status === 'awaiting_user_decision';
  // Check if we have similar_cases_preview (during processing) for info banner
  const previewCases = job?.result_data?.similar_cases_preview;
  const hasSimilarCasesPreview = !isCompleted && !isFailed && Array.isArray(previewCases) && previewCases.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isFailed ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Error en el procesamiento
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Procesamiento completado
                </>
              ) : isAwaitingDecision ? (
                <>
                  <GitMerge className="h-5 w-5 text-amber-500" />
                  Acción requerida
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Procesando Caso de Estudio
                </>
              )}
            </CardTitle>
            {isFailed && (
              <Badge variant="destructive">Error</Badge>
            )}
            {isCompleted && (
              <Badge className="bg-green-600">Completado</Badge>
            )}
            {isAwaitingDecision && (
              <Badge className="bg-amber-500">Decisión pendiente</Badge>
            )}
          </div>
          
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress bar with percentage and phase label */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isAwaitingDecision ? 'Casos similares encontrados' : currentPhaseLabel}
              </span>
              <span className="font-medium">{job.progress_percentage}%</span>
            </div>
            <Progress value={job.progress_percentage} className="h-2" />
          </div>

          {/* 10 Phases Grid (2x5) */}
          <div className="grid grid-cols-5 gap-2">
            {PHASES.map((phase, index) => {
              const stepStatus = getStepStatus(index, currentIndex, isFailed ? 'failed' : isCompleted ? 'completed' : 'processing');
              const Icon = phase.icon;
              
              return (
                <div
                  key={phase.id}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
                    stepStatus === 'completed' && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                    stepStatus === 'processing' && "bg-primary/5 border-primary/30",
                    stepStatus === 'pending' && "bg-muted/30 border-muted",
                    stepStatus === 'failed' && "bg-destructive/5 border-destructive/20"
                  )}
                >
                  <StepIcon status={stepStatus} Icon={Icon} />
                  <span className={cn(
                    "text-xs text-center font-medium",
                    stepStatus === 'completed' && "text-green-700 dark:text-green-300",
                    stepStatus === 'processing' && "text-primary",
                    stepStatus === 'pending' && "text-muted-foreground/60",
                    stepStatus === 'failed' && "text-destructive"
                  )}>
                    {phase.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* v12.4: Informational banner during processing when similar cases are found */}
          {hasSimilarCasesPreview && !isAwaitingDecision && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Se detectaron {previewCases?.length || 0} casos similares. 
                  Podrás revisarlos cuando termine el procesamiento.
                </p>
              </div>
            </div>
          )}

          {/* Legacy: Awaiting decision message (backward compatibility for old jobs) */}
          {isAwaitingDecision && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <GitMerge className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Se encontraron casos de estudio similares
                  </p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    Puedes fusionar con uno existente o crear un nuevo caso.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 gap-2"
                    onClick={() => setShowSimilarModal(true)}
                  >
                    <GitMerge className="h-4 w-4" />
                    Ver opciones
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* v12.4: Post-completion section when has_similar_cases is true */}
          {isCompleted && hasSimilarCasesPostCompletion && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <GitMerge className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Caso creado - Se encontraron casos similares
                  </p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    Puedes revisar los casos similares y fusionarlos si corresponde.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 gap-2"
                    onClick={() => setShowSimilarModal(true)}
                  >
                    <GitMerge className="h-4 w-4" />
                    Ver casos similares ({similarCases.length})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics badges (show when progress > 65%) */}
          {job.progress_percentage > 65 && (job.technologies_found || job.technologies_new || job.quality_score) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              {job.technologies_found !== null && job.technologies_found !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <Database className="h-3 w-3" />
                  {job.technologies_found} tecnologías
                </Badge>
              )}
              {job.technologies_new !== null && job.technologies_new !== undefined && job.technologies_new > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {job.technologies_new} nuevas
                </Badge>
              )}
              {job.quality_score !== null && job.quality_score !== undefined && (
                <QualityScoreBadge score={job.quality_score} />
              )}
            </div>
          )}

          {/* Error message */}
          {isFailed && job.error_message && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Error en el procesamiento</p>
                  <p className="mt-1 text-muted-foreground">{job.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estimated time */}
          {!isFailed && !isCompleted && !isAwaitingDecision && (
            <p className="text-center text-sm text-muted-foreground">
              Tiempo estimado: ~2-3 minutos
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {isFailed ? (
              <>
                <Button variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button onClick={onRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </>
            ) : !isCompleted && !isAwaitingDecision ? (
              <Button variant="outline" onClick={onCancel} className="gap-2">
                <XOctagon className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Similar Cases Modal */}
      <SimilarCasesModal
        open={showSimilarModal}
        onOpenChange={setShowSimilarModal}
        jobId={jobId}
        similarCases={similarCases}
        currentProblem={currentProblem}
        onDecisionMade={handleSimilarDecisionMade}
        sourceCaseId={job?.case_study_id || undefined}
      />
    </>
  );
};
