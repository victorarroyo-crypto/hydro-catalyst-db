import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  Euro,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  Copy,
  Zap,
  Target,
  Clock,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  getDashboard,
  getOpportunityMatrix,
  getBenchmarkComparison,
  getDuplicateStats,
  type DashboardData,
  type SpendBySupplier,
  type OpportunityMatrixData,
  type BenchmarkComparisonData,
  type BenchmarkPosition,
  type DuplicateStats,
} from '@/services/costConsultingApi';
import { SpendByCategoryChart } from './SpendByCategoryChart';

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

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

// ============================================================
// KPI CARD
// ============================================================

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, subtitle, color }) => (
  <Card className="flex-1 min-w-[130px]">
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </span>
        <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: `${color || BRAND_COLORS.primary}15` }}>
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-4 w-4',
            style: { color: color || BRAND_COLORS.primary },
          })}
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: color || BRAND_COLORS.primary }}>
        {value}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

const KPICardSkeleton: React.FC = () => (
  <Card className="flex-1 min-w-[130px]">
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

// ============================================================
// OPPORTUNITY MATRIX MINI
// ============================================================

const QUADRANT_CONFIG = {
  quick_wins: { label: 'Quick Wins', icon: <Zap />, color: BRAND_COLORS.positive, bg: '#8cb63c15' },
  major_projects: { label: 'Proyectos Clave', icon: <Target />, color: BRAND_COLORS.accent, bg: '#32b4cd15' },
  fill_ins: { label: 'Fill-ins', icon: <Clock />, color: BRAND_COLORS.warning, bg: '#ffa72015' },
  low_priority: { label: 'Baja Prioridad', icon: <ArrowDownRight />, color: '#94a3b8', bg: '#94a3b815' },
} as const;

const OpportunityMatrixMini: React.FC<{ data: OpportunityMatrixData }> = ({ data }) => (
  <div className="grid grid-cols-2 gap-2 h-full">
    {(Object.keys(QUADRANT_CONFIG) as Array<keyof typeof QUADRANT_CONFIG>).map((key) => {
      const cfg = QUADRANT_CONFIG[key];
      const q = data[key];
      return (
        <div
          key={key}
          className="rounded-lg p-3 border flex flex-col justify-between"
          style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            {React.cloneElement(cfg.icon, { className: 'h-3.5 w-3.5', style: { color: cfg.color } })}
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">{q.count}</span>
            <p className="text-[11px] text-muted-foreground">{formatCurrency(q.total_savings)}</p>
          </div>
        </div>
      );
    })}
  </div>
);

// ============================================================
// SUPPLIER CHART
// ============================================================

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
          {flags.single_source && <p className="text-xs text-muted-foreground">• Proveedor único</p>}
          {flags.no_contract && <p className="text-xs text-muted-foreground">• Sin contrato</p>}
          {flags.high_concentration && <p className="text-xs text-muted-foreground">• Alta concentración</p>}
        </div>
      )}
    </div>
  );
};

