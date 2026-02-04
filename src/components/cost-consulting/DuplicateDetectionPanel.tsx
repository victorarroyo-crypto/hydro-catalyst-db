import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle,
  Copy,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Loader2,
  Clock,
  Euro,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDuplicateCandidates,
  getDuplicateStats,
  detectDuplicates,
  resolveDuplicate,
  DuplicateCandidate,
  DuplicateStats,
  DuplicateMatchType,
  DuplicateResolution,
} from '@/services/costConsultingApi';

interface DuplicateDetectionPanelProps {
  projectId: string;
  userId?: string;
}

const MATCH_TYPE_LABELS: Record<DuplicateMatchType, string> = {
  exact_number: 'Número exacto',
  exact_amount: 'Importe exacto',
  fuzzy_match: 'Coincidencia parcial',
  semantic_match: 'Coincidencia semántica',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Score color based on similarity
const getScoreColor = (score: number): { bg: string; text: string; indicator: string } => {
  if (score >= 0.95) return { bg: 'bg-red-100', text: 'text-red-700', indicator: '🔴' };
  if (score >= 0.85) return { bg: 'bg-amber-100', text: 'text-amber-700', indicator: '🟡' };
  return { bg: 'bg-green-100', text: 'text-green-700', indicator: '🟢' };
};

// Stats Card Component
const StatsBar: React.FC<{ stats: DuplicateStats | undefined; isLoading: boolean }> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Pendientes', value: stats?.pending || 0, color: 'text-amber-600' },
    { label: 'Confirmados', value: stats?.confirmed || 0, color: 'text-red-600' },
    { label: 'Falsos Positivos', value: stats?.false_positives || 0, color: 'text-green-600' },
    {
      label: 'Ahorro Potencial',
      value: formatCurrency(stats?.total_potential_savings || 0),
      color: 'text-primary',
      isHighlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={`text-lg font-bold ${item.color}`}>
            {typeof item.value === 'number' ? item.value : item.value}
          </p>
        </div>
      ))}
    </div>
  );
};

