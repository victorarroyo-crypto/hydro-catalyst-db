import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Rocket, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Target,
  Check,
  X,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

interface ScoutingLog {
  level: 'info' | 'error' | 'warn';
  phase: string;
  message: string;
  timestamp: string;
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

// API response structure (Spanish fields from Railway backend)
interface QueueItemAPI {
  id: string;
  nombre: string;
  proveedor: string;
  pais: string;
  relevance_score: number;
  trl_estimado: number;
  status: string;
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
}

interface ParsedTechnology {
  name: string;
  provider: string;
  score: number;
  reason: string;
  trl?: number;
  country?: string;
  queueId?: string; // ID from queue for actions
}

interface ParsedReport {
  summary: {
    evaluated: number;
    added: number;
    review: number;
    rejected: number;
  };
  technologies: {
    added: ParsedTechnology[];
    review: ParsedTechnology[];
    rejected: ParsedTechnology[];
  };
  conclusions: string[];
  recommendations: string[];
  rawText: string;
  technicalErrors: string[]; // Detected technical issues
  hadTechnicalIssues: boolean;
}

interface ScoutingReportModalProps {
  report: HistoryItem | null;
  onClose: () => void;
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
});

// Fetch queue items to match with parsed technologies
const fetchQueue = async (status: string): Promise<{ items: QueueItem[] }> => {
  const res = await fetch(`${API_BASE}/api/scouting/queue?status=${status}`);
  if (!res.ok) throw new Error('Error al cargar cola');
  const data: { items: QueueItemAPI[]; count: number } = await res.json();
  return {
    items: data.items.map(normalizeQueueItem),
  };
};

const updateQueueItem = async ({ id, status }: { id: string; status: string }) => {
  const { data, error } = await supabase.functions.invoke('scouting-update-queue', {
    body: { id, status },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Error al actualizar');

  return data.result;
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

const parseReportText = (text: string): ParsedReport => {
  const result: ParsedReport = {
    summary: { evaluated: 0, added: 0, review: 0, rejected: 0 },
    technologies: { added: [], review: [], rejected: [] },
    conclusions: [],
    recommendations: [],
    rawText: text,
    technicalErrors: [],
    hadTechnicalIssues: false
  };

  if (!text) return result;

  // Detect technical errors in the report
  const errorPatterns = [
    /error técnico/i,
    /check_duplicate/i,
    /herramienta.*(?:falló|error|problema)/i,
    /no se pudo completar/i,
    /problemas técnicos/i,
    /tool.*(?:failed|error)/i,
  ];
  
  for (const pattern of errorPatterns) {
    if (pattern.test(text)) {
      result.hadTechnicalIssues = true;
      break;
    }
  }

  // Extract specific error messages
  const errorMessageMatch = text.match(/(?:error técnico|Debido a un error)[^.]*\./gi);
  if (errorMessageMatch) {
    result.technicalErrors = errorMessageMatch.map(m => m.trim());
  }

  // Parse summary section
  const evaluatedMatch = text.match(/Tecnologías evaluadas:\s*(\d+)/i);
  const addedMatch = text.match(/Añadidas.*?:\s*(\d+)/i);
  const reviewMatch = text.match(/Para revisión.*?:\s*(\d+)/i);
  const rejectedMatch = text.match(/Rechazadas.*?:\s*(\d+)/i);

  if (evaluatedMatch) result.summary.evaluated = parseInt(evaluatedMatch[1]);
  if (addedMatch) result.summary.added = parseInt(addedMatch[1]);
  if (reviewMatch) result.summary.review = parseInt(reviewMatch[1]);
  if (rejectedMatch) result.summary.rejected = parseInt(rejectedMatch[1]);

  // Check for "no technologies processed" scenario
  const totalProcessed = result.summary.added + result.summary.review + result.summary.rejected;
  if (result.summary.evaluated > 0 && totalProcessed === 0) {
    result.hadTechnicalIssues = true;
    if (result.technicalErrors.length === 0) {
      result.technicalErrors.push('Se evaluaron tecnologías pero ninguna fue procesada correctamente.');
    }
  }

  // Parse technology tables - look for table-like structures
  // Format: | Nombre | Proveedor | Score | Duda/Razón |
  let currentSection: 'added' | 'review' | 'rejected' = 'review';
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect section headers
    if (line.includes('AÑADIDAS') || line.includes('✅')) {
      currentSection = 'added';
    } else if (line.includes('PARA REVISIÓN') || line.includes('🟡')) {
      currentSection = 'review';
    } else if (line.includes('RECHAZADAS') || line.includes('❌')) {
      currentSection = 'rejected';
    }
    
    // Parse table rows
    const rowMatch = line.match(/\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/);
    if (rowMatch) {
      const name = rowMatch[1].trim();
      const provider = rowMatch[2].trim();
      const score = parseInt(rowMatch[3]);
      const reason = rowMatch[4].trim();
      
      // Skip header rows and N/A rows
      if (name.toLowerCase() === 'tecnología' || 
          name.toLowerCase() === 'nombre' || 
          name.includes('---') ||
          name.toLowerCase() === 'n/a' ||
          provider.toLowerCase() === 'proveedor' ||
          provider.toLowerCase() === 'n/a') {
        continue;
      }
      
      const tech: ParsedTechnology = { name, provider, score, reason };
      result.technologies[currentSection].push(tech);
    }
  }

  // Parse conclusions
  const conclusionsMatch = text.match(/CONCLUSIONES:([\s\S]*?)(?=RECOMENDACIONES|Debido a|$)/i);
  if (conclusionsMatch) {
    const conclusionLines = conclusionsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('|') && !line.toLowerCase().includes('n/a'));
    result.conclusions = conclusionLines;
  }

  // Parse recommendations
  const recommendationsMatch = text.match(/(?:RECOMENDACIONES|Recomendaciones para próximo scouting):([\s\S]*?)(?=Debido a|$)/i);
  if (recommendationsMatch) {
    const recLines = recommendationsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('|'));
    result.recommendations = recLines;
  }

  return result;
};

const getScoreColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500/20 text-green-700 border-green-500/30';
  if (score >= 50) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
  return 'bg-red-500/20 text-red-700 border-red-500/30';
};

const getScoreIcon = (score: number) => {
  if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (score >= 50) return <Minus className="w-4 h-4 text-yellow-600" />;
  return <TrendingDown className="w-4 h-4 text-red-600" />;
};

const TechnologyTable = ({ 
  technologies, 
  title, 
  icon: Icon, 
  color,
  queueItems,
  onAction,
  actionPending,
  sectionType
}: { 
  technologies: ParsedTechnology[]; 
  title: string; 
  icon: React.ElementType;
  color: string;
  queueItems: QueueItem[];
  onAction: (id: string, status: string) => void;
  actionPending: string | null;
  sectionType: 'added' | 'review' | 'rejected';
}) => {
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    status: string;
    techName: string;
  } | null>(null);

  if (technologies.length === 0) return null;

  // Try to match technologies with queue items by name similarity
  const findQueueItem = (tech: ParsedTechnology): QueueItem | undefined => {
    if (!tech.name || !tech.provider) return undefined;
    const normalizedName = tech.name.toLowerCase().trim();
    const normalizedProvider = tech.provider.toLowerCase().trim();
    
    return queueItems.find(item => {
      if (!item.name || !item.provider) return false;
      const itemName = item.name.toLowerCase().trim();
      const itemProvider = item.provider.toLowerCase().trim();
      // Match by name or name+provider
      return itemName.includes(normalizedName) || 
             normalizedName.includes(itemName) ||
             (itemName.includes(normalizedName.split(' ')[0]) && itemProvider.includes(normalizedProvider.split(' ')[0]));
    });
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      onAction(confirmAction.id, confirmAction.status);
      setConfirmAction(null);
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'aprobar';
      case 'rejected': return 'rechazar';
      case 'pending': return 'reconsiderar';
      default: return status;
    }
  };

  const getActionTitle = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobar tecnología';
      case 'rejected': return 'Rechazar tecnología';
      case 'pending': return 'Reconsiderar tecnología';
      default: return 'Confirmar acción';
    }
  };

  return (
    <>
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction && getActionTitle(confirmAction.status)}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas {confirmAction && getActionLabel(confirmAction.status)} la tecnología <strong>"{confirmAction?.techName}"</strong>?
              {confirmAction?.status === 'approved' && (
                <span className="block mt-2 text-green-600">Esta tecnología se añadirá a la base de datos.</span>
              )}
              {confirmAction?.status === 'rejected' && (
                <span className="block mt-2 text-red-600">Esta tecnología será descartada del scouting.</span>
              )}
              {confirmAction?.status === 'pending' && (
                <span className="block mt-2 text-blue-600">Esta tecnología volverá a la cola de revisión.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={
                confirmAction?.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                confirmAction?.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {confirmAction?.status === 'approved' && <Check className="w-4 h-4 mr-2" />}
              {confirmAction?.status === 'rejected' && <X className="w-4 h-4 mr-2" />}
              {confirmAction?.status === 'pending' && <Eye className="w-4 h-4 mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="overflow-hidden">
        <CardHeader className={`py-3 ${color}`}>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title} ({technologies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Tecnología</TableHead>
                <TableHead className="w-[20%]">Proveedor</TableHead>
                <TableHead className="w-[8%] text-center">Score</TableHead>
                <TableHead className="w-[25%]">Observación</TableHead>
                <TableHead className="w-[17%] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technologies.map((tech, idx) => {
                const queueItem = findQueueItem(tech);
                const isPending = actionPending === queueItem?.id;
                
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {tech.name}
                        {queueItem && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            En cola
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tech.provider}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getScoreIcon(tech.score)}
                        <Badge className={getScoreColor(tech.score)}>
                          {tech.score}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tech.reason}</TableCell>
                    <TableCell>
                      {queueItem ? (
                        <div className="flex items-center justify-center gap-1">
                          {sectionType === 'review' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setConfirmAction({ id: queueItem.id, status: 'approved', techName: tech.name })}
                                disabled={isPending}
                                title="Aprobar"
                              >
                                {isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setConfirmAction({ id: queueItem.id, status: 'rejected', techName: tech.name })}
                                disabled={isPending}
                                title="Rechazar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {sectionType === 'added' && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              Añadida
                            </Badge>
                          )}
                          {sectionType === 'rejected' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setConfirmAction({ id: queueItem.id, status: 'pending', techName: tech.name })}
                              disabled={isPending}
                              title="Reconsiderar"
                            >
                              {isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export const ScoutingReportModal = ({ report, onClose }: ScoutingReportModalProps) => {
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Fetch all queue items to match with parsed technologies
  const { data: pendingQueue } = useQuery({
    queryKey: ['scouting-queue', 'pending'],
    queryFn: () => fetchQueue('pending'),
    enabled: !!report,
  });

  const { data: reviewQueue } = useQuery({
    queryKey: ['scouting-queue', 'review'],
    queryFn: () => fetchQueue('review'),
    enabled: !!report,
  });

  // Combine all queue items for matching
  const allQueueItems: QueueItem[] = useMemo(() => {
    return [
      ...(pendingQueue?.items ?? []),
      ...(reviewQueue?.items ?? []),
    ];
  }, [pendingQueue, reviewQueue]);

  // Mutation for updating queue items
  const updateMutation = useMutation({
    mutationFn: updateQueueItem,
    onMutate: ({ id }) => {
      setActionPending(id);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-stats'] });
      const statusLabels: Record<string, string> = {
        approved: 'Tecnología aprobada',
        rejected: 'Tecnología rechazada',
        pending: 'Tecnología devuelta a pendientes',
        review: 'Tecnología enviada a revisión'
      };
      toast.success(statusLabels[status] || 'Tecnología actualizada');
      setActionPending(null);
    },
    onError: () => {
      toast.error('Error al actualizar la tecnología');
      setActionPending(null);
    },
  });

  const handleAction = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const parsedReport = useMemo(() => {
    if (!report) return null;
    
    // Get raw output from results_summary or logs
    let rawText = '';
    
    if (report.results_summary) {
      if (typeof report.results_summary === 'string') {
        rawText = report.results_summary;
      } else if (typeof report.results_summary === 'object') {
        const summary = report.results_summary as any;
        rawText = summary.raw_output || summary.report || JSON.stringify(summary, null, 2);
      }
    }
    
    // Also check logs for report content
    if (!rawText && report.logs) {
      const reportLog = report.logs.find(log => 
        log.phase === 'report' || 
        (typeof log.message === 'string' && log.message.includes('INFORME'))
      );
      if (reportLog && typeof reportLog.message === 'string') {
        rawText = reportLog.message;
      }
    }
    
    return parseReportText(rawText);
  }, [report]);

  const hasTechnologies = parsedReport && (
    parsedReport.technologies.added.length > 0 ||
    parsedReport.technologies.review.length > 0 ||
    parsedReport.technologies.rejected.length > 0
  );

  return (
    <Dialog open={!!report} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informe de Scouting
          </DialogTitle>
          <DialogDescription>
            Resultados detallados del proceso de scouting tecnológico
          </DialogDescription>
        </DialogHeader>
        
        {report && (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg ${
                report.status === 'failed' 
                  ? 'bg-red-50 border border-red-200' 
                  : report.status === 'completed'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  {report.status === 'failed' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : report.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {report.status === 'failed' 
                        ? 'Scouting Fallido' 
                        : report.status === 'completed'
                        ? 'Scouting Completado'
                        : 'Scouting en Progreso'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Iniciado: {new Date(report.started_at).toLocaleString('es-ES')}
                      {report.completed_at && (
                        <> • Finalizado: {new Date(report.completed_at).toLocaleString('es-ES')}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {report.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Error
                  </h4>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-100/50 p-3 rounded overflow-x-auto">
                    {report.error_message}
                  </pre>
                </div>
              )}

              {/* Technical Issues Warning */}
              {parsedReport?.hadTechnicalIssues && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Problemas Técnicos Detectados
                  </h4>
                  <p className="text-sm text-amber-700 mb-2">
                    Este scouting tuvo problemas técnicos que impidieron procesar algunas o todas las tecnologías.
                  </p>
                  {parsedReport.technicalErrors.length > 0 && (
                    <ul className="text-sm text-amber-600 space-y-1">
                      {parsedReport.technicalErrors.map((error, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-amber-600 mt-3 italic">
                    Recomendación: Verifica el estado del backend de Railway y vuelve a ejecutar el scouting.
                  </p>
                </div>
              )}

              {/* Summary Stats */}
              {parsedReport && parsedReport.summary.evaluated > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {parsedReport.summary.evaluated}
                      </div>
                      <div className="text-xs text-muted-foreground">Evaluadas</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {parsedReport.summary.added}
                      </div>
                      <div className="text-xs text-green-600">Añadidas</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {parsedReport.summary.review}
                      </div>
                      <div className="text-xs text-yellow-600">Para revisión</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {parsedReport.summary.rejected}
                      </div>
                      <div className="text-xs text-red-600">Rechazadas</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Configuration */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Configuración
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Keywords:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {report.config.keywords?.map((kw, i) => (
                        <Badge key={i} variant="secondary">{kw}</Badge>
                      )) || <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{report.config.tipo || 'Todos'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TRL mínimo:</span>
                    <p className="font-medium">{report.config.trl_min ?? 'Sin mínimo'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modelo LLM:</span>
                    <p className="font-medium">{report.llm_model}</p>
                  </div>
                </div>
              </div>

              {/* Technology Tables */}
              {hasTechnologies && (
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tecnologías Encontradas
                  </h4>
                  
                  <TechnologyTable 
                    technologies={parsedReport.technologies.added}
                    title="Añadidas (Score 70+)"
                    icon={CheckCircle2}
                    color="bg-green-50"
                    queueItems={allQueueItems}
                    onAction={handleAction}
                    actionPending={actionPending}
                    sectionType="added"
                  />
                  
                  <TechnologyTable 
                    technologies={parsedReport.technologies.review}
                    title="Para Revisión (Score 50-69)"
                    icon={AlertTriangle}
                    color="bg-yellow-50"
                    queueItems={allQueueItems}
                    onAction={handleAction}
                    actionPending={actionPending}
                    sectionType="review"
                  />
                  
                  <TechnologyTable 
                    technologies={parsedReport.technologies.rejected}
                    title="Rechazadas (Score <50)"
                    icon={XCircle}
                    color="bg-red-50"
                    queueItems={allQueueItems}
                    onAction={handleAction}
                    actionPending={actionPending}
                    sectionType="rejected"
                  />
                </div>
              )}

              {/* Conclusions & Recommendations */}
              {parsedReport && (parsedReport.conclusions.length > 0 || parsedReport.recommendations.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedReport.conclusions.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 bg-blue-50">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          Conclusiones
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="space-y-2 text-sm">
                          {parsedReport.conclusions.slice(0, 5).map((c, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  
                  {parsedReport.recommendations.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 bg-purple-50">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          Recomendaciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="space-y-2 text-sm">
                          {parsedReport.recommendations.slice(0, 5).map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Usage Stats */}
              {(report.tokens_used || report.estimated_cost) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Uso y Coste
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Tokens usados:</span>
                      <p className="font-medium">{report.tokens_used?.toLocaleString() ?? 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coste estimado:</span>
                      <p className="font-medium">
                        {report.estimated_cost !== null 
                          ? `$${report.estimated_cost.toFixed(4)}` 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Output (Collapsible) */}
              {parsedReport?.rawText && (
                <details className="group">
                  <summary className="cursor-pointer font-semibold flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <FileText className="w-4 h-4" />
                    Ver informe original (texto)
                  </summary>
                  <pre className="mt-3 text-xs whitespace-pre-wrap font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                    {parsedReport.rawText}
                  </pre>
                </details>
              )}

              {/* Logs */}
              {report.logs && report.logs.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer font-semibold flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <FileText className="w-4 h-4" />
                    Logs del Proceso ({report.logs.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {report.logs.map((log, index) => (
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
                            {typeof log.message === 'string' 
                              ? log.message 
                              : JSON.stringify(log.message)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* No data message */}
              {!hasTechnologies && !parsedReport?.rawText && (!report.logs || report.logs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay resultados disponibles</p>
                  <p className="text-sm">Este scouting no generó un informe con datos parseables</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScoutingReportModal;
