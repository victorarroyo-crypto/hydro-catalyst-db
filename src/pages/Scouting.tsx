import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Radar, 
  Clock, 
  CalendarDays, 
  DollarSign, 
  AlertCircle,
  Building2,
  MapPin,
  Rocket,
  Check,
  X,
  Loader2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  RefreshCw,
  Sparkles
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScoutingTechDetailModal } from '@/components/ScoutingTechDetailModal';

const POLLING_INTERVAL = 10000; // 10 seconds
const NEW_ITEM_THRESHOLD = 30000; // 30 seconds for "Nueva" badge

// Types based on actual API response
interface ScoutingStats {
  scoutings_this_week: number;
  scoutings_this_month: number;
  cost_this_month: number;
  pending_technologies: number;
  limits?: {
    max_week: number;
    max_month: number;
    budget: number;
  };
}

// API response structure (Spanish fields from Railway backend)
interface QueueItemAPI {
  id: string;
  nombre: string;
  proveedor: string;
  pais: string;
  relevance_score: number;
  trl_estimado: number;
  status: string;
  created_at?: string;
  // Other fields we may receive
  web?: string;
  email?: string;
  descripcion?: string;
  tipo_sugerido?: string;
  subcategoria_sugerida?: string;
  ventaja_competitiva?: string;
  relevance_reason?: string;
  source_url?: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  converted_technology_id?: string;
  scouting_job_id?: string;
  updated_at?: string;
}

// Normalized structure for UI
interface QueueItem {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
  created_at?: string;
  // Extended fields for detail view
  description?: string;
  web?: string;
  suggestedType?: string;
  suggestedSubcategory?: string;
  competitiveAdvantage?: string;
  relevanceReason?: string;
}

interface QueueResponseAPI {
  items: QueueItemAPI[];
  count: number;
}

interface QueueResponse {
  items: QueueItem[];
  count: number;
}

// Transform API response to normalized structure
const normalizeQueueItem = (item: QueueItemAPI): QueueItem => ({
  id: item.id,
  name: item.nombre || 'Sin nombre',
  provider: item.proveedor || 'Desconocido',
  country: item.pais || 'N/A',
  score: item.relevance_score ?? 0,
  trl: item.trl_estimado ?? 0,
  status: item.status,
  created_at: item.created_at,
  description: item.descripcion,
  web: item.web,
  suggestedType: item.tipo_sugerido,
  suggestedSubcategory: item.subcategoria_sugerida,
  competitiveAdvantage: item.ventaja_competitiva,
  relevanceReason: item.relevance_reason,
});

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
}

interface HistoryResponse {
  items: HistoryItem[];
  count: number;
}

// Job status response from /api/scouting/status/{job_id}
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

// Proxy helper - all calls go through edge function to avoid CORS
async function proxyFetch<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('scouting-proxy', {
    body: { endpoint, method, body },
  });
  
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Error en proxy');
  return data.data as T;
}

// API functions via proxy
const fetchStats = async (): Promise<ScoutingStats> => {
  return proxyFetch<ScoutingStats>('/api/scouting/stats');
};

const fetchQueue = async (status: string): Promise<QueueResponse> => {
  const apiData = await proxyFetch<QueueResponseAPI>(`/api/scouting/queue?status=${status}`);
  return {
    items: apiData.items.map(normalizeQueueItem),
    count: apiData.count,
  };
};

const fetchHistory = async (): Promise<HistoryResponse> => {
  return proxyFetch<HistoryResponse>('/api/scouting/history');
};

const fetchJobStatus = async (jobId: string): Promise<JobStatus> => {
  return proxyFetch<JobStatus>(`/api/scouting/status/${jobId}`);
};

const fetchLLMModels = async (): Promise<LLMModelsResponse> => {
  return proxyFetch<LLMModelsResponse>('/api/llm/models');
};

