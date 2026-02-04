import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DuplicateDetectionPanel } from '@/components/cost-consulting/DuplicateDetectionPanel';
import {
  getDuplicateCandidates,
  type DuplicateCandidate,
} from '@/services/costConsultingApi';

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// RESOLUTION HISTORY COMPONENT
// ============================================================

interface ResolutionHistoryProps {
  candidates: DuplicateCandidate[];
  isLoading: boolean;
}

const ResolutionHistory: React.FC<ResolutionHistoryProps> = ({ candidates, isLoading }) => {
  const confirmedDuplicates = candidates.filter((c) => c.resolution === 'confirmed');
  const falsePositives = candidates.filter((c) => c.resolution === 'false_positive');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (confirmedDuplicates.length === 0 && falsePositives.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium text-muted-foreground">Sin historial de resoluciones</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Las resoluciones aparecerán aquí cuando confirmes o descartes candidatos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Confirmed Duplicates */}
      {confirmedDuplicates.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Confirmados ({confirmedDuplicates.length})</span>
              <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                {formatCurrency(
                  confirmedDuplicates.reduce((sum, c) => sum + c.potential_savings, 0)
                )} recuperados
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {confirmedDuplicates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-green-50/50 text-sm"
                >
                  <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-green-800">
                      #{candidate.invoice_a.invoice_number}
                    </span>
                    <span className="text-green-600"> duplicada - </span>
                    <span className="text-green-700">
                      {candidate.invoice_a.supplier_name}
                    </span>
                    <span className="text-green-600"> - </span>
                    <span className="font-medium text-green-800">
                      {formatCurrency(candidate.potential_savings)}
                    </span>
                  </div>
                  {candidate.resolved_at && (
                    <span className="text-xs text-green-500 flex-shrink-0">
                      {formatDate(candidate.resolved_at)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* False Positives */}
      {falsePositives.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-slate-500" />
              <span>Falsos Positivos ({falsePositives.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {falsePositives.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-slate-50 text-sm"
                >
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700">
                      #{candidate.invoice_a.invoice_number}
                    </span>
                    <span className="text-slate-500"> vs </span>
                    <span className="font-medium text-slate-700">
                      #{candidate.invoice_b.invoice_number}
                    </span>
                    <span className="text-slate-500"> - diferentes servicios</span>
                  </div>
                  {candidate.resolved_at && (
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatDate(candidate.resolved_at)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

const CostConsultingDuplicates: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();

  // Fetch all candidates for resolution history
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['duplicate-candidates', projectId],
    queryFn: () => getDuplicateCandidates(projectId!),
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Proyecto no encontrado
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/cost-consulting/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Duplicados</h1>
            <p className="text-sm text-muted-foreground">
              Detecta y resuelve facturas potencialmente duplicadas
            </p>
          </div>
        </div>
      </div>

      {/* Detection Panel */}
      <DuplicateDetectionPanel projectId={projectId} />

      {/* Separator */}
      <Separator className="my-6" />

      {/* Resolution History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Historial de Resoluciones</h2>
        <ResolutionHistory candidates={candidates} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default CostConsultingDuplicates;
