import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Radar, 
  Building2,
  MapPin,
  Rocket,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  Send,
  X
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { TRLBadge } from '@/components/TRLBadge';
import { ScoutingTechFormModal } from '@/components/ScoutingTechFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useExternalScoutingQueue, 
  useExternalActiveScoutingQueue,
  useRejectedTechnologies,
  useChangeExternalScoutingStatus,
  useApproveExternalToTechnologies,
  useMoveExternalToRejected,
  useExternalScoutingCounts
} from '@/hooks/useExternalScoutingData';
import { QueueItemUI } from '@/types/scouting';

// Score badge color helper
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500/20 text-green-600 border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
  if (score >= 40) return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
  return 'bg-red-500/20 text-red-600 border-red-500/30';
};

// LLM Models types
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

  if (!data?.success) {
    const err = new Error(data?.error || 'Error en proxy') as Error & { details?: unknown };
    err.details = data?.details;
    throw err;
  }

  return data.data as T;
}

// API functions via proxy
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

const Scouting = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [queueFilter, setQueueFilter] = useState('all');
  const [keywords, setKeywords] = useState('');
  const [tipo, setTipo] = useState('all');
  const [trlMin, setTrlMin] = useState('none');
  const [instructions, setInstructions] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedTech, setSelectedTech] = useState<QueueItemUI | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ tech: QueueItemUI; stage: 'analyst' | 'supervisor' | 'admin' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // External Supabase queries for scouting_queue
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

  // LLM Models
  const { data: llmModelsData, isLoading: llmModelsLoading, isError: llmModelsError, refetch: refetchLLMModels } = useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const changeStatusMutation = useChangeExternalScoutingStatus();
  const approveToDbMutation = useApproveExternalToTechnologies();
  const moveToRejectedMutation = useMoveExternalToRejected();

  // User role checks
  const isAnalyst = profile?.role === 'analyst';
  const isSupervisorOrAdmin = profile?.role === 'supervisor' || profile?.role === 'admin';
  const userEmail = user?.email || 'unknown';

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

  // Scouting mutation
  const scoutingMutation = useMutation({
    mutationFn: runScouting,
    onMutate: () => {
      toast.loading('Iniciando scouting...', { id: 'scouting-start' });
    },
    onSuccess: (data) => {
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
      if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('ya hay un scouting')) {
        toast.error('Ya hay un scouting en ejecución. Revisa el Monitor.', { id: 'scouting-start', duration: 8000 });
      } else if (errorMessage.includes('429')) {
        toast.error('Límite semanal alcanzado.', { id: 'scouting-start', duration: 8000 });
      } else {
        toast.error(`Error: ${errorMessage}`, { id: 'scouting-start' });
      }
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
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {item.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="w-3 h-3" />
              {item.provider || 'Sin proveedor'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {item.trl > 0 && <TRLBadge trl={item.trl} />}
            {item.score > 0 && (
              <Badge className={getScoreColor(item.score)}>
                {item.score}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {item.description || 'Sin descripción'}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {item.country || 'País no especificado'}
        </div>

        {item.suggestedType && (
          <Badge variant="outline" className="text-xs">
            {item.suggestedType}
          </Badge>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
          {sectionId === 'review' && (
            <>
              {(isAnalyst || isSupervisorOrAdmin) && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleSendToApproval(item)}
                  disabled={changeStatusMutation.isPending}
                  className="flex-1"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Enviar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectionDialog({ tech: item, stage: 'analyst' })}
                disabled={moveToRejectedMutation.isPending}
                className="text-destructive"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
          {sectionId === 'pending_approval' && isSupervisorOrAdmin && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApproveToDb(item)}
                disabled={approveToDbMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectionDialog({ tech: item, stage: 'supervisor' })}
                disabled={moveToRejectedMutation.isPending}
                className="text-destructive"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Radar className="w-8 h-8 text-primary" />
            Scouting de Tecnologías
          </h1>
          <p className="text-muted-foreground mt-1">
            Descubre y revisa nuevas tecnologías del sector del agua
          </p>
        </div>
      </div>

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
            <CardDescription>Total activas</CardDescription>
            <Radar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(counts?.review ?? 0) + (counts?.pending_approval ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Cola de Revisión</TabsTrigger>
          <TabsTrigger value="new">Nuevo Scouting</TabsTrigger>
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
                const itemStatus = item.queue_status || item.status || 'review';
                const sectionId = itemStatus === 'pending_approval' ? 'pending_approval' : 'review';
                return renderTechCard(item, sectionId);
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Radar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin tecnologías pendientes</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No hay tecnologías en la cola de revisión.
                </p>
                <Button onClick={() => setActiveTab('new')}>
                  <Rocket className="w-4 h-4 mr-2" />
                  Iniciar Scouting
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rejected Technologies Section */}
          {rejectedTechs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                Tecnologías Rechazadas ({rejectedTechs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rejectedTechs.slice(0, 6).map((tech) => (
                  <Card key={tech.id} className="border-red-200 bg-red-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        {tech["Nombre de la tecnología"]}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {tech["Proveedor / Empresa"] || 'Sin proveedor'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-red-600 line-clamp-2">
                        <strong>Razón:</strong> {tech.rejection_reason}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* New Scouting Tab */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Nuevo Scouting
              </CardTitle>
              <CardDescription>
                Configura y lanza un nuevo proceso de scouting automático.
                Para ver el estado de scoutings en curso, visita el <a href="/scouting-monitor" className="text-primary underline">Monitor de Scouting</a>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Keywords <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Ej: water treatment, desalination, membrane technology"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separa múltiples keywords con comas
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de tecnología</label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cualquier tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Cualquier tipo</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="process">Proceso</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
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
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((trl) => (
                        <SelectItem key={trl} value={trl.toString()}>
                          TRL {trl}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Instrucciones adicionales</label>
                <Textarea
                  placeholder="Instrucciones específicas para el agente de scouting..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Modelo LLM <span className="text-destructive">*</span>
                </label>
                {llmModelsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando modelos...
                  </div>
                ) : llmModelsError ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-4 h-4" />
                    Error al cargar modelos
                    <Button variant="ghost" size="sm" onClick={() => refetchLLMModels()}>
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(modelsByProvider).map(([providerKey, providerData]) => (
                        <SelectGroup key={providerKey}>
                          <SelectLabel className="capitalize">{providerData.name}</SelectLabel>
                          {providerData.models.map((model) => (
                            <SelectItem
                              key={`${providerKey}/${model.id}`}
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
                disabled={scoutingMutation.isPending || llmModelsLoading || !!llmModelsError}
              >
                {scoutingMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Iniciando scouting...
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
      </Tabs>

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
    </div>
  );
};

export default Scouting;