// Duplicate Candidate Card
const DuplicateCandidateCard: React.FC<{
  candidate: DuplicateCandidate;
  onResolve: (candidateId: string, resolution: 'confirmed' | 'false_positive') => void;
  isResolving: boolean;
}> = ({ candidate, onResolve, isResolving }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoreColors = getScoreColor(candidate.similarity_score);
  const isPending = candidate.resolution === 'pending';

  const dateDiffLabel = () => {
    const days = candidate.match_details.date_diff_days;
    if (days === 0) return 'mismo día';
    return days > 0 ? `+${days} días` : `${days} días`;
  };

  const amountDiffLabel = () => {
    const diff = candidate.match_details.amount_diff;
    if (diff === 0) return 'mismo importe';
    const pct = candidate.match_details.amount_diff_pct;
    return `${diff > 0 ? '+' : ''}${formatCurrency(diff)} (${pct.toFixed(1)}%)`;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={`transition-all ${!isPending ? 'opacity-60' : ''}`}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              {/* Score & Match Type */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${scoreColors.bg}`}
                >
                  <span>{scoreColors.indicator}</span>
                  <span className={`text-sm font-bold ${scoreColors.text}`}>
                    {Math.round(candidate.similarity_score * 100)}%
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {MATCH_TYPE_LABELS[candidate.match_type]}
                </Badge>
              </div>

              {/* Resolution Badge */}
              {!isPending && (
                <Badge
                  variant={candidate.resolution === 'confirmed' ? 'destructive' : 'secondary'}
                >
                  {candidate.resolution === 'confirmed' ? 'Confirmado' : 'Falso Positivo'}
                </Badge>
              )}

              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* Invoice Comparison Summary */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice A */}
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">#{candidate.invoice_a.invoice_number}</span>
                <span className="text-muted-foreground">|</span>
                <span className="truncate max-w-[120px]">{candidate.invoice_a.supplier_name}</span>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">{formatCurrency(candidate.invoice_a.total)}</span>
              </div>

              {/* Invoice B */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium">#{candidate.invoice_b.invoice_number}</span>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">{formatCurrency(candidate.invoice_b.total)}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">{dateDiffLabel()}</span>
              </div>
            </div>

            {/* Actions for pending */}
            {isPending && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(candidate.id, 'confirmed');
                  }}
                  disabled={isResolving}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(candidate.id, 'false_positive');
                  }}
                  disabled={isResolving}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Falso Positivo
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  Ahorro: <strong>{formatCurrency(candidate.potential_savings)}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice A Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Factura A
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-medium">{candidate.invoice_a.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span className="font-medium">{candidate.invoice_a.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Importe:</span>
                    <span className="font-medium">{formatCurrency(candidate.invoice_a.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">{formatDate(candidate.invoice_a.invoice_date)}</span>
                  </div>
                </div>
              </div>

              {/* Invoice B Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Factura B
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-medium">{candidate.invoice_b.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span className="font-medium">{candidate.invoice_b.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Importe:</span>
                    <span className="font-medium">{formatCurrency(candidate.invoice_b.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">{formatDate(candidate.invoice_b.invoice_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Details */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Detalles de coincidencia</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Número:</span>{' '}
                  <Badge variant={candidate.match_details.number_match ? 'destructive' : 'secondary'}>
                    {candidate.match_details.number_match ? 'Coincide' : 'Diferente'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Proveedor:</span>{' '}
                  <Badge variant={candidate.match_details.supplier_match ? 'destructive' : 'secondary'}>
                    {candidate.match_details.supplier_match ? 'Coincide' : 'Diferente'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Dif. Importe:</span>{' '}
                  <span className="font-medium">{amountDiffLabel()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dif. Fecha:</span>{' '}
                  <span className="font-medium">{dateDiffLabel()}</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// Main Component
export const DuplicateDetectionPanel: React.FC<DuplicateDetectionPanelProps> = ({
  projectId,
  userId,
}) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<DuplicateResolution | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<DuplicateMatchType | 'all'>('all');

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['duplicate-stats', projectId],
    queryFn: () => getDuplicateStats(projectId),
    enabled: !!projectId,
  });

  const {
    data: candidates,
    isLoading: candidatesLoading,
    error: candidatesError,
    refetch: refetchCandidates,
  } = useQuery({
    queryKey: ['duplicate-candidates', projectId],
    queryFn: () => getDuplicateCandidates(projectId),
    enabled: !!projectId,
  });

  // Mutations
  const detectMutation = useMutation({
    mutationFn: () => detectDuplicates(projectId),
    onSuccess: (result) => {
      toast.success(`Escaneo completado: ${result.candidates_found} candidatos encontrados`);
      queryClient.invalidateQueries({ queryKey: ['duplicate-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-candidates', projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Error en detección: ${error.message}`);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      candidateId,
      resolution,
    }: {
      candidateId: string;
      resolution: 'confirmed' | 'false_positive';
    }) => resolveDuplicate(candidateId, resolution, userId),
    onSuccess: (_, variables) => {
      const message =
        variables.resolution === 'confirmed'
          ? 'Duplicado confirmado'
          : 'Marcado como falso positivo';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['duplicate-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-candidates', projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Filter candidates
  const filteredCandidates = React.useMemo(() => {
    if (!candidates) return [];

    return candidates.filter((c) => {
      // Status filter
      if (statusFilter !== 'all' && c.resolution !== statusFilter) return false;

      // Score filter
      if (scoreFilter === '>0.95' && c.similarity_score < 0.95) return false;
      if (scoreFilter === '>0.85' && c.similarity_score < 0.85) return false;
      if (scoreFilter === '>0.70' && c.similarity_score < 0.7) return false;

      // Type filter
      if (typeFilter !== 'all' && c.match_type !== typeFilter) return false;

      return true;
    });
  }, [candidates, statusFilter, scoreFilter, typeFilter]);

  const handleResolve = (candidateId: string, resolution: 'confirmed' | 'false_positive') => {
    resolveMutation.mutate({ candidateId, resolution });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Detección de Duplicados
          </CardTitle>
          <Button
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending}
            className="gap-2"
          >
            {detectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Escaneando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Ejecutar Scan
              </>
            )}
          </Button>
        </div>

        {/* Last scan info */}
        {stats?.last_scan_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3" />
            Último escaneo: {formatDate(stats.last_scan_at)}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Bar */}
        <StatsBar stats={stats} isLoading={statsLoading} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="false_positive">Falsos Positivos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Score: Todos</SelectItem>
              <SelectItem value=">0.95">&gt; 95%</SelectItem>
              <SelectItem value=">0.85">&gt; 85%</SelectItem>
              <SelectItem value=">0.70">&gt; 70%</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipo: Todos</SelectItem>
              <SelectItem value="exact_number">Número exacto</SelectItem>
              <SelectItem value="exact_amount">Importe exacto</SelectItem>
              <SelectItem value="fuzzy_match">Coincidencia parcial</SelectItem>
              <SelectItem value="semantic_match">Semántico</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setScoreFilter('all');
              setTypeFilter('all');
            }}
            className="ml-auto text-xs"
          >
            Limpiar filtros
          </Button>
        </div>

        {/* Error State */}
        {candidatesError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Error al cargar candidatos</span>
              <Button variant="outline" size="sm" onClick={() => refetchCandidates()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {candidatesLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!candidatesLoading && filteredCandidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Copy className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">No hay candidatos duplicados</p>
            <p className="text-xs mt-1">
              {candidates?.length
                ? 'Prueba a ajustar los filtros'
                : 'Ejecuta un escaneo para detectar posibles duplicados'}
            </p>
          </div>
        )}

        {/* Candidates List */}
        {!candidatesLoading && filteredCandidates.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredCandidates.length} de {candidates?.length || 0} candidatos
            </p>
            {filteredCandidates.map((candidate) => (
              <DuplicateCandidateCard
                key={candidate.id}
                candidate={candidate}
                onResolve={handleResolve}
                isResolving={resolveMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
