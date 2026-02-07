import React, { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Download, AlertTriangle, ChevronDown, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  useLlmCosts,
  getProviderType,
  formatCurrency,
  formatTokens,
  exportToCsv,
  LlmUsageLog,
} from '@/hooks/useLlmCosts';

type PeriodOption = 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

const COLORS = {
  llm: '#32b4cd',
  embedding: '#8cb63c',
  search: '#ffa720',
  border: {
    total: '#307177',
    llm: '#32b4cd',
    embedding: '#8cb63c',
    search: '#ffa720',
  },
};

export default function ApiCosts() {
  const [period, setPeriod] = useState<PeriodOption>('30days');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState(50);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    switch (period) {
      case 'today':
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '7days':
        return {
          startDate: format(subDays(today, 6), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '30days':
        return {
          startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          startDate: customStart ? format(customStart, 'yyyy-MM-dd') : format(subDays(today, 29), 'yyyy-MM-dd'),
          endDate: customEnd ? format(customEnd, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
    }
  }, [period, customStart, customEnd]);

  const {
    logs,
    summary,
    chartData,
    providerBreakdown,
    recentLogs,
    isLoading,
    error,
    hasMoreData,
  } = useLlmCosts(startDate, endDate);

  const handleExport = () => {
    exportToCsv(logs, startDate, endDate);
  };

  const loadMoreLogs = () => {
    setVisibleLogs((prev) => prev + 50);
  };

  const displayedLogs = useMemo(() => logs.slice(0, visibleLogs), [logs, visibleLogs]);

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span>Error al cargar datos: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold text-foreground">Costes API</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Seguimiento de uso y costes de LLM, Embeddings y Web Search
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7days">7 días</SelectItem>
              <SelectItem value="30days">30 días</SelectItem>
              <SelectItem value="thisMonth">Este mes</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {customStart ? format(customStart, 'dd/MM/yyyy') : 'Inicio'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Fin'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button onClick={handleExport} variant="outline" disabled={isLoading || logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {hasMoreData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Mostrando los últimos 5,000 registros. Para períodos más largos, contacta con administración.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Coste Total"
          value={formatCurrency(summary.totalCost)}
          subtitle={`${formatTokens(summary.totalCalls)} llamadas API`}
          borderColor={COLORS.border.total}
          isLoading={isLoading}
        />
        <SummaryCard
          title="LLM"
          value={formatCurrency(summary.llmCost)}
          subtitle={`${formatTokens(summary.llmCalls)} llamadas · ${formatTokens(summary.llmTokens)} tokens`}
          borderColor={COLORS.border.llm}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Embeddings"
          value={formatCurrency(summary.embeddingCost)}
          subtitle={`${formatTokens(summary.embeddingCalls)} llamadas · ${formatTokens(summary.embeddingTokens)} tokens`}
          borderColor={COLORS.border.embedding}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Web Search"
          value={formatCurrency(summary.searchCost)}
          subtitle={`${formatTokens(summary.searchCalls)} búsquedas`}
          borderColor={COLORS.border.search}
          isLoading={isLoading}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Costes Diarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay registros de uso en este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLlm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.llm} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.llm} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorEmbedding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.embedding} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.embedding} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorSearch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.search} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.search} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="dateFormatted"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'llm' ? 'LLM' : name === 'embedding' ? 'Embeddings' : 'Web Search',
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === 'llm' ? 'LLM' : value === 'embedding' ? 'Embeddings' : 'Web Search'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="llm"
                  stackId="1"
                  stroke={COLORS.llm}
                  fill="url(#colorLlm)"
                />
                <Area
                  type="monotone"
                  dataKey="embedding"
                  stackId="1"
                  stroke={COLORS.embedding}
                  fill="url(#colorEmbedding)"
                />
                <Area
                  type="monotone"
                  dataKey="search"
                  stackId="1"
                  stroke={COLORS.search}
                  fill="url(#colorSearch)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Provider Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : providerBreakdown.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay registros de uso en este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Llamadas</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Coste</TableHead>
                    <TableHead className="text-right">Latencia media</TableHead>
                    <TableHead className="text-right">Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerBreakdown.map((row, idx) => {
                    const type = getProviderType(row.provider);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{row.provider}</TableCell>
                        <TableCell>
                          <ProviderTypeBadge type={type} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.model}
                        </TableCell>
                        <TableCell className="text-right">{formatTokens(row.calls)}</TableCell>
                        <TableCell className="text-right">{formatTokens(row.tokens)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avgLatency > 0 ? `${row.avgLatency}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.errors > 0 ? (
                            <Badge variant="destructive">{row.errors}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs (Collapsible) */}
      <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Últimas {Math.min(visibleLogs, logs.length)} llamadas API
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-muted-foreground transition-transform',
                    logsExpanded && 'rotate-180'
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : displayedLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay registros de uso en este período.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha/Hora</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Tokens In/Out</TableHead>
                          <TableHead className="text-right">Coste</TableHead>
                          <TableHead className="text-right">Latencia</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedLogs.map((log) => (
                          <LogRow key={log.id} log={log} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {visibleLogs < logs.length && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" onClick={loadMoreLogs}>
                        Ver más ({logs.length - visibleLogs} restantes)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  borderColor,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle: string;
  borderColor: string;
  isLoading: boolean;
}) {
  return (
    <Card
      className="relative overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <CardContent className="pt-6">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderTypeBadge({ type }: { type: 'llm' | 'embedding' | 'search' }) {
  if (type === 'llm') {
    return <Badge variant="default">LLM</Badge>;
  }
  if (type === 'embedding') {
    return <Badge variant="secondary">Embedding</Badge>;
  }
  return (
    <Badge variant="outline" className="border-orange-500 text-orange-600">
      Search
    </Badge>
  );
}

function LogRow({ log }: { log: LlmUsageLog }) {
  const type = getProviderType(log.provider);
  const dateFormatted = format(new Date(log.created_at), 'd MMM HH:mm:ss', { locale: es });

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="text-sm whitespace-nowrap">{dateFormatted}</TableCell>
      <TableCell>{log.provider}</TableCell>
      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
        {log.model}
      </TableCell>
      <TableCell>
        <ProviderTypeBadge type={type} />
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {formatTokens(log.input_tokens)} / {formatTokens(log.output_tokens)}
      </TableCell>
      <TableCell className="text-right font-mono">{formatCurrency(log.total_cost_usd)}</TableCell>
      <TableCell className="text-right">
        {log.latency_ms ? `${log.latency_ms}ms` : '-'}
      </TableCell>
      <TableCell className="text-center">
        {log.success ? (
          <Check className="w-4 h-4 text-green-500 mx-auto" />
        ) : (
          <Tooltip>
            <TooltipTrigger>
              <X className="w-4 h-4 text-destructive mx-auto" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{log.error_message || 'Error desconocido'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}