const SpendBySupplierChart: React.FC<{ data: SpendBySupplier[] }> = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
        No hay datos de proveedores
      </div>
    );
  }
  const topSuppliers = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={topSuppliers} margin={{ left: 10, right: 20, top: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="supplier_name"
          fontSize={11}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
        />
        <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={12} />
        <Tooltip content={<SupplierTooltip />} />
        <Bar dataKey="total_spend" fill={BRAND_COLORS.primary} radius={[4, 4, 0, 0]}>
          {topSuppliers.map((entry, index) => {
            const hasRisk =
              entry.risk_flags.single_source ||
              entry.risk_flags.no_contract ||
              entry.risk_flags.high_concentration;
            return <Cell key={index} fill={hasRisk ? BRAND_COLORS.warning : BRAND_COLORS.primary} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================================
// TIMELINE CHART
// ============================================================

const SpendTimelineChart: React.FC<{ data: DashboardData['timeline'] }> = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
        No hay datos temporales
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
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

// ============================================================
// BENCHMARK TABLE
// ============================================================

const POSITION_STYLES: Record<BenchmarkPosition, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excelente', color: BRAND_COLORS.positive, bg: '#8cb63c20' },
  good: { label: 'Bueno', color: BRAND_COLORS.accent, bg: '#32b4cd20' },
  average: { label: 'Promedio', color: BRAND_COLORS.warning, bg: '#ffa72020' },
  above_market: { label: 'Sobre mercado', color: BRAND_COLORS.danger, bg: '#ef444420' },
};

const BenchmarkTable: React.FC<{ data: BenchmarkComparisonData }> = ({ data }) => {
  if (!data?.categories?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No hay datos de benchmark
      </div>
    );
  }

  const sorted = [...data.categories].sort((a, b) => b.potential_savings - a.potential_savings);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Categoría</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Tu Precio</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Mediana</th>
            <th className="text-center py-2 px-3 font-medium text-muted-foreground">Posición</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Ahorro Pot.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cat) => {
            const pos = POSITION_STYLES[cat.position] || POSITION_STYLES.average;
            return (
              <tr key={cat.category_id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{cat.category_name}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(cat.your_price)}</td>
                <td className="py-2 px-3 text-right text-muted-foreground">
                  {formatCurrency(cat.benchmark_median)}
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                    style={{ color: pos.color, backgroundColor: pos.bg }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: pos.color }}
                    />
                    {pos.label}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-semibold" style={{ color: cat.potential_savings > 0 ? BRAND_COLORS.positive : 'inherit' }}>
                  {cat.potential_savings > 0 ? formatCurrency(cat.potential_savings) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.total_potential_savings > 0 && (
        <div className="flex justify-between items-center pt-3 mt-1 border-t px-3">
          <span className="text-xs text-muted-foreground font-medium">
            {data.categories_above_median} categorías sobre mediana
          </span>
          <span className="text-sm font-bold" style={{ color: BRAND_COLORS.positive }}>
            Total: {formatCurrency(data.total_potential_savings)}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SKELETON HELPERS
// ============================================================

const ChartSkeleton: React.FC = () => (
  <div className="h-[280px] flex items-center justify-center">
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
  // Primary query (blocking)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cost-dashboard', projectId],
    queryFn: () => getDashboard(projectId),
    enabled: !!projectId,
  });

  // Optional enrichment queries
  const { data: matrixData } = useQuery({
    queryKey: ['cost-opportunity-matrix', projectId],
    queryFn: () => getOpportunityMatrix(projectId),
    enabled: !!projectId,
    retry: false,
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ['cost-benchmarks', projectId],
    queryFn: () => getBenchmarkComparison(projectId),
    enabled: !!projectId,
    retry: false,
  });

  const { data: duplicateData } = useQuery({
    queryKey: ['cost-duplicate-stats', projectId],
    queryFn: () => getDuplicateStats(projectId),
    enabled: !!projectId,
    retry: false,
  });

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardContent className="pt-6"><ChartSkeleton /></CardContent></Card>
          <Card><CardContent className="pt-6"><ChartSkeleton /></CardContent></Card>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error al cargar el dashboard: {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty
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

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Row 1: 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Gasto Total"
          value={formatCurrency(s.total_spend)}
          icon={<Euro />}
          subtitle="analizado"
          color={BRAND_COLORS.primary}
        />
        <KPICard
          title="Ahorro Potencial"
          value={formatCurrency(s.total_savings_identified)}
          icon={<TrendingDown />}
          subtitle={`${s.quick_wins_count} quick wins`}
          color={BRAND_COLORS.positive}
        />
        <KPICard
          title="% Ahorro"
          value={formatPercent(s.savings_pct)}
          icon={<TrendingDown />}
          subtitle="del gasto total"
          color={BRAND_COLORS.accent}
        />
        <KPICard
          title="Facturas"
          value={s.invoice_count}
          icon={<FileText />}
          subtitle={`${s.opportunities_count} oportunidades`}
          color={BRAND_COLORS.primary}
        />
        <KPICard
          title="Proveedores"
          value={s.supplier_count}
          icon={<Users />}
          color={BRAND_COLORS.warning}
        />
        <KPICard
          title="Duplicados"
          value={duplicateData?.pending ?? s.duplicate_candidates ?? 0}
          icon={<Copy />}
          subtitle={
            duplicateData
              ? `${formatCurrency(duplicateData.total_potential_savings)} potencial`
              : s.potential_duplicate_savings
              ? `${formatCurrency(s.potential_duplicate_savings)} potencial`
              : undefined
          }
          color={BRAND_COLORS.danger}
        />
      </div>

      {/* Row 2: Categories + Opportunity Matrix */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendByCategoryChart data={data.spend_by_category} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Matriz de Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            {matrixData ? (
              <OpportunityMatrixMini data={matrixData} />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Ejecuta el análisis para ver oportunidades
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Suppliers + Timeline */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendBySupplierChart data={data.spend_by_supplier} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolución Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendTimelineChart data={data.timeline} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Benchmark Comparison */}
      {benchmarkData && benchmarkData.categories?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativa de Benchmark</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkTable data={benchmarkData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CostDashboard;
