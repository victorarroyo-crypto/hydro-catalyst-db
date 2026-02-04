import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Cell,
} from 'recharts';
import { Euro, TrendingDown, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  getDashboard,
  type DashboardData,
  type SpendByCategory,
  type SpendBySupplier,
} from '@/services/costConsultingApi';

// ============================================================
// CONSTANTS
// ============================================================

const BRAND_COLORS = {
  primary: '#307177',
  accent: '#32b4cd',
  positive: '#8cb63c',
  warning: '#ffa720',
  danger: '#ef4444',
};

const BENCHMARK_COLORS: Record<SpendByCategory['benchmark_comparison'], string> = {
  excellent: '#8cb63c',
  good: '#32b4cd',
  average: '#ffa720',
  above_market: '#ef4444',
};

const BENCHMARK_LABELS: Record<SpendByCategory['benchmark_comparison'], string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  average: 'Promedio',
  above_market: 'Por encima',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(0)}K`;
  }
  return `€${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

// ============================================================
// SUBCOMPONENTS
// ============================================================

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, subtitle, color }) => (
  <Card className="flex-1 min-w-[140px]">
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color || BRAND_COLORS.primary}15` }}>
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-4 w-4',
            style: { color: color || BRAND_COLORS.primary },
          })}
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: color || BRAND_COLORS.primary }}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

const KPICardSkeleton: React.FC = () => (
  <Card className="flex-1 min-w-[140px]">
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-20 mt-2" />
    </CardContent>
  </Card>
);

interface DashboardKPICardsProps {
  data: DashboardData['summary'];
}

const DashboardKPICards: React.FC<DashboardKPICardsProps> = ({ data }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <KPICard
      title="Gasto Analizado"
      value={formatCurrency(data.total_spend)}
      icon={<Euro />}
      subtitle={`${data.invoice_count} facturas`}
      color={BRAND_COLORS.primary}
    />
    <KPICard
      title="Ahorro Potencial"
      value={formatCurrency(data.total_savings_identified)}
      icon={<TrendingDown />}
      subtitle={`${data.quick_wins_count} quick wins`}
      color={BRAND_COLORS.positive}
    />
    <KPICard
      title="% Ahorro"
      value={formatPercent(data.savings_pct)}
      icon={<TrendingDown />}
      subtitle="del gasto total"
      color={BRAND_COLORS.accent}
    />
    <KPICard
      title="Oportunidades"
      value={data.opportunities_count}
      icon={<Lightbulb />}
      subtitle={`${data.supplier_count} proveedores`}
      color={BRAND_COLORS.warning}
    />
  </div>
);

// ============================================================
// CHART COMPONENTS
// ============================================================

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SpendByCategory }>;
}

const CategoryTooltip: React.FC<CategoryTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{item.category_name}</p>
      <p className="text-muted-foreground">
        Gasto: <span className="font-medium text-foreground">{formatCurrency(item.total_spend)}</span>
      </p>
      <p className="text-muted-foreground">
        % Total: <span className="font-medium text-foreground">{formatPercent(item.pct_of_total)}</span>
      </p>
      <p className="flex items-center gap-1.5 mt-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: BENCHMARK_COLORS[item.benchmark_comparison] }}
        />
        <span className="text-muted-foreground">
          Benchmark: <span className="font-medium">{BENCHMARK_LABELS[item.benchmark_comparison]}</span>
        </span>
      </p>
    </div>
  );
};

interface SpendByCategoryChartProps {
  data: SpendByCategory[];
}

const SpendByCategoryChart: React.FC<SpendByCategoryChartProps> = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos de categorías
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={12} />
        <YAxis
          type="category"
          dataKey="category_name"
          fontSize={12}
          width={75}
          tickLine={false}
        />
        <Tooltip content={<CategoryTooltip />} />
        <Bar dataKey="total_spend" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={BENCHMARK_COLORS[entry.benchmark_comparison]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface SupplierTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SpendBySupplier }>;
}

const SupplierTooltip: React.FC<SupplierTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const flags = item.risk_flags;
  const hasRisk = flags.single_source || flags.no_contract || flags.high_concentration;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{item.supplier_name}</p>
      <p className="text-muted-foreground">
        Gasto: <span className="font-medium text-foreground">{formatCurrency(item.total_spend)}</span>
      </p>
      <p className="text-muted-foreground">
        Facturas: <span className="font-medium text-foreground">{item.invoice_count}</span>
      </p>
      <p className="text-muted-foreground">
        % Total: <span className="font-medium text-foreground">{formatPercent(item.pct_of_total)}</span>
      </p>
      {hasRisk && (
        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="text-xs font-medium flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" /> Alertas de Riesgo
          </p>
          {flags.single_source && (
            <p className="text-xs text-muted-foreground">• Proveedor único</p>
          )}
          {flags.no_contract && (
            <p className="text-xs text-muted-foreground">• Sin contrato</p>
          )}
          {flags.high_concentration && (
            <p className="text-xs text-muted-foreground">• Alta concentración</p>
          )}
        </div>
      )}
    </div>
  );
};

interface SpendBySupplierChartProps {
  data: SpendBySupplier[];
}

const SpendBySupplierChart: React.FC<SpendBySupplierChartProps> = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos de proveedores
      </div>
    );
  }

  // Limit to top 10 suppliers for readability
  const topSuppliers = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={topSuppliers} margin={{ left: 10, right: 20, top: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="supplier_name"
          fontSize={11}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}…` : value}
        />
        <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={12} />
        <Tooltip content={<SupplierTooltip />} />
        <Bar dataKey="total_spend" fill={BRAND_COLORS.primary} radius={[4, 4, 0, 0]}>
          {topSuppliers.map((entry, index) => {
            const hasRisk = entry.risk_flags.single_source || 
                           entry.risk_flags.no_contract || 
                           entry.risk_flags.high_concentration;
            return (
              <Cell 
                key={index} 
                fill={hasRisk ? BRAND_COLORS.warning : BRAND_COLORS.primary}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface SpendTimelineChartProps {
  data: DashboardData['timeline'];
}

const SpendTimelineChart: React.FC<SpendTimelineChartProps> = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos temporales
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND_COLORS.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BRAND_COLORS.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" fontSize={12} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={12} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Gasto']}
          labelFormatter={(label) => `Periodo: ${label}`}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Area
          type="monotone"
          dataKey="total_spend"
          stroke={BRAND_COLORS.primary}
          strokeWidth={2}
          fill="url(#spendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const ChartSkeleton: React.FC = () => (
  <div className="h-[300px] flex items-center justify-center">
    <div className="space-y-3 w-full px-8">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

interface CostDashboardProps {
  projectId: string;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('categories');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cost-dashboard', projectId],
    queryFn: () => getDashboard(projectId),
    enabled: !!projectId,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-64" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error al cargar el dashboard: {error.message}</span>
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
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin datos de análisis</h3>
          <p className="text-muted-foreground">
            Sube documentos y ejecuta el análisis para ver el dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <DashboardKPICards data={data.summary} />

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Análisis de Costes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
              <TabsTrigger value="timeline">Evolución</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="mt-0">
              <SpendByCategoryChart data={data.spend_by_category} />
            </TabsContent>

            <TabsContent value="suppliers" className="mt-0">
              <SpendBySupplierChart data={data.spend_by_supplier} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <SpendTimelineChart data={data.timeline} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostDashboard;
