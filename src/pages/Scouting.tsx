import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Radar, 
  AlertCircle,
  Building2,
  MapPin,
  Rocket,
  X,
  Loader2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Ban,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { TRLBadge } from '@/components/TRLBadge';
import { ScoutingReportModal } from '@/components/ScoutingReportModal';
import { ScoutingTechFormModal } from '@/components/ScoutingTechFormModal';
import { useAuth } from '@/contexts/AuthContext';
// Use EXTERNAL scouting hooks - reads from Railway's Supabase
import { 
  useExternalScoutingQueue, 
  useExternalActiveScoutingQueue,
  useRejectedTechnologies,
  useChangeExternalScoutingStatus,
  useApproveExternalToTechnologies,
  useMoveExternalToRejected,
  useExternalScoutingCounts
} from '@/hooks/useExternalScoutingData';
import { QueueItemUI, RejectedTechnology } from '@/types/scouting';

const POLLING_INTERVAL = 5000; // 5 seconds (faster polling for live updates)
const HEARTBEAT_WARNING_MS = 2 * 60 * 1000; // 2 minutes without heartbeat = warning
const HEARTBEAT_CRITICAL_MS = 4 * 60 * 1000; // 4 minutes without heartbeat = likely stuck

// Phase labels and progress mapping
const PHASE_CONFIG: Record<string, { label: string; progress: number }> = {
  init: { label: 'Inicializando...', progress: 10 },
  analyzing: { label: '📊 Analizando base de datos...', progress: 20 },
  researching: { label: '📚 Buscando en papers académicos...', progress: 40 },
  validating: { label: '✅ Validando proveedores...', progress: 60 },
  extracting: { label: '📝 Extrayendo información...', progress: 80 },
  evaluating: { label: '⚖️ Evaluando tecnologías...', progress: 90 },
  completing: { label: '🏁 Finalizando...', progress: 95 },
};

// Get phase display info
const getPhaseInfo = (phase: string | null | undefined) => {
  if (!phase) return { label: 'Procesando...', progress: 5 };
  return PHASE_CONFIG[phase] || { label: phase, progress: 50 };
};

// Check heartbeat status
const getHeartbeatStatus = (lastHeartbeat: string | null | undefined): 'ok' | 'warning' | 'critical' => {
  if (!lastHeartbeat) return 'ok'; // No heartbeat data yet, assume ok
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  if (elapsed > HEARTBEAT_CRITICAL_MS) return 'critical';
  if (elapsed > HEARTBEAT_WARNING_MS) return 'warning';
  return 'ok';
};

// Get elapsed time since heartbeat in minutes
const getHeartbeatElapsedMinutes = (lastHeartbeat: string | null | undefined): number => {
  if (!lastHeartbeat) return 0;
  return Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 60000);
};

// Scouting config and history types (from Railway backend)
interface ScoutingConfig {
  pais: string | null;
  tipo: string;
  fuentes: string[];
  trl_min: number | null;
  keywords: string[];
  subcategoria: string | null;
  instrucciones_adicionales: string | null;
}

interface ScoutingLog {
  level: 'info' | 'error' | 'warn';
  phase: string;
  message: string;
  timestamp: string;
}

interface HistoryItem {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  trigger_type: string;
  triggered_by: string;
  config: ScoutingConfig;
  llm_model: string;
  results_summary: string | null;
  tokens_used: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  logs: ScoutingLog[];
  created_at: string;
  // New fields from backend heartbeat
  current_phase?: string | null;
  last_heartbeat?: string | null;
}

interface HistoryResponse {
  items: HistoryItem[];
  count: number;
}

interface JobStatus {
  job_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  current_phase: string | null;
  progress: {
    pages_analyzed: number;
    technologies_found: number;
    current_step: string | null;
    candidates_evaluating?: number;
    current_sources?: string[];
    last_action?: string;
  } | null;
  logs: ScoutingLog[];
  error_message: string | null;
}

interface LLMModel {
  id: string;
  name: string;
  description: string;
  cost_per_1m_tokens: number;
  recommended: boolean;
}

interface LLMProviderData {
  name: string;
  models: LLMModel[];
}

type LLMModelsResponse = Record<string, LLMProviderData>;

// Proxy helper - calls to Railway backend
async function proxyFetch<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('scouting-proxy', {
    body: { endpoint, method, body },
  });

  if (error) throw new Error(error.message);

  // Preserve backend details (e.g., 409 already running with job_id) for UI handling
  if (!data?.success) {
    const err = new Error(data?.error || 'Error en proxy') as Error & { details?: unknown };
    err.details = data?.details;
    throw err;
  }

  return data.data as T;
}