const updateQueueItem = async ({ id, status }: { id: string; status: string }) => {
  const { data, error } = await supabase.functions.invoke('scouting-update-queue', {
    body: { id, status },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Error al actualizar');

  return data.result;
};

const runScouting = async (params: { 
  config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string };
  provider: string;
  model: string;
}) => {
  console.log('[Scouting] Iniciando via proxy:', '/api/scouting/run');
  console.log('[Scouting] Payload:', JSON.stringify(params, null, 2));
  
  const result = await proxyFetch<{ job_id: string }>('/api/scouting/run', 'POST', {
    config: params.config,
    provider: params.provider,
    model: params.model,
  });
  
  console.log('[Scouting] Success:', result);
  return result;
};

const cancelScouting = async (jobId: string) => {
  // Try different cancel endpoints that might exist on the backend
  const endpoints = [
    { endpoint: `/api/scouting/cancel/${jobId}`, method: 'POST' as const },
    { endpoint: `/api/scouting/${jobId}/cancel`, method: 'POST' as const },
    { endpoint: `/api/scouting/jobs/${jobId}/cancel`, method: 'POST' as const },
    { endpoint: `/api/scouting/cancel`, method: 'POST' as const, body: { job_id: jobId } },
  ];
  
  for (const { endpoint, method, body } of endpoints) {
    try {
      console.log(`[cancelScouting] Trying ${method} ${endpoint}`);
      const result = await proxyFetch<{ success: boolean }>(endpoint, method, body);
      if (result.success) {
        console.log(`[cancelScouting] Success with ${endpoint}`);
        return result;
      }
    } catch (e) {
      console.log(`[cancelScouting] Failed ${endpoint}:`, e);
    }
  }
  
  throw new Error('No se pudo cancelar el scouting - endpoint no disponible');
};

// Check if a job is potentially stuck (running for more than 10 minutes)
const isJobPotentiallyStuck = (startedAt: string): boolean => {
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  return (now - startTime) > tenMinutes;
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
  const [queueFilter, setQueueFilter] = useState('pending');
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
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [selectedTech, setSelectedTech] = useState<QueueItem | null>(null);
  const previousRunningJobRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['scouting-stats'],
    queryFn: fetchStats,
  });

  const { data: pendingQueue, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['scouting-queue', 'pending'],
    queryFn: () => fetchQueue('pending'),
  });

  const { data: reviewQueue, isLoading: reviewLoading } = useQuery({
    queryKey: ['scouting-queue', 'review'],
    queryFn: () => fetchQueue('review'),
  });

  const { data: approvedQueue, isLoading: approvedLoading } = useQuery({
    queryKey: ['scouting-queue', 'approved'],
    queryFn: () => fetchQueue('approved'),
  });

  const { data: rejectedQueue, isLoading: rejectedLoading } = useQuery({
    queryKey: ['scouting-queue', 'rejected'],
    queryFn: () => fetchQueue('rejected'),
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['scouting-history'],
    queryFn: fetchHistory,
    refetchInterval: isPolling ? POLLING_INTERVAL : false,
  });

  const { data: llmModelsData, isLoading: llmModelsLoading, isError: llmModelsError, refetch: refetchLLMModels } = useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Detect running scouting job
  const history = historyData?.items ?? [];
  const runningJob = history.find(job => job.status === 'running');
  const hasRunningJob = !!runningJob;

  // Fetch live job status when there's a running job
  const { data: jobStatus, isLoading: jobStatusLoading } = useQuery({
    queryKey: ['scouting-job-status', runningJob?.id],
    queryFn: () => fetchJobStatus(runningJob!.id),
    enabled: hasRunningJob && !!runningJob?.id,
    refetchInterval: hasRunningJob ? 3000 : false, // Poll every 3 seconds for live updates
  });

  // Check if an item is new (added in the last 30 seconds)
  const isNewItem = useCallback((itemId: string) => {
    return newItemIds.has(itemId);
  }, [newItemIds]);

  // Store refs to avoid stale closures
  const knownItemIdsRef = useRef<Set<string>>(new Set());
  const hasRunningJobRef = useRef(false);
  
  // Keep refs in sync
  useEffect(() => {
    hasRunningJobRef.current = hasRunningJob;
  }, [hasRunningJob]);

  // Effect to manage polling lifecycle
  useEffect(() => {
    // Clear any existing interval first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (hasRunningJob && runningJob) {
      console.log('[Scouting] Starting polling for running job:', runningJob.id);
      
      const pollFn = async () => {
        if (!hasRunningJobRef.current) {
          console.log('[Scouting] No running job, skipping poll');
          return;
        }
        
        setIsPolling(true);
        setLastPollTime(new Date());
        
        try {
          // Fetch queue
          const response = await fetchQueue('pending');
          const currentIds = new Set(response.items.map(item => item.id));
          
          // Find newly added items
          const newItems = response.items.filter(item => !knownItemIdsRef.current.has(item.id));
          
          if (newItems.length > 0) {
            console.log('[Scouting] Found new items:', newItems.map(i => i.name));
            
            // Mark new items for animation
            setNewItemIds(prev => {
              const updated = new Set(prev);
              newItems.forEach(item => updated.add(item.id));
              return updated;
            });
            
            // Clear "new" badge after threshold
            setTimeout(() => {
              setNewItemIds(prev => {
                const updated = new Set(prev);
                newItems.forEach(item => updated.delete(item.id));
                return updated;
              });
            }, NEW_ITEM_THRESHOLD);
            
            // Invalidate query to update UI
            queryClient.invalidateQueries({ queryKey: ['scouting-queue', 'pending'] });
            queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
          }
          
          // Update known items ref
          knownItemIdsRef.current = currentIds;
          
          // Also check if the job is still running
          await refetchHistory();
        } catch (error) {
          console.error('[Scouting] Polling error:', error);
        } finally {
          setIsPolling(false);
        }
      };
      
      // Initial poll
      pollFn();
      
      // Set up interval
      pollingIntervalRef.current = setInterval(pollFn, POLLING_INTERVAL);
      previousRunningJobRef.current = runningJob.id;
      
    } else if (previousRunningJobRef.current && !hasRunningJob) {
      // Job just completed - show notification
      console.log('[Scouting] Scouting job completed');
      
      // Count pending items and show toast
      const pendingCount = pendingQueue?.items?.length ?? 0;
      toast.success(`Scouting completado - ${pendingCount} tecnología(s) encontrada(s)`, {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        duration: 5000,
      });
      
      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      
      previousRunningJobRef.current = null;
      setIsPolling(false);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [hasRunningJob, runningJob?.id, queryClient, pendingQueue?.items?.length, refetchHistory]);

  // Initialize known items on first load
  useEffect(() => {
    if (pendingQueue?.items && knownItemIdsRef.current.size === 0) {
      knownItemIdsRef.current = new Set(pendingQueue.items.map(item => item.id));
    }
  }, [pendingQueue?.items]);

  // Models are already grouped by provider in the API response
  const modelsByProvider = llmModelsData ?? {};

  const availableModelValues = useMemo(() => {
    const values: string[] = [];
    for (const [providerKey, providerData] of Object.entries(modelsByProvider)) {
      for (const model of providerData.models) values.push(`${providerKey}/${model.id}`);
    }
    return values;
  }, [modelsByProvider]);

  // Ensure selectedModel is valid once models are loaded (prevents "se queda en groq" aunque el usuario elija GPT)
  useEffect(() => {
    if (llmModelsLoading) return;
    if (availableModelValues.length === 0) return;

    if (selectedModel && availableModelValues.includes(selectedModel)) return;

    const preferred =
      availableModelValues.find((v) => v.startsWith('openai/')) ??
      availableModelValues.find((v) => v.startsWith('gpt/')) ??
      availableModelValues[0];

    setSelectedModel(preferred);
  }, [llmModelsLoading, availableModelValues, selectedModel]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: updateQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      toast.success('Tecnología actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar la tecnología');
    },
  });

  const scoutingMutation = useMutation({
    mutationFn: runScouting,
    onMutate: () => {
      console.log('[Scouting] Mutation started...');
      toast.loading('Iniciando scouting...', { id: 'scouting-start' });
    },
    onSuccess: (data) => {
      console.log('[Scouting] Mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      toast.success(`Scouting iniciado (Job ID: ${data.job_id?.slice(0, 8)}...)`, { id: 'scouting-start' });
      setKeywords('');
      setTipo('all');
      setTrlMin('none');
      setInstructions('');
      // Switch to queue tab and open pending section to watch results
      setActiveTab('queue');
      setQueueFilter('pending');
    },
    onError: (error: Error) => {
      console.error('[Scouting] Mutation error:', error);
      
      const errorMessage = error.message || '';
      
      // Check for conflict error (409) - already running scouting
      if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('ya hay un scouting')) {
        toast.error(
          'Ya hay un scouting en ejecución. Espera a que termine o cancélalo desde la pestaña "Historial".',
          { id: 'scouting-start', duration: 8000 }
        );
        // Switch to history tab to show the running job
        setActiveTab('history');
      }
      // Check for rate limit error (429)
      else if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('límite')) {
        // Calculate next Monday (when weekly limit resets)
        const now = new Date();
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        
        const formatter = new Intl.DateTimeFormat('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        toast.error(
          `Límite semanal alcanzado (100 scoutings). Se reinicia el ${formatter.format(nextMonday)}.`,
          { id: 'scouting-start', duration: 8000 }
        );
      } else {
        toast.error(`Error: ${errorMessage || 'No se pudo iniciar el scouting'}`, { id: 'scouting-start' });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelScouting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      toast.success('Scouting cancelado');
      setCancelConfirmJob(null);
    },
    onError: () => {
      toast.error('Error al cancelar el scouting');
      setCancelConfirmJob(null);
    },
  });

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
    
    // Parse provider/model from selectedModel
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

  const pendingItems = pendingQueue?.items ?? [];
  const reviewItems = reviewQueue?.items ?? [];
  const approvedItems = approvedQueue?.items ?? [];
  const rejectedItems = rejectedQueue?.items ?? [];
  
  // Combine pending and review items into a single "En Revisión" section
  const allReviewItems = [...pendingItems, ...reviewItems];
  const reviewSectionLoading = pendingLoading || reviewLoading;
  
  const queueSections = [
    { 
      id: 'review', 
      title: 'En Revisión (Analista)', 
      items: allReviewItems, 
      loading: reviewSectionLoading,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Tecnologías para evaluar: editar, completar información y aprobar o rechazar'
    },
    { 
      id: 'approved', 
      title: 'Pendiente Aprobación Supervisor', 
      items: approvedItems, 
      loading: approvedLoading,
      icon: CheckCircle2,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: 'Sugeridas por analistas - esperando aprobación de Supervisor/Admin para añadir a BD'
    },
    { 
      id: 'rejected', 
      title: 'Rechazadas', 
      items: rejectedItems, 
      loading: rejectedLoading,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Tecnologías descartadas'
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Radar className="w-8 h-8 text-primary" />
          Scouting Tecnológico
        </h1>
        <p className="text-muted-foreground mt-1">
          Descubre y rastrea nuevas tecnologías emergentes en el sector del agua
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Scoutings esta semana</CardDescription>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.scoutings_this_week ?? 0}
            </div>
            {stats?.limits && (
              <p className="text-xs text-muted-foreground mt-1">
                Límite: {stats.limits.max_week}/semana
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Scoutings este mes</CardDescription>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.scoutings_this_month ?? 0}
            </div>
            {stats?.limits && (
              <p className="text-xs text-muted-foreground mt-1">
                Límite: {stats.limits.max_month}/mes
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Coste este mes</CardDescription>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${(stats?.cost_this_month ?? 0).toFixed(2)}`}
            </div>
            {stats?.limits && (
              <p className="text-xs text-muted-foreground mt-1">
                Presupuesto: ${stats.limits.budget.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tecnologías pendientes</CardDescription>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.pending_technologies ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

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
          {/* Live Progress Panel when Scouting is Running */}
          {hasRunningJob && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 animate-fade-in">
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
                        🔍 Scouting en Progreso
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
                          En vivo
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {runningJob?.config?.keywords && (
                          <span>Buscando: <strong>{runningJob.config.keywords.join(', ')}</strong></span>
                        )}
                        {runningJob?.llm_model && (
                          <span className="ml-2 text-xs opacity-75">• {runningJob.llm_model}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {jobStatusLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Stats */}
                <div className="grid grid-cols-3 gap-4">
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
                    <div className="text-sm font-medium text-foreground capitalize">
                      {jobStatus?.current_phase ?? jobStatus?.progress?.current_step ?? 'Iniciando...'}
                    </div>
                    <div className="text-xs text-muted-foreground">Fase actual</div>
                  </div>
                </div>

                {/* Live Logs */}
                {jobStatus?.logs && jobStatus.logs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      Últimos logs
                    </div>
                    <ScrollArea className="h-32 rounded-md border bg-background/80 p-3">
                      <div className="space-y-1.5">
                        {jobStatus.logs.slice(-8).reverse().map((log, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-2 text-xs font-mono ${
                              idx === 0 ? 'opacity-100' : 'opacity-70'
                            }`}
                          >
                            {getLogIcon(log.level)}
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                            </span>
                            <span className="text-foreground">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Polling indicator */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    Iniciado: {new Date(runningJob.started_at).toLocaleTimeString('es-ES')}
                  </span>
                  <div className="flex items-center gap-2">
                    {isPolling && (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Actualizando cola...</span>
                      </>
                    )}
                    {lastPollTime && !isPolling && (
                      <span>Última act. cola: {lastPollTime.toLocaleTimeString('es-ES')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-4">
            <p className="text-muted-foreground">
              Las tecnologías pasan por un proceso de revisión antes de añadirse a la base de datos principal.
              Solo las tecnologías con <span className="font-medium text-green-600">revisión completa</span> pueden transferirse.
            </p>
          </div>

          <div className="space-y-4">
            {queueSections.map((section) => {
              const Icon = section.icon;
              const isOpen = queueFilter === section.id;
              
              return (
                <Card 
                  key={section.id} 
                  className={`transition-all ${isOpen ? 'ring-2 ring-primary/20' : ''}`}
                >
                  <CardHeader 
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${section.bgColor} rounded-t-lg`}
                    onClick={() => setQueueFilter(isOpen ? '' : section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${section.color}`} />
                        <div>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          {section.loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            section.items.length
                          )}
                        </Badge>
                        <svg 
                          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isOpen && (
                    <CardContent className="pt-4">
                      {section.loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : section.items.length > 0 ? (
                        <div className="space-y-4">
                          {/* Action bar for approved items */}
                          {section.id === 'approved' && section.items.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                  {section.items.length} tecnología(s) lista(s) para añadir a la BD principal
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  // TODO: Implement bulk transfer to main DB
                                  toast.info('Funcionalidad de transferencia masiva en desarrollo');
                                }}
                              >
                                <Rocket className="w-4 h-4 mr-1" />
                                Transferir todas a BD
                              </Button>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {section.items.map((item) => {
                              const isNew = section.id === 'pending' && isNewItem(item.id);
                              return (
                                <Card 
                                  key={item.id} 
                                  className={`hover:shadow-md transition-all border cursor-pointer ${
                                    isNew ? 'animate-fade-in ring-2 ring-primary/30 bg-primary/5' : ''
                                  }`}
                                  onClick={() => setSelectedTech(item)}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">{item.name}</CardTitle>
                                        {isNew && (
                                          <Badge className="bg-primary text-primary-foreground text-xs shrink-0 animate-pulse">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Nueva
                                          </Badge>
                                        )}
                                      </div>
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
                                  
                                  {/* Ver ficha button */}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTech(item);
                                    }}
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Ver ficha completa
                                  </Button>
                                  
                                  {/* Status indicator */}
                                  <div className="text-xs text-muted-foreground text-center pt-1">
                                    Haz clic para ver detalles y acciones
                                  </div>
                                </CardContent>
                              </Card>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Icon className={`w-10 h-10 ${section.color} opacity-30 mb-3`} />
                          <p className="text-sm text-muted-foreground">
                            No hay tecnologías en esta fase
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
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
                                  {model.description} • {model.cost_per_1m_tokens === 0 ? (
                                    <span className="text-green-600 font-medium">Gratis</span>
                                  ) : (
                                    <span>${model.cost_per_1m_tokens}/1M tokens</span>
                                  )}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  El modelo seleccionado se usará para analizar y clasificar tecnologías
                </p>
              </div>

              <Button 
                size="lg" 
                className="w-full"
                onClick={handleStartScouting}
                disabled={scoutingMutation.isPending || llmModelsLoading || llmModelsError}
              >
                {scoutingMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : llmModelsLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5 mr-2" />
                )}
                {llmModelsLoading ? 'Cargando modelos...' : 'Iniciar Scouting'}
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
                Registro de todos los scoutings ejecutados - Haz clic en "Ver informe" para detalles completos
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
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Coste</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id} className={item.status === 'failed' ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {new Date(item.started_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
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
                          <div className="space-y-1">
                            {item.config.keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.config.keywords.slice(0, 3).map((kw, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                                {item.config.keywords.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.config.keywords.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {item.config.tipo && (
                              <div className="text-xs text-muted-foreground">
                                Tipo: {item.config.tipo}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(item.status)}
                            {item.status === 'running' && (
                              <>
                                {isJobPotentiallyStuck(item.started_at) && (
                                  <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Posiblemente atascado
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setCancelConfirmJob(item)}
                                  disabled={cancelMutation.isPending}
                                >
                                  {cancelMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {item.llm_model || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.estimated_cost !== null 
                            ? `$${item.estimated_cost.toFixed(4)}` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReport(item)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver informe
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground/50 mb-4" />
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

      {/* Technology Detail Modal */}
      <ScoutingTechDetailModal
        technology={selectedTech}
        onClose={() => setSelectedTech(null)}
        onStatusChange={() => {
          queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirmJob} onOpenChange={() => setCancelConfirmJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este scouting en ejecución?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelConfirmJob && (
                <>
                  El scouting con keywords{' '}
                  <span className="font-medium">
                    {cancelConfirmJob.config.keywords?.join(', ') || 'N/A'}
                  </span>{' '}
                  será cancelado. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              No, mantener
            </AlertDialogCancel>
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
                'Sí, cancelar scouting'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Scouting;
