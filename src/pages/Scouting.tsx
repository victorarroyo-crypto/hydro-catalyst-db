import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { TRLBadge } from '@/components/TRLBadge';

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

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

interface QueueItem {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
}

interface QueueResponse {
  items: QueueItem[];
  count: number;
}

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

// API functions
const fetchStats = async (): Promise<ScoutingStats> => {
  const res = await fetch(`${API_BASE}/api/scouting/stats`);
  if (!res.ok) throw new Error('Error al cargar estadísticas');
  return res.json();
};

const fetchQueue = async (status: string): Promise<QueueResponse> => {
  const res = await fetch(`${API_BASE}/api/scouting/queue?status=${status}`);
  if (!res.ok) throw new Error('Error al cargar cola');
  return res.json();
};

const fetchHistory = async (): Promise<HistoryResponse> => {
  const res = await fetch(`${API_BASE}/api/scouting/history`);
  if (!res.ok) throw new Error('Error al cargar historial');
  return res.json();
};

const fetchLLMModels = async (): Promise<LLMModelsResponse> => {
  const res = await fetch(`${API_BASE}/api/llm/models`);
  if (!res.ok) throw new Error('Error al cargar modelos LLM');
  return res.json();
};

const updateQueueItem = async ({ id, status }: { id: string; status: string }) => {
  const res = await fetch(`${API_BASE}/api/scouting/queue/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Error al actualizar');
  return res.json();
};

const runScouting = async (params: { 
  config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string };
  provider: string;
  model: string;
}) => {
  const res = await fetch(`${API_BASE}/api/scouting/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin',
      'X-User-Role': 'admin',
    },
    body: JSON.stringify({
      config: params.config,
      provider: params.provider,
      model: params.model,
    }),
  });
  if (!res.ok) throw new Error('Error al iniciar scouting');
  return res.json();
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
  const [selectedModel, setSelectedModel] = useState('groq/llama-3.1-8b-instant');

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['scouting-stats'],
    queryFn: fetchStats,
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['scouting-queue', queueFilter],
    queryFn: () => fetchQueue(queueFilter),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['scouting-history'],
    queryFn: fetchHistory,
  });

  const { data: llmModelsData, isLoading: llmModelsLoading } = useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
  });

  // Models are already grouped by provider in the API response
  const modelsByProvider = llmModelsData ?? {};

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      toast.success(`Scouting iniciado (Job ID: ${data.job_id?.slice(0, 8)}...)`);
      setKeywords('');
      setTipo('all');
      setTrlMin('none');
      setInstructions('');
    },
    onError: () => {
      toast.error('Error al iniciar el scouting');
    },
  });

  const handleStartScouting = () => {
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywordList.length === 0) {
      toast.error('Introduce al menos una keyword');
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

  const queue = queueData?.items ?? [];
  const history = historyData?.items ?? [];

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
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Cola de Revisión</TabsTrigger>
          <TabsTrigger value="new">Nuevo Scouting</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={queueFilter} onValueChange={setQueueFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="review">Para revisar</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {queueLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : queue.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queue.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge className={getScoreColor(item.score)}>
                        Score: {item.score}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {item.provider}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {item.country}
                      </span>
                      <TRLBadge trl={item.trl} />
                    </div>
                    
                    {(queueFilter === 'pending' || queueFilter === 'review') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => updateMutation.mutate({ id: item.id, status: 'approved' })}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => updateMutation.mutate({ id: item.id, status: 'rejected' })}
                          disabled={updateMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay tecnologías</h3>
                <p className="text-muted-foreground">
                  No se encontraron tecnologías con el estado seleccionado.
                </p>
              </CardContent>
            </Card>
          )}
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
                <p className="text-xs text-muted-foreground">
                  El modelo seleccionado se usará para analizar y clasificar tecnologías
                </p>
              </div>

              <Button 
                size="lg" 
                className="w-full"
                onClick={handleStartScouting}
                disabled={scoutingMutation.isPending || llmModelsLoading}
              >
                {scoutingMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5 mr-2" />
                )}
                Iniciar Scouting
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
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
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
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informe de Scouting
            </DialogTitle>
            <DialogDescription>
              Detalles completos del proceso de scouting
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg ${
                  selectedReport.status === 'failed' 
                    ? 'bg-red-50 border border-red-200' 
                    : selectedReport.status === 'completed'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedReport.status === 'failed' ? (
                      <XCircle className="w-6 h-6 text-red-500" />
                    ) : selectedReport.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {selectedReport.status === 'failed' 
                          ? 'Scouting Fallido' 
                          : selectedReport.status === 'completed'
                          ? 'Scouting Completado'
                          : 'Scouting en Progreso'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Iniciado: {new Date(selectedReport.started_at).toLocaleString('es-ES')}
                        {selectedReport.completed_at && (
                          <> • Finalizado: {new Date(selectedReport.completed_at).toLocaleString('es-ES')}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {selectedReport.error_message && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Error
                    </h4>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-100/50 p-3 rounded overflow-x-auto">
                      {selectedReport.error_message}
                    </pre>
                  </div>
                )}

                {/* Configuration */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Configuración
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Keywords:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedReport.config.keywords?.map((kw, i) => (
                          <Badge key={i} variant="secondary">{kw}</Badge>
                        )) || <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">{selectedReport.config.tipo || 'Todos'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">TRL mínimo:</span>
                      <p className="font-medium">{selectedReport.config.trl_min ?? 'Sin mínimo'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">País:</span>
                      <p className="font-medium">{selectedReport.config.pais || 'Todos'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modelo LLM:</span>
                      <p className="font-medium">{selectedReport.llm_model}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Iniciado por:</span>
                      <p className="font-medium">{selectedReport.triggered_by} ({selectedReport.trigger_type})</p>
                    </div>
                  </div>
                </div>

                {/* Results (if available) */}
                {selectedReport.results_summary && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Resultados
                    </h4>
                    <p className="text-sm">{selectedReport.results_summary}</p>
                  </div>
                )}

                {/* Usage Stats */}
                {(selectedReport.tokens_used || selectedReport.estimated_cost) && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Uso y Coste
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tokens usados:</span>
                        <p className="font-medium">{selectedReport.tokens_used?.toLocaleString() ?? 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Coste estimado:</span>
                        <p className="font-medium">
                          {selectedReport.estimated_cost !== null 
                            ? `$${selectedReport.estimated_cost.toFixed(4)}` 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logs */}
                {selectedReport.logs && selectedReport.logs.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Logs del Proceso ({selectedReport.logs.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedReport.logs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                            log.level === 'error' ? 'bg-red-50' : 
                            log.level === 'warn' ? 'bg-yellow-50' : 'bg-muted/30'
                          }`}
                        >
                          {getLogIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.phase}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                              </span>
                            </div>
                            <p className={`${log.level === 'error' ? 'text-red-700' : ''}`}>
                              {log.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No logs message */}
                {(!selectedReport.logs || selectedReport.logs.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay logs disponibles para este scouting</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scouting;
