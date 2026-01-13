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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

// Mapeo de todas las fases webhook a steps visuales (incluye legacy v10)
const PHASE_TO_STEP_MAP: Record<string, string> = {
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

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface CaseStudyJob {
  id: string;
  status: JobStatus;
  current_phase: string | null;
  progress_percentage: number;
  error_message: string | null;
  phase_label?: string | null;
  quality_score?: number | null;
  technologies_found?: number | null;
  technologies_new?: number | null;
  document_type?: string | null;
  problem_title?: string | null;
  case_study_id?: string | null;
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
  jobStatus: JobStatus
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

  // Fetch initial job state
  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('case_study_jobs')
        .select('id, status, current_phase, progress_percentage, error_message, phase_label, quality_score, technologies_found, technologies_new, document_type, problem_title, case_study_id')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('[ProcessingView] Error fetching job:', error);
      } else if (data) {
        console.log('[ProcessingView] Initial job state:', data);
        setJob(data as CaseStudyJob);
        if (data.status === 'completed') {
          onCompleted(data.id);
        }
      }
      setIsLoading(false);
    };

    fetchJob();
  }, [jobId, onCompleted]);

  // Subscribe to realtime updates
  useEffect(() => {
    console.log(`[ProcessingView] Subscribing to realtime updates for job ${jobId}`);
    
    const channel = supabase
      .channel(`case_study_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'case_study_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[ProcessingView] Realtime update received:', payload.new);
          const newData = payload.new as CaseStudyJob;
          setJob(newData);
          
          if (newData.status === 'completed') {
            console.log('[ProcessingView] Job completed, calling onCompleted');
            onCompleted(newData.id);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[ProcessingView] Subscription status: ${status}`);
      });

    return () => {
      console.log(`[ProcessingView] Unsubscribing from job ${jobId}`);
      supabase.removeChannel(channel);
    };
  }, [jobId, onCompleted]);

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
  const currentPhaseLabel = job.phase_label || PHASES[currentIndex]?.label || 'Procesando...';
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  return (
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
        </div>
        
        {/* Document info */}
        {(job.document_type || job.problem_title) && (
          <div className="mt-2 text-sm text-muted-foreground">
            {job.document_type && <span className="font-medium">{job.document_type}</span>}
            {job.document_type && job.problem_title && ' · '}
            {job.problem_title && <span>{job.problem_title}</span>}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress bar with percentage and phase label */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{currentPhaseLabel}</span>
            <span className="font-medium">{job.progress_percentage}%</span>
          </div>
          <Progress value={job.progress_percentage} className="h-2" />
        </div>

        {/* 10 Phases Grid (2x5) */}
        <div className="grid grid-cols-5 gap-2">
          {PHASES.map((phase, index) => {
            const stepStatus = getStepStatus(index, currentIndex, job.status as JobStatus);
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
        {!isFailed && !isCompleted && (
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
          ) : !isCompleted ? (
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <XOctagon className="h-4 w-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
