import { useState, useEffect } from 'react';
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
  Loader2
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
  SelectItem,
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
import { toast } from 'sonner';
import { TRLBadge } from '@/components/TRLBadge';

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

// Types
interface ScoutingStats {
  scoutings_this_week: number;
  scoutings_this_month: number;
  cost_this_month: number;
  pending_technologies: number;
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

interface HistoryItem {
  id: string;
  date: string;
  type: string;
  status: string;
  found: number;
  cost: number;
}

// API functions
const fetchStats = async (): Promise<ScoutingStats> => {
  const res = await fetch(`${API_BASE}/api/scouting/stats`);
  if (!res.ok) throw new Error('Error al cargar estadísticas');
  return res.json();
};

const fetchQueue = async (status: string): Promise<QueueItem[]> => {
  const res = await fetch(`${API_BASE}/api/scouting/queue?status=${status}`);
  if (!res.ok) throw new Error('Error al cargar cola');
  return res.json();
};

const fetchHistory = async (): Promise<HistoryItem[]> => {
  const res = await fetch(`${API_BASE}/api/scouting/history`);
  if (!res.ok) throw new Error('Error al cargar historial');
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

const runScouting = async (config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string }) => {
  const res = await fetch(`${API_BASE}/api/scouting/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin',
      'X-User-Role': 'admin',
    },
    body: JSON.stringify({ config }),
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

const Scouting = () => {
  const queryClient = useQueryClient();
  const [queueFilter, setQueueFilter] = useState('pending');
  const [keywords, setKeywords] = useState('');
  const [tipo, setTipo] = useState('all');
  const [trlMin, setTrlMin] = useState('none');
  const [instructions, setInstructions] = useState('');

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['scouting-stats'],
    queryFn: fetchStats,
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['scouting-queue', queueFilter],
    queryFn: () => fetchQueue(queueFilter),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['scouting-history'],
    queryFn: fetchHistory,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-history'] });
      toast.success('Scouting iniciado correctamente');
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
    
    scoutingMutation.mutate({
      keywords: keywordList,
      tipo: tipo === 'all' ? '' : tipo,
      trl_min: trlMin === 'none' ? null : parseInt(trlMin),
      instructions: instructions || undefined,
    });
  };

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
          ) : queue && queue.length > 0 ? (
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

              <Button 
                size="lg" 
                className="w-full"
                onClick={handleStartScouting}
                disabled={scoutingMutation.isPending}
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
                Registro de todos los scoutings ejecutados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : history && history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Encontradas</TableHead>
                      <TableHead className="text-right">Coste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleDateString('es-ES')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.status === 'completed' ? 'default' : 'secondary'}
                            className={item.status === 'completed' ? 'bg-green-500/20 text-green-600' : ''}
                          >
                            {item.status === 'completed' ? 'Completado' : 
                             item.status === 'running' ? 'En progreso' : 
                             item.status === 'failed' ? 'Fallido' : item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.found}</TableCell>
                        <TableCell className="text-right">${item.cost.toFixed(2)}</TableCell>
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
    </div>
  );
};

export default Scouting;
