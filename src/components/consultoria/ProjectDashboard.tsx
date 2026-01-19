/**
 * WaterTech Projects - Dashboard Components for Lovable
 *
 * Componentes React con gráficos para visualizar:
 * - Balance hídrico (Sankey/Pie)
 * - Hallazgos por tipo y prioridad
 * - Ahorros potenciales
 * - Estado de workflows
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Droplets, AlertTriangle, Zap, TrendingUp,
  Euro, Leaf
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface WaterBalance {
  intake_sources: Array<{ source: string; flow_m3_day: number; cost_eur_m3?: number }>;
  consumption_areas: Array<{ area: string; flow_m3_day: number; percent?: number }>;
  effluent_streams: Array<{ stream: string; flow_m3_day: number }>;
  total_intake_m3_day: number;
  total_effluent_m3_day: number;
  water_efficiency_percent: number;
  total_water_cost_annual: number;
}

export interface Finding {
  id: string;
  finding_type: 'risk' | 'quick_win' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  area: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_savings_annual?: number;
  estimated_investment?: number;
  estimated_payback_months?: number;
  status: string;
}

export interface ProjectStats {
  findings_count: number;
  critical_risks: number;
  quick_wins: number;
  opportunities: number;
  total_potential_savings: number;
  workflows_count: number;
  workflows_completed: number;
}

// ============================================================================
// COLORES
// ============================================================================

const COLORS = {
  primary: '#0ea5e9',    // Sky blue - agua
  success: '#22c55e',    // Green - oportunidades
  warning: '#f59e0b',    // Amber - advertencias
  danger: '#ef4444',     // Red - riesgos
  info: '#8b5cf6',       // Purple - info
  neutral: '#64748b',    // Slate - neutral
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#0ea5e9',
  low: '#64748b',
};

const FINDING_TYPE_COLORS: Record<string, string> = {
  risk: '#ef4444',
  quick_win: '#22c55e',
  opportunity: '#0ea5e9',
  recommendation: '#8b5cf6',
};

// ============================================================================
// COMPONENTE: Tarjetas de Resumen
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, trend, trendValue, color = COLORS.primary
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
              <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
              {trendValue}
            </div>
          )}
        </div>
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// COMPONENTE: Resumen del Proyecto
// ============================================================================

interface ProjectSummaryCardsProps {
  stats: ProjectStats;
  waterBalance?: WaterBalance;
}

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  stats,
  waterBalance
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Ahorro Potencial"
        value={`${(stats.total_potential_savings / 1000).toFixed(0)}k €`}
        subtitle="anual estimado"
        icon={<Euro className="h-6 w-6" />}
        color={COLORS.success}
      />
      <StatCard
        title="Quick Wins"
        value={stats.quick_wins}
        subtitle="acciones rápidas"
        icon={<Zap className="h-6 w-6" />}
        color={COLORS.warning}
      />
      <StatCard
        title="Riesgos Críticos"
        value={stats.critical_risks}
        subtitle="requieren atención"
        icon={<AlertTriangle className="h-6 w-6" />}
        color={COLORS.danger}
      />
      <StatCard
        title="Eficiencia Hídrica"
        value={waterBalance ? `${waterBalance.water_efficiency_percent.toFixed(0)}%` : '-'}
        subtitle="del agua utilizada"
        icon={<Droplets className="h-6 w-6" />}
        color={COLORS.primary}
      />
    </div>
  );
};

// ============================================================================
// COMPONENTE: Gráfico de Balance Hídrico (Pie Chart)
// ============================================================================

interface WaterBalanceChartProps {
  waterBalance: WaterBalance;
}

export const WaterBalanceChart: React.FC<WaterBalanceChartProps> = ({
  waterBalance
}) => {
  const consumptionData = waterBalance.consumption_areas.map((area, i) => ({
    name: area.area,
    value: area.flow_m3_day,
    color: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.neutral][i % 5],
  }));

  const totalIntake = waterBalance.total_intake_m3_day;
  const totalEffluent = waterBalance.total_effluent_m3_day;
  const losses = totalIntake - totalEffluent;
  const efficiency = ((totalIntake - losses) / totalIntake * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Balance Hídrico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consumptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {consumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} m³/día`, 'Consumo']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Resumen */}
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Entrada total</span>
              <span className="font-semibold text-primary">
                {totalIntake.toFixed(0)} m³/día
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Efluente</span>
              <span className="font-semibold text-blue-600">
                {totalEffluent.toFixed(0)} m³/día
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Pérdidas/Evaporación</span>
              <span className="font-semibold text-amber-600">
                {losses.toFixed(0)} m³/día
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Eficiencia hídrica</span>
              <span className="font-semibold text-green-600">
                {efficiency}%
              </span>
            </div>

            {/* Coste anual */}
            {waterBalance.total_water_cost_annual > 0 && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Coste anual de agua</p>
                <p className="text-2xl font-bold text-primary">
                  {waterBalance.total_water_cost_annual.toLocaleString()} EUR
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: Gráfico de Hallazgos por Tipo
// ============================================================================

interface FindingsChartProps {
  findings: Finding[];
}

export const FindingsChart: React.FC<FindingsChartProps> = ({ findings }) => {
  const byType = findings.reduce((acc, f) => {
    acc[f.finding_type] = (acc[f.finding_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeData = [
    { name: 'Riesgos', value: byType.risk || 0, color: FINDING_TYPE_COLORS.risk },
    { name: 'Quick Wins', value: byType.quick_win || 0, color: FINDING_TYPE_COLORS.quick_win },
    { name: 'Oportunidades', value: byType.opportunity || 0, color: FINDING_TYPE_COLORS.opportunity },
    { name: 'Recomendaciones', value: byType.recommendation || 0, color: FINDING_TYPE_COLORS.recommendation },
  ].filter(d => d.value > 0);

  const byPriority = findings.reduce((acc, f) => {
    acc[f.priority] = (acc[f.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityData = [
    { name: 'Crítico', value: byPriority.critical || 0, color: PRIORITY_COLORS.critical },
    { name: 'Alto', value: byPriority.high || 0, color: PRIORITY_COLORS.high },
    { name: 'Medio', value: byPriority.medium || 0, color: PRIORITY_COLORS.medium },
    { name: 'Bajo', value: byPriority.low || 0, color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-600" />
          Hallazgos del Diagnóstico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Tipo */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-4">Por Tipo</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Por Prioridad */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-4">Por Prioridad</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: Gráfico de Ahorros Potenciales
// ============================================================================

interface SavingsChartProps {
  findings: Finding[];
}

export const SavingsChart: React.FC<SavingsChartProps> = ({ findings }) => {
  const withSavings = findings
    .filter(f => f.estimated_savings_annual && f.estimated_savings_annual > 0)
    .sort((a, b) => (b.estimated_savings_annual || 0) - (a.estimated_savings_annual || 0))
    .slice(0, 6);

  const savingsData = withSavings.map(f => ({
    name: f.title.length > 25 ? f.title.substring(0, 25) + '...' : f.title,
    ahorro: f.estimated_savings_annual || 0,
    inversion: f.estimated_investment || 0,
    payback: f.estimated_payback_months || 0,
    area: f.area,
    type: f.finding_type,
  }));

  const totalSavings = withSavings.reduce((sum, f) => sum + (f.estimated_savings_annual || 0), 0);
  const totalInvestment = withSavings.reduce((sum, f) => sum + (f.estimated_investment || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5 text-green-600" />
          Ahorros Potenciales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Ahorro Total/Año</p>
            <p className="text-xl font-bold text-green-600">
              {totalSavings.toLocaleString()} EUR
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Inversión Total</p>
            <p className="text-xl font-bold text-blue-600">
              {totalInvestment.toLocaleString()} EUR
            </p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Payback Medio</p>
            <p className="text-xl font-bold text-amber-600">
              {totalInvestment > 0 && totalSavings > 0 ? Math.round(totalInvestment / totalSavings * 12) : 0} meses
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} EUR`,
                  name === 'ahorro' ? 'Ahorro/año' : 'Inversión'
                ]}
              />
              <Legend />
              <Bar dataKey="ahorro" fill={COLORS.success} name="Ahorro/año" />
              <Bar dataKey="inversion" fill={COLORS.primary} name="Inversión" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: Lista de Hallazgos
// ============================================================================

interface FindingsListProps {
  findings: Finding[];
  maxItems?: number;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  maxItems = 5
}) => {
  const sortedFindings = [...findings]
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    })
    .slice(0, maxItems);

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-amber-100 text-amber-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    };
    return (
      <Badge className={variants[priority] || variants.low}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      risk: 'bg-red-50 text-red-700 border-red-200',
      quick_win: 'bg-green-50 text-green-700 border-green-200',
      opportunity: 'bg-blue-50 text-blue-700 border-blue-200',
      recommendation: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    const labels: Record<string, string> = {
      risk: 'Riesgo',
      quick_win: 'Quick Win',
      opportunity: 'Oportunidad',
      recommendation: 'Recomendación',
    };
    return (
      <Badge variant="outline" className={variants[type] || ''}>
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Principales Hallazgos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedFindings.map((finding) => (
            <div
              key={finding.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(finding.finding_type)}
                  {getPriorityBadge(finding.priority)}
                  <span className="text-xs text-muted-foreground">{finding.area}</span>
                </div>
                <p className="font-medium">{finding.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {finding.description}
                </p>
              </div>
              {finding.estimated_savings_annual && (
                <div className="text-right ml-4 shrink-0">
                  <p className="text-lg font-bold text-green-600">
                    {finding.estimated_savings_annual.toLocaleString()} EUR
                  </p>
                  <p className="text-xs text-muted-foreground">ahorro/año</p>
                  {finding.estimated_payback_months && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Payback: {finding.estimated_payback_months} meses
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: Dashboard Completo
// ============================================================================

interface ProjectDashboardProps {
  stats: ProjectStats;
  waterBalance?: WaterBalance;
  findings: Finding[];
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  stats,
  waterBalance,
  findings,
}) => {
  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <ProjectSummaryCards stats={stats} waterBalance={waterBalance} />

      {/* Balance hídrico y hallazgos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {waterBalance && <WaterBalanceChart waterBalance={waterBalance} />}
        <FindingsChart findings={findings} />
      </div>

      {/* Ahorros */}
      <SavingsChart findings={findings} />

      {/* Lista de hallazgos */}
      <FindingsList findings={findings} />
    </div>
  );
};

export default ProjectDashboard;