// API functions via proxy (for Railway backend - history, stats, etc.)
const fetchHistory = async (): Promise<HistoryResponse> => {
  return proxyFetch<HistoryResponse>('/api/scouting/history');
};

const fetchJobStatus = async (jobId: string): Promise<JobStatus> => {
  return proxyFetch<JobStatus>(`/api/scouting/status/${jobId}`);
};

const fetchLLMModels = async (): Promise<LLMModelsResponse> => {
  return proxyFetch<LLMModelsResponse>('/api/llm/models');
};

const runScouting = async (params: { 
  config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string };
  provider: string;
  model: string;
}) => {
  return proxyFetch<{ job_id: string }>('/api/scouting/run', 'POST', {
    config: params.config,
    provider: params.provider,
    model: params.model,
  });
};

const cancelScouting = async (jobId: string) => {
  const endpoints = [
    { endpoint: `/api/scouting/cancel/${jobId}`, method: 'POST' as const },
    { endpoint: `/api/scouting/${jobId}/cancel`, method: 'POST' as const },
    { endpoint: `/api/scouting/jobs/${jobId}/cancel`, method: 'POST' as const },
    { endpoint: `/api/scouting/cancel`, method: 'POST' as const, body: { job_id: jobId } },
  ];
  
  for (const { endpoint, method, body } of endpoints) {
    try {
      const result = await proxyFetch<{ success: boolean }>(endpoint, method, body);
      if (result.success) return result;
    } catch (e) {
      console.log(`[cancelScouting] Failed ${endpoint}:`, e);
    }
  }
  
  throw new Error('No se pudo cancelar el scouting - endpoint no disponible');
};

// Get elapsed time in minutes
const getElapsedMinutes = (startedAt: string): number => {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
};

// Score badge color helper
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500/20 text-green-600 border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
  if (score >= 40) return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
  return 'bg-red-500/20 text-red-600 border-red-500/30';
};

