import React from 'react';
import { 
  FileText, 
  Lightbulb, 
  AlertTriangle, 
  Euro,
  Droplets,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/StatsCard';

interface StatsData {
  documents_count: number;
  opportunities_count: number;
  critical_risks: number;
  total_potential_savings: number;
}

interface WaterBalance {
  total_intake_m3_day: number;
  total_water_cost_annual: number;
  water_efficiency_percent: number;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface OverviewTabProps {
  stats: StatsData;
  waterBalance: WaterBalance | null;
  recentWorkflows: Workflow[];
  onStartDiagnosis: () => void;
  isStartingDiagnosis: boolean;
  showProgress: boolean;
}

const getWorkflowStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getWorkflowStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    running: 'Ejecutando',
    completed: 'Completado',
    failed: 'Error',
  };
  return labels[status] || status;
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  waterBalance,
  recentWorkflows,
  onStartDiagnosis,
  isStartingDiagnosis,
  showProgress,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Documentos"
          value={stats.documents_count}
          icon={FileText}
          variant="default"
        />
        <StatsCard
          title="Oportunidades"
          value={stats.opportunities_count}
          icon={Lightbulb}
          variant="primary"
          className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10"
        />
        <StatsCard
          title="Riesgos Críticos"
          value={stats.critical_risks}
          icon={AlertTriangle}
          variant="default"
          className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10"
        />
        <StatsCard
          title="Ahorro Potencial"
          value={`€${(stats.total_potential_savings || 0).toLocaleString('es-ES')}/año`}
          icon={Euro}
          variant="default"
          className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-500/10"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onStartDiagnosis}
              disabled={showProgress || isStartingDiagnosis}
            >
              {showProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Diagnóstico en progreso...
                </>
              ) : isStartingDiagnosis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Análisis Completo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Balance Hídrico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waterBalance ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Consumo Total</span>
                  <span className="font-semibold">{waterBalance.total_intake_m3_day.toLocaleString('es-ES')} m³/día</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Coste Anual</span>
                  <span className="font-semibold">€{waterBalance.total_water_cost_annual.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Eficiencia</span>
                  <span className="font-semibold">{waterBalance.water_efficiency_percent}%</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Droplets className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Ejecuta un diagnóstico para calcular el balance hídrico
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Workflows Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorkflows.length > 0 ? (
              <div className="space-y-3">
                {recentWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {getWorkflowStatusIcon(workflow.status)}
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workflow.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {getWorkflowStatusLabel(workflow.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  No hay workflows ejecutados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
