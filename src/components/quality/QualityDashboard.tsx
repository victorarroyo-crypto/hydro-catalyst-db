/**
 * Dashboard card showing data quality metrics
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Building2, 
  Globe, 
  MapPin, 
  FileText, 
  Gauge, 
  Tag, 
  Copy,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { QualityStats } from '@/hooks/useDataQualityStats';

interface QualityDashboardProps {
  stats: QualityStats;
  isLoading: boolean;
  onIssueClick: (issueType: string) => void;
}

interface MetricCardProps {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  variant?: 'error' | 'warning' | 'success';
  onClick?: () => void;
}

function MetricCard({ label, count, total, icon, variant = 'warning', onClick }: MetricCardProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  const colorClasses = {
    error: 'text-destructive border-destructive/30 bg-destructive/5',
    warning: 'text-amber-600 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20',
    success: 'text-emerald-600 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all hover:shadow-md text-left w-full ${colorClasses[variant]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold">{count}</span>
        {icon}
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs opacity-70">{percentage}% del total</p>
    </button>
  );
}

export function QualityDashboard({ stats, isLoading, onIssueClick }: QualityDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Health Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {stats.completenessScore >= 70 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : stats.completenessScore >= 40 ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Salud de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={stats.completenessScore} className="h-3" />
            </div>
            <span className="text-2xl font-bold">{stats.completenessScore}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.total} tecnologías analizadas • {stats.total - stats.issues.noClassification} clasificadas
          </p>
        </CardContent>
      </Card>

      {/* Issue Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Sin Proveedor"
          count={stats.issues.noProvider}
          total={stats.total}
          icon={<Building2 className="h-5 w-5" />}
          variant={stats.issues.noProvider > stats.total * 0.2 ? 'error' : 'warning'}
          onClick={() => onIssueClick('sin_proveedor')}
        />
        <MetricCard
          label="Sin Web"
          count={stats.issues.noWeb}
          total={stats.total}
          icon={<Globe className="h-5 w-5" />}
          variant="warning"
          onClick={() => onIssueClick('sin_web')}
        />
        <MetricCard
          label="Sin País"
          count={stats.issues.noCountry}
          total={stats.total}
          icon={<MapPin className="h-5 w-5" />}
          variant="warning"
          onClick={() => onIssueClick('sin_pais')}
        />
        <MetricCard
          label="Descripción Corta"
          count={stats.issues.shortDescription}
          total={stats.total}
          icon={<FileText className="h-5 w-5" />}
          variant="warning"
          onClick={() => onIssueClick('descripcion_corta')}
        />
        <MetricCard
          label="Sin TRL"
          count={stats.issues.noTRL}
          total={stats.total}
          icon={<Gauge className="h-5 w-5" />}
          variant="warning"
          onClick={() => onIssueClick('sin_trl')}
        />
        <MetricCard
          label="Sin Clasificar"
          count={stats.issues.noClassification}
          total={stats.total}
          icon={<Tag className="h-5 w-5" />}
          variant={stats.issues.noClassification > stats.total * 0.3 ? 'error' : 'warning'}
          onClick={() => onIssueClick('sin_clasificar')}
        />
        <MetricCard
          label="Nombres Genéricos"
          count={stats.issues.genericNames}
          total={stats.total}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={stats.issues.genericNames > stats.total * 0.1 ? 'error' : 'warning'}
          onClick={() => onIssueClick('nombre_generico')}
        />
        <MetricCard
          label="Posibles Duplicados"
          count={stats.issues.potentialDuplicates}
          total={stats.total}
          icon={<Copy className="h-5 w-5" />}
          variant="warning"
          onClick={() => onIssueClick('duplicados')}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Ventaja Competitiva</p>
                <p className="text-xl font-semibold">{stats.issues.noAdvantage}</p>
              </div>
              <button 
                onClick={() => onIssueClick('sin_ventaja')}
                className="text-xs text-primary hover:underline"
              >
                Ver →
              </button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Innovación</p>
                <p className="text-xl font-semibold">{stats.issues.noInnovation}</p>
              </div>
              <button 
                onClick={() => onIssueClick('sin_innovacion')}
                className="text-xs text-primary hover:underline"
              >
                Ver →
              </button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Aplicación</p>
                <p className="text-xl font-semibold">{stats.issues.noApplication}</p>
              </div>
              <button 
                onClick={() => onIssueClick('sin_aplicacion')}
                className="text-xs text-primary hover:underline"
              >
                Ver →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