// Status helpers
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completado
        </Badge>
      );
    case 'running':
      return (
        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          En progreso
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Fallido
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getLogIcon = (level: string) => {
  switch (level) {
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
};

const Scouting = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'review' | 'pending_approval'
  const [expandedSection, setExpandedSection] = useState<string>(''); // For accordion behavior
  const [keywords, setKeywords] = useState('');
  const [tipo, setTipo] = useState('all');
  const [trlMin, setTrlMin] = useState('none');
  const [instructions, setInstructions] = useState('');
  const [selectedReport, setSelectedReport] = useState<HistoryItem | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [cancelConfirmJob, setCancelConfirmJob] = useState<HistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [assumedRunningJobId, setAssumedRunningJobId] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<QueueItemUI | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ tech: QueueItemUI; stage: 'analyst' | 'supervisor' | 'admin' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [forceCancelAttempts, setForceCancelAttempts] = useState(0);
  const [isForceCancelling, setIsForceCancelling] = useState(false);
  const previousRunningJobRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // External Supabase queries for scouting_queue (reads from Railway's Supabase)
  const { data: activeItems = [], isLoading: activeLoading, refetch: refetchActive } = useExternalActiveScoutingQueue();
  const { data: reviewItems = [], isLoading: reviewLoading, refetch: refetchReview } = useExternalScoutingQueue('review');
  const { data: pendingApprovalItems = [], isLoading: pendingApprovalLoading, refetch: refetchPendingApproval } = useExternalScoutingQueue('pending_approval');
  const { data: rejectedTechs = [], isLoading: rejectedLoading } = useRejectedTechnologies();
  const { data: counts, refetch: refetchCounts } = useExternalScoutingCounts();
  
  // Filtered items based on queueFilter
  const filteredQueueItems = useMemo(() => {
    if (queueFilter === 'all') return activeItems;
    if (queueFilter === 'review') return reviewItems;
    if (queueFilter === 'pending_approval') return pendingApprovalItems;
    return activeItems;
  }, [queueFilter, activeItems, reviewItems, pendingApprovalItems]);
  
  const isQueueLoading = queueFilter === 'all' ? activeLoading : 
    queueFilter === 'review' ? reviewLoading : pendingApprovalLoading;

  // Railway backend queries (history, stats)
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorObj,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['scouting-history'],
    queryFn: fetchHistory,
    refetchInterval: isPolling ? POLLING_INTERVAL : false,
  });

  const { data: llmModelsData, isLoading: llmModelsLoading, isError: llmModelsError, refetch: refetchLLMModels } = useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch technology counts per session from external DB
  const { data: techCountsBySession } = useQuery({
    queryKey: ['tech-counts-by-session-scouting'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-scouting-queue', {
        body: { action: 'count_by_session' }
      });
      if (error) throw error;
      return (data?.data || {}) as Record<string, number>;
    },
    refetchInterval: 30000,
  });

  // Mutations - use external hooks that read from Railway and write to Lovable Cloud
  const changeStatusMutation = useChangeExternalScoutingStatus();
  const approveToDbMutation = useApproveExternalToTechnologies();
  const moveToRejectedMutation = useMoveExternalToRejected();

  // User role checks
  const isAnalyst = profile?.role === 'analyst';
  const isSupervisorOrAdmin = profile?.role === 'supervisor' || profile?.role === 'admin';
  const userEmail = user?.email || 'unknown';

  // Detect running scouting job
  const history = historyData?.items ?? [];
  const runningJob = history.find(job => job.status === 'running');
  const activeJobId = runningJob?.id ?? assumedRunningJobId;
  const hasActiveJobId = !!activeJobId;

  // Fetch live job status when there's an active job id
  const { data: jobStatus, isLoading: jobStatusLoading } = useQuery({
    queryKey: ['scouting-job-status', activeJobId],
    queryFn: () => fetchJobStatus(activeJobId!),
    enabled: hasActiveJobId,
    refetchInterval: hasActiveJobId ? 3000 : false,
  });

  // If backend status says it's not running anymore, don't keep marking it as "running/stuck" in UI
  const isActuallyRunning = hasActiveJobId ? (jobStatus ? jobStatus.status === 'running' : true) : false;
  const hasRunningJob = hasActiveJobId && isActuallyRunning;

  // Determine heartbeat status for running job
  const heartbeatStatus = hasRunningJob && runningJob ? getHeartbeatStatus(runningJob.last_heartbeat) : 'ok';
  const heartbeatElapsedMinutes = hasRunningJob && runningJob ? getHeartbeatElapsedMinutes(runningJob.last_heartbeat) : 0;
  const currentPhase = runningJob?.current_phase ?? jobStatus?.current_phase;
  const phaseInfo = getPhaseInfo(currentPhase);
  const elapsedMinutes = hasRunningJob && runningJob ? getElapsedMinutes(runningJob.started_at) : 0;

  // Models by provider
  const modelsByProvider = llmModelsData ?? {};

  const availableModelValues = useMemo(() => {
    const values: string[] = [];
    for (const [providerKey, providerData] of Object.entries(modelsByProvider)) {
      for (const model of providerData.models) values.push(`${providerKey}/${model.id}`);
    }
    return values;
  }, [modelsByProvider]);

  // Ensure selectedModel is valid
  useEffect(() => {
    if (llmModelsLoading) return;
    if (availableModelValues.length === 0) return;
    if (selectedModel && availableModelValues.includes(selectedModel)) return;
    const preferred = availableModelValues.find((v) => v.startsWith('openai/')) ?? availableModelValues[0];
    setSelectedModel(preferred);
  }, [llmModelsLoading, availableModelValues, selectedModel]);

  // Polling effect for running jobs + auto-refresh on completion
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (hasRunningJob && runningJob) {
      const pollFn = async () => {
        setIsPolling(true);
        setLastPollTime(new Date());
        try {
          await Promise.all([
            refetchActive(),
            refetchReview(),
            refetchPendingApproval(),
            refetchCounts(),
            refetchHistory(),
          ]);
        } catch (error) {
          console.error('[Scouting] Polling error:', error);
        } finally {
          setIsPolling(false);
        }
      };
      
      pollFn();
      pollingIntervalRef.current = setInterval(pollFn, POLLING_INTERVAL);
      previousRunningJobRef.current = runningJob.id;
      
    } else if (runningJob && !hasRunningJob) {
      // History says "running" but backend status already says it's finished -> sync and refresh
      toast.success('Scouting finalizado - sincronizando...');
      setAssumedRunningJobId(null);
      Promise.all([
        refetchHistory(),
        refetchActive(),
        refetchReview(),
        refetchPendingApproval(),
        refetchCounts(),
      ]).then(() => {
        queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      });
      previousRunningJobRef.current = null;
      setIsPolling(false);

    } else if (previousRunningJobRef.current && !hasRunningJob) {
      // Scouting completed - refresh all queue data
      toast.success(`Scouting completado - actualizando lista...`);
      Promise.all([
        refetchActive(),
        refetchReview(),
        refetchPendingApproval(),
        refetchCounts(),
      ]).then(() => {
        queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      });
      previousRunningJobRef.current = null;
      setIsPolling(false);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [hasRunningJob, runningJob?.id, queryClient, refetchHistory, refetchReview, refetchActive, refetchPendingApproval, refetchCounts]);

  // Scouting mutation
  const scoutingMutation = useMutation({
    mutationFn: runScouting,
    onMutate: () => {
      toast.loading('Iniciando scouting...', { id: 'scouting-start' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      toast.success(`Scouting iniciado (Job ID: ${data.job_id?.slice(0, 8)}...)`, { id: 'scouting-start' });
      setKeywords('');
      setTipo('all');
      setTrlMin('none');
      setInstructions('');
      setActiveTab('queue');
      setQueueFilter('review');
    },
    onError: (error: Error & { details?: any }) => {
      const errorMessage = error.message || '';
      const jobIdFrom409 =
        error.details?.body?.detail?.job_id ||
        error.details?.body?.job_id ||
        null;

      if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('ya hay un scouting')) {
        if (jobIdFrom409) setAssumedRunningJobId(jobIdFrom409);
        toast.error('Ya hay un scouting en ejecución.', { id: 'scouting-start', duration: 8000 });
        setActiveTab('history');
        // Force refresh so the UI shows the running job panel/history as soon as possible
        queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      } else if (errorMessage.includes('429')) {
        toast.error('Límite semanal alcanzado.', { id: 'scouting-start', duration: 8000 });
      } else {
        toast.error(`Error: ${errorMessage}`, { id: 'scouting-start' });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelScouting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      toast.success('Scouting cancelado');
      setCancelConfirmJob(null);
      setForceCancelAttempts(0);
      setIsForceCancelling(false);
    },
    onError: () => {
      toast.error('Error al cancelar el scouting');
      setCancelConfirmJob(null);
    },
  });

  // Force cancel with multiple retry attempts and clear feedback
  const handleForceCancel = useCallback(async (jobId: string) => {
    setIsForceCancelling(true);
    setForceCancelAttempts(prev => prev + 1);
    
    const toastId = toast.loading(`Intentando cancelar (intento ${forceCancelAttempts + 1})...`);
    
    try {
      await cancelScouting(jobId);
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-job-status'] });
      toast.success('Job cancelado correctamente', { id: toastId });
      setForceCancelAttempts(0);
      setAssumedRunningJobId(null);
    } catch (error) {
      const attempt = forceCancelAttempts + 1;
      if (attempt < 3) {
        toast.error(`Cancelación fallida (intento ${attempt}/3). El backend puede no tener endpoint de cancelación.`, { id: toastId, duration: 5000 });
      } else {
        toast.error(
          `No se pudo cancelar después de ${attempt} intentos. El job puede haber terminado o el backend no soporta cancelación. Intenta refrescar.`,
          { id: toastId, duration: 8000 }
        );
      }
    } finally {
      setIsForceCancelling(false);
    }
  }, [forceCancelAttempts, queryClient]);

  const handleStartScouting = () => {
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywordList.length === 0) {
      toast.error('Introduce al menos una keyword');
      return;
    }
    if (!selectedModel) {
      toast.error('Selecciona un modelo LLM');
      return;
    }
    
    const [provider, ...modelParts] = selectedModel.split('/');
    const model = modelParts.join('/');
    
    scoutingMutation.mutate({
      config: {
        keywords: keywordList,
        tipo: tipo === 'all' ? '' : tipo,
        trl_min: trlMin === 'none' ? null : parseInt(trlMin),
        instructions: instructions || undefined,
      },
      provider,
      model,
    });
  };

  // Handle sending to approval
  const handleSendToApproval = (tech: QueueItemUI) => {
    changeStatusMutation.mutate({
      id: tech.id,
      status: 'pending_approval',
      reviewedBy: userEmail,
    });
  };

  // Handle approve to database
  const handleApproveToDb = (tech: QueueItemUI) => {
    approveToDbMutation.mutate({
      scoutingId: tech.id,
      approvedBy: userEmail,
    });
  };

  // Handle rejection confirmation
  const handleConfirmRejection = () => {
    if (!rejectionDialog || !rejectionReason.trim()) {
      toast.error('Debes indicar una razón de rechazo');
      return;
    }
    
    moveToRejectedMutation.mutate({
      scoutingId: rejectionDialog.tech.id,
      rejectionReason: rejectionReason.trim(),
      rejectedBy: userEmail,
      rejectionStage: rejectionDialog.stage,
    }, {
      onSuccess: () => {
        setRejectionDialog(null);
        setRejectionReason('');
      }
    });
  };


  // Render technology card
  const renderTechCard = (item: QueueItemUI, sectionId: string) => (
    <Card 
      key={item.id} 
      className="hover:shadow-md transition-all border cursor-pointer"
      onClick={() => {
        setSelectedTech(item);
        setShowFormModal(true);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{item.name}</CardTitle>
          <Badge className={getScoreColor(item.score)}>
            {item.score}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Building2 className="w-3 h-3" />
          {item.provider}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {item.country}
          </span>
          <TRLBadge trl={item.trl} />
        </div>
        
        {/* Action buttons based on status and role */}
        <div className="flex gap-2">
          {sectionId === 'review' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTech(item);
                  setShowFormModal(true);
                }}
              >
                <FileText className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendToApproval(item);
                }}
                disabled={changeStatusMutation.isPending}
              >
                <Send className="w-3 h-3 mr-1" />
                A Aprobación
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectionDialog({ tech: item, stage: 'analyst' });
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
          
          {sectionId === 'pending_approval' && isSupervisorOrAdmin && (
            <>
              <Button
                size="sm"
                className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveToDb(item);
                }}
                disabled={approveToDbMutation.isPending}
              >
                <Rocket className="w-3 h-3 mr-1" />
                Aprobar a BD
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectionDialog({ tech: item, stage: 'supervisor' });
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Rechazar
              </Button>
            </>
          )}
          
          {sectionId === 'pending_approval' && !isSupervisorOrAdmin && (
            <div className="text-xs text-muted-foreground text-center w-full">
              Esperando aprobación de supervisor
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render rejected technology card
  const renderRejectedCard = (item: RejectedTechnology) => (
    <Card key={item.id} className="border opacity-75">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{item["Nombre de la tecnología"]}</CardTitle>
          <Badge variant="destructive" className="text-xs">
            Rechazada
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Building2 className="w-3 h-3" />
          {item["Proveedor / Empresa"]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <strong>Razón:</strong> {item.rejection_reason}
        </div>
        <div className="text-xs text-muted-foreground">
          <strong>Por:</strong> {item.rejected_by} ({item.rejection_category || 'N/A'})
        </div>
        <div className="text-xs text-muted-foreground">
          {item.rejected_at && new Date(item.rejected_at).toLocaleDateString('es-ES')}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Radar className="w-8 h-8 text-primary" />
          Scouting Tecnológico
        </h1>
        <p className="text-muted-foreground mt-1">
          Descubre y rastrea nuevas tecnologías emergentes
        </p>
      </div>

      {/* Backend status / error banner */}
      {historyError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              No puedo leer el estado del scouting ahora mismo
            </CardTitle>
            <CardDescription>
              {String((historyErrorObj as any)?.message || 'Error al consultar el backend de scouting.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {assumedRunningJobId && !runningJob && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Hay un scouting en ejecución (detectado por el backend)
            </CardTitle>
            <CardDescription>
              Job ID: <span className="font-mono">{assumedRunningJobId}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCancelConfirmJob({
              id: assumedRunningJobId,
              started_at: new Date().toISOString(),
              completed_at: null,
              status: 'running',
              trigger_type: 'unknown',
              triggered_by: userEmail,
              config: { pais: null, tipo: '', fuentes: [], trl_min: null, keywords: [], subcategoria: null, instrucciones_adicionales: null },
              llm_model: '',
              results_summary: null,
              tokens_used: null,
              estimated_cost: null,
              error_message: null,
              logs: [],
              created_at: new Date().toISOString(),
            })}>
              <X className="w-4 h-4 mr-1" />
              Intentar cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>En revisión</CardDescription>
            <Eye className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {counts?.review ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pendiente aprobación</CardDescription>
            <Send className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {counts?.pending_approval ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Rechazadas</CardDescription>
            <Ban className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {counts?.rejected ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Scouting activo</CardDescription>
            <Radar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {hasRunningJob ? (
                <span className="text-green-600 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sí
                </span>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Warning - Railway shows running but no heartbeat for too long */}
      {hasRunningJob && runningJob && heartbeatStatus === 'critical' && elapsedMinutes > 6 && (
        <Card className="border-amber-500/50 bg-amber-500/5 mb-4">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Posible desincronización detectada
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  El backend de Railway reporta el job como "running" pero no ha enviado heartbeats en {heartbeatElapsedMinutes} minutos.
                  Esto puede significar que el job terminó pero Railway no actualizó su estado.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/scouting-monitor', '_blank')}
                    className="text-amber-700 border-amber-500 hover:bg-amber-50"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver Monitor (estado real)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAssumedRunningJobId(null);
                      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
                      toast.info('Limpiando estado local del job...');
                    }}
                    className="text-amber-700"
                  >
                    Descartar este job
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Progress Panel */}
      {hasRunningJob && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 animate-fade-in mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Radar className="w-7 h-7 text-primary" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Scouting en Progreso
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
                      En vivo
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {runningJob?.config?.keywords && (
                      <span>Buscando: <strong>{runningJob.config.keywords.join(', ')}</strong></span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setCancelConfirmJob(runningJob)}
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phase Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{phaseInfo.label}</span>
                <span className="text-muted-foreground">{phaseInfo.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${phaseInfo.progress}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background/60 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {jobStatus?.progress?.pages_analyzed ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Páginas analizadas</div>
              </div>
              <div className="bg-background/60 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {jobStatus?.progress?.technologies_found ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Tecnologías encontradas</div>
              </div>
              <div className="bg-background/60 rounded-lg p-3 text-center">
                <div className="text-lg font-medium text-foreground">
                  {elapsedMinutes} min
                </div>
                <div className="text-xs text-muted-foreground">Tiempo transcurrido</div>
              </div>
              <div className="bg-background/60 rounded-lg p-3 text-center">
                <div className={`text-lg font-medium ${
                  heartbeatStatus === 'ok' ? 'text-green-600' : 
                  heartbeatStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {heartbeatStatus === 'ok' ? '✓ Activo' : 
                   heartbeatStatus === 'warning' ? '⚠️ Lento' : '❌ Sin señal'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {runningJob?.last_heartbeat 
                    ? `Hace ${heartbeatElapsedMinutes} min`
                    : 'Sin heartbeat'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heartbeat Warning Banner */}
      {hasRunningJob && runningJob && (heartbeatStatus === 'warning' || heartbeatStatus === 'critical') && (
        <Card className={`border-2 animate-fade-in mb-6 ${heartbeatStatus === 'critical' ? 'border-destructive/50 bg-destructive/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-6 h-6 ${heartbeatStatus === 'critical' ? 'text-destructive' : 'text-yellow-600'}`} />
                <div>
                  <CardTitle className={`text-base flex items-center gap-2 ${heartbeatStatus === 'critical' ? 'text-destructive' : 'text-yellow-700'}`}>
                    {heartbeatStatus === 'critical' ? '⚠️ Job probablemente atascado' : '⏳ Posible retraso'}
                  </CardTitle>
                  <CardDescription>
                    Sin señal de heartbeat desde hace <strong>{heartbeatElapsedMinutes} minutos</strong>.
                    {heartbeatStatus === 'critical' && ' El proceso del backend puede haber fallado silenciosamente.'}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Job ID: <code className="font-mono bg-muted px-1 rounded">{runningJob.id.slice(0, 8)}...</code></span>
              <span>•</span>
              <span>Fase: {phaseInfo.label}</span>
              <span>•</span>
              <span>Tiempo total: {elapsedMinutes} min</span>
              {forceCancelAttempts > 0 && (
                <>
                  <span>•</span>
                  <span className="text-destructive">Intentos de cancelación: {forceCancelAttempts}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchHistory();
                  toast.info('Actualizando estado...');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualizar estado
              </Button>
              <Button
                variant={heartbeatStatus === 'critical' ? 'destructive' : 'outline'}
                size="sm"
                disabled={isForceCancelling}
                onClick={() => handleForceCancel(runningJob.id)}
                className={heartbeatStatus !== 'critical' ? 'text-yellow-700 border-yellow-500 hover:bg-yellow-50' : ''}
              >
                {isForceCancelling ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4 mr-1" />
                )}
                {isForceCancelling ? 'Cancelando...' : 'Forzar cancelación'}
              </Button>
              {(heartbeatStatus === 'critical' || forceCancelAttempts >= 2) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssumedRunningJobId(null);
                    queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
                    queryClient.invalidateQueries({ queryKey: ['scouting-job-status'] });
                    toast.success('Estado local limpiado. Si el job sigue en Railway, aparecerá de nuevo.');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Descartar job fantasma
                </Button>
              )}
            </div>
            {forceCancelAttempts >= 3 && (
              <p className="text-xs text-muted-foreground">
                💡 Si la cancelación no funciona, es posible que el backend externo no soporte esta operación.
                El job puede terminar por sí solo o requerir intervención manual en Railway.
              </p>
            )}
            {heartbeatStatus === 'critical' && elapsedMinutes > 5 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  🔍 <strong>Tip:</strong> Revisa el <a href="/scouting-monitor" className="text-primary underline hover:no-underline">Monitor de Scouting</a> para ver el estado real de las sesiones recibidas por webhook.
                  Si el monitor muestra la sesión como "completada" pero aquí aparece como "running", el backend de Railway puede estar desincronizado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue" className="relative">
            Cola de Revisión
            {hasRunningJob && (
              <span className="ml-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="new">Nuevo Scouting</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="mb-4">
            <p className="text-muted-foreground">
              Las tecnologías pasan por un proceso de revisión antes de añadirse a la base de datos principal.
            </p>
          </div>

          {/* Queue Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={queueFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQueueFilter('all')}
              className="flex items-center gap-2"
            >
              <Radar className="w-4 h-4" />
              Todas
              <Badge variant="secondary" className="ml-1 text-xs">
                {(counts?.review ?? 0) + (counts?.pending_approval ?? 0)}
              </Badge>
            </Button>
            <Button
              variant={queueFilter === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQueueFilter('review')}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-blue-500" />
              En Revisión
              <Badge variant="secondary" className="ml-1 text-xs bg-blue-500/20 text-blue-600">
                {counts?.review ?? 0}
              </Badge>
            </Button>
            <Button
              variant={queueFilter === 'pending_approval' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQueueFilter('pending_approval')}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-orange-500" />
              Pendiente Aprobación
              <Badge variant="secondary" className="ml-1 text-xs bg-orange-500/20 text-orange-600">
                {counts?.pending_approval ?? 0}
              </Badge>
            </Button>
            
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refetchActive();
                refetchReview();
                refetchPendingApproval();
                refetchCounts();
              }}
              disabled={isQueueLoading}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isQueueLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Queue Items Grid */}
          {isQueueLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredQueueItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueueItems.map((item) => {
                // Determine section ID based on item's queue_status or status
                const itemStatus = item.queue_status || item.status || 'review';
                const sectionId = itemStatus === 'pending_approval' ? 'pending_approval' : 'review';
                return renderTechCard(item, sectionId);
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radar className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {queueFilter === 'all' 
                  ? 'No hay tecnologías en la cola de revisión' 
                  : queueFilter === 'review' 
                    ? 'No hay tecnologías en revisión'
                    : 'No hay tecnologías pendientes de aprobación'}
              </p>
              {hasRunningJob && (
                <p className="text-sm text-primary mt-2">
                  Hay un scouting en progreso - las nuevas tecnologías aparecerán aquí pronto
                </p>
              )}
            </div>
          )}

          {/* Rejected Section - Collapsible */}
          <Card className="mt-6">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors bg-red-500/10 rounded-t-lg"
              onClick={() => setExpandedSection(expandedSection === 'rejected' ? '' : 'rejected')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ban className="w-5 h-5 text-red-500" />
                  <div>
                    <CardTitle className="text-base">Rechazadas</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Tecnologías descartadas - solo lectura
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm bg-red-500/20 text-red-600">
                    {counts?.rejected ?? 0}
                  </Badge>
                  <svg 
                    className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSection === 'rejected' ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            
            {expandedSection === 'rejected' && (
              <CardContent className="pt-4">
                {rejectedLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : rejectedTechs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rejectedTechs.map(renderRejectedCard)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Ban className="w-10 h-10 text-red-500 opacity-30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No hay tecnologías rechazadas
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* New Scouting Tab */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar Nuevo Scouting</CardTitle>
              <CardDescription>
                Configura los parámetros para buscar nuevas tecnologías
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Keywords</label>
                <Input
                  placeholder="PFAS, ZLD, membrane..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separa las keywords con comas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="TAP">TAP - Tratamiento Agua Potable</SelectItem>
                      <SelectItem value="TAR">TAR - Tratamiento Agua Residual</SelectItem>
                      <SelectItem value="GLR">GLR - Gestión Lodos/Residuos</SelectItem>
                      <SelectItem value="MON">MON - Monitorización</SelectItem>
                      <SelectItem value="RED">RED - Redes</SelectItem>
                      <SelectItem value="SOF">SOF - Software</SelectItem>
                      <SelectItem value="ENE">ENE - Energía</SelectItem>
                      <SelectItem value="EQU">EQU - Equipamiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">TRL mínimo</label>
                  <Select value={trlMin} onValueChange={setTrlMin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin mínimo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin mínimo</SelectItem>
                      <SelectItem value="5">TRL 5</SelectItem>
                      <SelectItem value="6">TRL 6</SelectItem>
                      <SelectItem value="7">TRL 7</SelectItem>
                      <SelectItem value="8">TRL 8</SelectItem>
                      <SelectItem value="9">TRL 9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Instrucciones adicionales (opcional)</label>
                <Textarea
                  placeholder="Instrucciones específicas para el scouting..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo LLM</label>
                {llmModelsError ? (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Error al cargar modelos</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchLLMModels()}
                      className="ml-auto"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      {llmModelsLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cargando modelos...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Seleccionar modelo" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(modelsByProvider).map(([providerKey, providerData]) => (
                        <SelectGroup key={providerKey}>
                          <SelectLabel className="font-semibold text-primary capitalize">
                            {providerData.name}
                          </SelectLabel>
                          {providerData.models.map((model) => (
                            <SelectItem 
                              key={model.id} 
                              value={`${providerKey}/${model.id}`}
                              className="py-2"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {model.description} • ${model.cost_per_1m_tokens}/1M tokens
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button 
                size="lg" 
                className="w-full"
                onClick={handleStartScouting}
                disabled={scoutingMutation.isPending || llmModelsLoading || !!llmModelsError || hasRunningJob}
              >
                {scoutingMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Iniciando scouting...
                  </>
                ) : hasRunningJob ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Scouting en progreso...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Iniciar Scouting
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Scoutings</CardTitle>
              <CardDescription>
                Registro de todos los scoutings ejecutados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Configuración</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Resultados</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id} className={item.status === 'failed' ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {new Date(item.started_at).toLocaleDateString('es-ES')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(item.started_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.config.keywords?.slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                            {(item.config.keywords?.length ?? 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(item.config.keywords?.length ?? 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            {item.status === 'running' && item.last_heartbeat && getHeartbeatStatus(item.last_heartbeat) !== 'ok' && (
                              <Badge className={`${
                                getHeartbeatStatus(item.last_heartbeat) === 'critical' 
                                  ? 'bg-red-500/20 text-red-600 border-red-500/30' 
                                  : 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
                              }`}>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {getHeartbeatStatus(item.last_heartbeat) === 'critical' ? 'Atascado' : 'Lento'}
                              </Badge>
                            )}
                            {item.status === 'running' && item.current_phase && (
                              <Badge variant="outline" className="text-xs">
                                {getPhaseInfo(item.current_phase).label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {item.status === 'completed' && (
                              <>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-green-600 font-medium">
                                    {/* Show real count from external DB if available, otherwise fallback to results_summary */}
                                    {techCountsBySession?.[item.id] !== undefined
                                      ? `${techCountsBySession[item.id]} en cola`
                                      : item.results_summary 
                                        ? `${JSON.parse(typeof item.results_summary === 'string' ? item.results_summary : JSON.stringify(item.results_summary))?.technologies_found ?? 'N/A'} encontradas`
                                        : 'Ver cola'
                                    }
                                  </span>
                                  {techCountsBySession?.[item.id] !== undefined && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                                      ✓ real
                                    </Badge>
                                  )}
                                </div>
                                {item.tokens_used && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.tokens_used.toLocaleString()} tokens
                                  </span>
                                )}
                              </>
                            )}
                            {item.status === 'running' && (
                              <>
                                <span className="text-xs text-blue-600">En progreso...</span>
                                {techCountsBySession?.[item.id] !== undefined && techCountsBySession[item.id] > 0 && (
                                  <span className="text-xs text-green-600">
                                    {techCountsBySession[item.id]} encontradas
                                  </span>
                                )}
                              </>
                            )}
                            {item.status === 'failed' && (
                              <span className="text-xs text-red-600">Error</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {item.llm_model || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'running' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCancelConfirmJob(item)}
                              disabled={cancelMutation.isPending}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedReport(item)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Radar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sin historial</h3>
                  <p className="text-muted-foreground">
                    No hay scoutings registrados todavía.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Detail Modal */}
      <ScoutingReportModal 
        report={selectedReport} 
        onClose={() => setSelectedReport(null)} 
      />

      {/* Technology Form Modal */}
      {selectedTech && (
        <ScoutingTechFormModal
          technology={selectedTech}
          open={showFormModal}
          onOpenChange={(open) => {
            setShowFormModal(open);
            if (!open) setSelectedTech(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
          }}
        />
      )}

      {/* Rejection Dialog */}
      <AlertDialog open={!!rejectionDialog} onOpenChange={() => setRejectionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de rechazar <strong>"{rejectionDialog?.tech.name}"</strong>. 
              Esta acción moverá la tecnología a la lista de rechazadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Razón del rechazo <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Indica el motivo por el que se rechaza esta tecnología..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRejection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectionReason.trim() || moveToRejectedMutation.isPending}
            >
              {moveToRejectedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Scouting Confirmation */}
      <AlertDialog open={!!cancelConfirmJob} onOpenChange={() => setCancelConfirmJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar scouting?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelConfirmJob && (
                <>
                  El scouting con keywords{' '}
                  <span className="font-medium">
                    {cancelConfirmJob.config.keywords?.join(', ') || 'N/A'}
                  </span>{' '}
                  será cancelado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelConfirmJob && cancelMutation.mutate(cancelConfirmJob.id)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sí, cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Scouting;
