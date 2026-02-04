import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getTimelineAnalytics,
  TimelineGranularity,
  TimelineDataPoint,
} from '@/services/costConsultingApi';

interface SpendTimelineChartProps {
  projectId: string;
}

const CHART_COLORS = {
  line: '#307177',
  area: '#307177',
  grid: '#e5e7eb',
};

const GRANULARITY_OPTIONS: { value: TimelineGranularity; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
];

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
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

// Custom Tooltip Component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TimelineDataPoint;
    value: number;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-semibold text-sm mb-2 text-foreground">
        {data.period_label || data.period}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center gap-4">
          <span className="text-muted-foreground text-xs">Gasto total:</span>
          <span className="font-medium text-sm" style={{ color: CHART_COLORS.line }}>
            {formatFullCurrency(data.total_spend)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-muted-foreground text-xs">Nº Facturas:</span>
          <span className="font-medium text-sm">{data.invoice_count}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-muted-foreground text-xs">Categoría principal:</span>
          <span className="font-medium text-sm text-right max-w-[100px] truncate">
            {data.top_category || 'N/A'}
          </span>
        </div>
        {data.avg_invoice_value && (
          <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
            <span className="text-muted-foreground text-xs">Media/Factura:</span>
            <span className="font-medium text-sm">
              {formatFullCurrency(data.avg_invoice_value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const SpendTimelineChart: React.FC<SpendTimelineChartProps> = ({ projectId }) => {
  const [granularity, setGranularity] = useState<TimelineGranularity>('month');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cost-timeline', projectId, granularity],
    queryFn: () => getTimelineAnalytics(projectId, granularity),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolución Temporal del Gasto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Error al cargar datos de timeline</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.data || [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolución Temporal del Gasto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No hay datos temporales disponibles</p>
            <p className="text-xs mt-1">Los datos aparecerán cuando haya facturas procesadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolución Temporal del Gasto
          </CardTitle>
          
          {/* Granularity Selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {GRANULARITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={granularity === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setGranularity(option.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  granularity === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-background'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
          <span>
            Total: <strong className="text-foreground">{formatFullCurrency(data?.total_spend || 0)}</strong>
          </span>
          <span>
            Períodos: <strong className="text-foreground">{data?.period_count || 0}</strong>
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.area} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.area} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                vertical={false}
              />
              
              <XAxis
                dataKey="period_label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.grid }}
                dy={10}
              />
              
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="total_spend"
                fill="url(#areaGradient)"
                stroke="none"
              />
              
              <Line
                type="monotone"
                dataKey="total_spend"
                stroke={CHART_COLORS.line}
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: 'white',
                  stroke: CHART_COLORS.line,
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: CHART_COLORS.line,
                  stroke: 'white',
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
