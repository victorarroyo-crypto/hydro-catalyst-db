import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ============================================================
// TYPES
// ============================================================

interface DuplicateAlertWidgetProps {
  projectId: string;
  duplicateCandidates: number;
  potentialSavings: number;
}

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(1)}K`;
  }
  return `€${value.toFixed(0)}`;
};

// ============================================================
// COMPONENT
// ============================================================

export const DuplicateAlertWidget: React.FC<DuplicateAlertWidgetProps> = ({
  projectId,
  duplicateCandidates,
  potentialSavings,
}) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/cost-consulting/${projectId}/duplicates`);
  };

  // No duplicates detected - success state
  if (duplicateCandidates === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Sin duplicados detectados</h3>
              <p className="text-sm text-green-600">
                Todas las facturas han sido verificadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Duplicates detected - warning state
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Posibles Duplicados</h3>
          </div>

          {/* Stats */}
          <div className="space-y-1">
            <p className="text-sm text-amber-700">
              <span className="font-semibold text-amber-800">{duplicateCandidates}</span>
              {' '}factura{duplicateCandidates !== 1 ? 's' : ''} pendiente{duplicateCandidates !== 1 ? 's' : ''} de revisión
            </p>
            {potentialSavings > 0 && (
              <p className="text-sm text-amber-700">
                Ahorro potencial:{' '}
                <span className="font-semibold text-amber-800">
                  {formatCurrency(potentialSavings)}
                </span>
              </p>
            )}
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          >
            Ver Detalles
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DuplicateAlertWidget;
