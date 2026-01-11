import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileSearch,
  KeyRound,
  ShieldCheck,
  Database,
  RefreshCw,
  Save,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// All phases that Railway sends
type ProcessingPhase = 
  | 'pending'
  | 'uploading'
  | 'extracting' 
  | 'extraction_complete'
  | 'reviewing' 
  | 'review_complete'
  | 'checking_technologies'
  | 'tech_check_complete'
  | 'matching'
  | 'matching_complete'
  | 'saving'
  | 'completed' 
  | 'failed';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface CaseStudyJob {
  id: string;
  status: JobStatus;
  current_phase: ProcessingPhase | null;
  progress_percentage: number;
  error_message: string | null;
}

interface CaseStudyProcessingViewProps {
  jobId: string;
  onCompleted: (jobId: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}

// Define visible steps (we group intermediate phases into these)
const PROCESSING_STEPS: { phase: string; label: string; icon: React.ReactNode }[] = [
  { phase: 'extracting', label: 'Extrayendo texto de documentos', icon: <FileSearch className="h-4 w-4" /> },
  { phase: 'reviewing', label: 'Revisando y estructurando contenido', icon: <KeyRound className="h-4 w-4" /> },
  { phase: 'matching', label: 'Buscando tecnologías en base de datos', icon: <Database className="h-4 w-4" /> },
  { phase: 'saving', label: 'Guardando resultados', icon: <Save className="h-4 w-4" /> },
  { phase: 'completed', label: 'Procesamiento completado', icon: <ShieldCheck className="h-4 w-4" /> },
];

// Map all phases to their corresponding visible step
const PHASE_TO_STEP_MAP: Record<string, string> = {
  'pending': 'extracting',
  'uploading': 'extracting',
  'extracting': 'extracting',
  'extraction_complete': 'extracting',
  'reviewing': 'reviewing',
  'review_complete': 'reviewing',
  'checking_technologies': 'matching',
  'tech_check_complete': 'matching',
  'matching': 'matching',
  'matching_complete': 'matching',
  'saving': 'saving',
  'completed': 'completed',
  'failed': 'failed',
};

const getPhaseIndex = (phase: ProcessingPhase | null): number => {
  if (!phase) return -1;
  const mappedPhase = PHASE_TO_STEP_MAP[phase] || phase;
  return PROCESSING_STEPS.findIndex(step => step.phase === mappedPhase);
};

const getStepStatus = (stepIndex: number, currentPhaseIndex: number, jobStatus: JobStatus): 'completed' | 'processing' | 'pending' | 'failed' => {
  if (jobStatus === 'failed') {
    if (stepIndex < currentPhaseIndex) return 'completed';
    if (stepIndex === currentPhaseIndex) return 'failed';
    return 'pending';
  }
  if (jobStatus === 'completed') return 'completed';
  if (stepIndex < currentPhaseIndex) return 'completed';
  if (stepIndex === currentPhaseIndex) return 'processing';
  return 'pending';
};

const StepIcon: React.FC<{ status: 'completed' | 'processing' | 'pending' | 'failed' }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'pending':
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

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
        .select('id, status, current_phase, progress_percentage, error_message')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
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
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No se pudo cargar el estado del procesamiento.</AlertDescription>
      </Alert>
    );
  }

  const currentPhaseIndex = getPhaseIndex(job.current_phase);
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
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
              Analizando documentos...
            </>
          )}
        </h3>
        {job.current_phase && !isCompleted && !isFailed && (
          <p className="text-xs text-muted-foreground mt-1">
            Fase actual: {job.current_phase}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={job.progress_percentage} className="h-2" />
        <p className="text-sm text-center text-muted-foreground">
          {job.progress_percentage}% completado
        </p>
      </div>

      {/* Steps list */}
      <div className="space-y-3">
        {PROCESSING_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(index, currentPhaseIndex, job.status);
          return (
            <div
              key={step.phase}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                stepStatus === 'processing' 
                  ? 'bg-primary/5 border border-primary/20' 
                  : stepStatus === 'failed'
                  ? 'bg-destructive/5 border border-destructive/20'
                  : 'bg-muted/30'
              }`}
            >
              <StepIcon status={stepStatus} />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-muted-foreground">{step.icon}</span>
                <span className={`text-sm ${
                  stepStatus === 'completed' ? 'text-muted-foreground' :
                  stepStatus === 'processing' ? 'font-medium' :
                  stepStatus === 'failed' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {isFailed && job.error_message && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{job.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Estimated time */}
      {!isFailed && !isCompleted && (
        <p className="text-center text-sm text-muted-foreground">
          Tiempo estimado: ~2 minutos
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-2">
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
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
};