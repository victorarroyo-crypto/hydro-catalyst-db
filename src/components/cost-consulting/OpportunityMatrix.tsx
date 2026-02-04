import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Calendar, ClipboardList, XCircle, AlertTriangle, RefreshCw, X, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getOpportunityMatrix,
  type OpportunityMatrixData,
  type MatrixQuadrant,
  type MatrixOpportunity,
  type QuadrantKey,
} from '@/services/costConsultingApi';

// ============================================================
// CONSTANTS
// ============================================================

const QUADRANT_CONFIG: Record<QuadrantKey, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  description: string;
}> = {
  quick_wins: {
    label: 'Quick Wins',
    icon: <Zap className="h-4 w-4" />,
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    description: 'Alto impacto, bajo esfuerzo',
  },
  major_projects: {
    label: 'Proyectos Mayores',
    icon: <Calendar className="h-4 w-4" />,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    dotColor: 'bg-blue-500',
    description: 'Alto impacto, alto esfuerzo',
  },
  fill_ins: {
    label: 'Mejoras Menores',
    icon: <ClipboardList className="h-4 w-4" />,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    description: 'Bajo impacto, bajo esfuerzo',
  },
  low_priority: {
    label: 'Baja Prioridad',
    icon: <XCircle className="h-4 w-4" />,
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    description: 'Bajo impacto, alto esfuerzo',
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  validated: 'bg-green-100 text-green-700',
  implemented: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}K`;
  }
  return `€${value.toFixed(0)}`;
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// ============================================================
// QUADRANT CELL COMPONENT
// ============================================================

interface QuadrantCellProps {
  quadrant: MatrixQuadrant;
  config: typeof QUADRANT_CONFIG[QuadrantKey];
  onClick: () => void;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const QuadrantCell: React.FC<QuadrantCellProps> = ({ quadrant, config, onClick, position }) => {
  const roundedClasses = {
    'top-left': 'rounded-tl-lg',
    'top-right': 'rounded-tr-lg',
    'bottom-left': 'rounded-bl-lg',
    'bottom-right': 'rounded-br-lg',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 transition-all duration-200
        ${config.bgColor} ${config.borderColor} border
        ${roundedClasses[position]}
        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-primary/50
        cursor-pointer text-left
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`p-1.5 rounded-md ${config.bgColor}`}>
          {config.icon}
        </span>
        <div>
          <h4 className="font-semibold text-sm">{config.label}</h4>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Opportunity dots */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
        {quadrant.opportunities.slice(0, 8).map((opp, idx) => (
          <span
            key={opp.id || idx}
            className={`w-3 h-3 rounded-full ${config.dotColor}`}
            title={opp.title}
          />
        ))}
        {quadrant.count > 8 && (
          <span className="text-xs text-muted-foreground self-center ml-1">
            +{quadrant.count - 8}
          </span>
        )}
      </div>

      {/* Metrics */}
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold">
          {formatCurrency(quadrant.total_savings)}
        </span>
        <span className="text-xs text-muted-foreground">
          {quadrant.count} {quadrant.count === 1 ? 'oportunidad' : 'oportunidades'}
        </span>
      </div>

      {/* Hover indicator */}
      <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

// ============================================================
// OPPORTUNITY LIST MODAL
// ============================================================

interface OpportunityListModalProps {
  isOpen: boolean;
  onClose: () => void;
  quadrant: MatrixQuadrant | null;
  quadrantKey: QuadrantKey | null;
}

const OpportunityListModal: React.FC<OpportunityListModalProps> = ({
  isOpen,
  onClose,
  quadrant,
  quadrantKey,
}) => {
  if (!quadrant || !quadrantKey) return null;

  const config = QUADRANT_CONFIG[quadrantKey];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            <span>{config.label}</span>
            <Badge variant="secondary" className="ml-2">
              {quadrant.count} oportunidades
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 px-1 border-b">
          <span className="text-sm text-muted-foreground">{config.description}</span>
          <span className="text-sm font-semibold">
            Total: {formatFullCurrency(quadrant.total_savings)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {quadrant.opportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay oportunidades en este cuadrante
            </div>
          ) : (
            quadrant.opportunities.map((opp) => (
              <OpportunityRow key={opp.id} opportunity={opp} dotColor={config.dotColor} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface OpportunityRowProps {
  opportunity: MatrixOpportunity;
  dotColor: string;
}

const OpportunityRow: React.FC<OpportunityRowProps> = ({ opportunity, dotColor }) => {
  const statusClass = STATUS_COLORS[opportunity.status] || STATUS_COLORS.pending;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{opportunity.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {opportunity.type}
          </Badge>
          {opportunity.identified_by && (
            <span className="text-xs text-muted-foreground">
              por {opportunity.identified_by}
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm">
          {formatFullCurrency(opportunity.annual_savings)}
          <span className="text-xs text-muted-foreground font-normal">/año</span>
        </p>
        {opportunity.one_time_recovery && opportunity.one_time_recovery > 0 && (
          <p className="text-xs text-muted-foreground">
            +{formatCurrency(opportunity.one_time_recovery)} único
          </p>
        )}
      </div>

      <Badge className={`${statusClass} text-xs flex-shrink-0`}>
        {opportunity.status}
      </Badge>
    </div>
  );
};

// ============================================================
// LOADING SKELETON
// ============================================================

const MatrixSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-0">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 border">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

interface OpportunityMatrixProps {
  projectId: string;
}

export const OpportunityMatrix: React.FC<OpportunityMatrixProps> = ({ projectId }) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['opportunity-matrix', projectId],
    queryFn: () => getOpportunityMatrix(projectId),
    enabled: !!projectId,
  });

  const handleQuadrantClick = (key: QuadrantKey) => {
    setSelectedQuadrant(key);
  };

  const handleCloseModal = () => {
    setSelectedQuadrant(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Matriz de Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          <MatrixSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error al cargar la matriz: {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin datos de matriz</h3>
          <p className="text-muted-foreground">
            Ejecuta el análisis para ver la matriz de oportunidades.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Matriz de Oportunidades</CardTitle>
            <div className="text-sm text-muted-foreground">
              {data.total_opportunities} oportunidades · {formatCurrency(data.total_savings)} ahorro total
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Axis labels */}
          <div className="flex mb-2">
            <div className="w-8" />
            <div className="flex-1 grid grid-cols-2 gap-0 text-center text-xs font-medium text-muted-foreground">
              <span>Bajo Esfuerzo</span>
              <span>Alto Esfuerzo</span>
            </div>
          </div>

          <div className="flex">
            {/* Y-axis label */}
            <div className="w-8 flex flex-col justify-around items-center">
              <span className="text-xs font-medium text-muted-foreground writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                Alto Impacto
              </span>
              <span className="text-xs font-medium text-muted-foreground writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                Bajo Impacto
              </span>
            </div>

            {/* 2x2 Grid */}
            <div className="flex-1 grid grid-cols-2 gap-0">
              {/* Top row: High Impact */}
              <QuadrantCell
                quadrant={data.quick_wins}
                config={QUADRANT_CONFIG.quick_wins}
                onClick={() => handleQuadrantClick('quick_wins')}
                position="top-left"
              />
              <QuadrantCell
                quadrant={data.major_projects}
                config={QUADRANT_CONFIG.major_projects}
                onClick={() => handleQuadrantClick('major_projects')}
                position="top-right"
              />

              {/* Bottom row: Low Impact */}
              <QuadrantCell
                quadrant={data.fill_ins}
                config={QUADRANT_CONFIG.fill_ins}
                onClick={() => handleQuadrantClick('fill_ins')}
                position="bottom-left"
              />
              <QuadrantCell
                quadrant={data.low_priority}
                config={QUADRANT_CONFIG.low_priority}
                onClick={() => handleQuadrantClick('low_priority')}
                position="bottom-right"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <OpportunityListModal
        isOpen={selectedQuadrant !== null}
        onClose={handleCloseModal}
        quadrant={selectedQuadrant ? data[selectedQuadrant] : null}
        quadrantKey={selectedQuadrant}
      />
    </>
  );
};

export default OpportunityMatrix;
