import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Brain,
  Sparkles,
  Library,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { estimateCostFromTotal, formatCost, getModelPricing } from '@/lib/aiModelPricing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens: number;
  avg_response_time: number;
  avg_tokens_per_request: number;
}

interface ModelStats {
  model: string;
  fullModel: string;
  requests: number;
  tokens: number;
  avg_time: number;
  success_rate: number;
  estimated_cost: number;
}

interface ActionStats {
  action_type: string;
  requests: number;
  tokens: number;
  avg_time: number;
}

interface DailyStats {
  date: string;
  requests: number;
  tokens: number;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  classification: { label: 'Clasificación', icon: Brain, color: '#8b5cf6' },
  search: { label: 'Búsqueda', icon: Sparkles, color: '#3b82f6' },
  knowledge_base: { label: 'Base de Conocimiento', icon: Library, color: '#10b981' },
};

const MODEL_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'
];

const AIUsageDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7');

  const startDate = startOfDay(subDays(new Date(), parseInt(timeRange)));
  const endDate = endOfDay(new Date());

  // Fetch usage logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['ai-usage-logs', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate overall stats
  const overallStats: UsageStats = React.useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        total_tokens: 0,
        avg_response_time: 0,
        avg_tokens_per_request: 0,
      };
    }

    const successful = logs.filter(l => l.success);
    const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const totalTime = logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0);

    return {
      total_requests: logs.length,
      successful_requests: successful.length,
      failed_requests: logs.length - successful.length,
      total_tokens: totalTokens,
      avg_response_time: Math.round(totalTime / logs.length),
      avg_tokens_per_request: Math.round(totalTokens / logs.length),
    };
  }, [logs]);

  // Stats by model
  const modelStats: ModelStats[] = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const byModel = logs.reduce((acc, log) => {
      const model = log.model || 'unknown';
      if (!acc[model]) {
        acc[model] = { requests: 0, tokens: 0, time: 0, success: 0 };
      }
      acc[model].requests++;
      acc[model].tokens += log.total_tokens || 0;
      acc[model].time += log.response_time_ms || 0;
      if (log.success) acc[model].success++;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; time: number; success: number }>);

    return Object.entries(byModel)
      .map(([model, data]) => ({
        model: model.replace('google/', '').replace('openai/', ''),
        fullModel: model,
        requests: data.requests,
        tokens: data.tokens,
        avg_time: Math.round(data.time / data.requests),
        success_rate: Math.round((data.success / data.requests) * 100),
        estimated_cost: estimateCostFromTotal(model, data.tokens),
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [logs]);

  // Calculate total estimated cost
  const totalEstimatedCost = React.useMemo(() => {
    if (!logs || logs.length === 0) return 0;
    return logs.reduce((sum, log) => {
      return sum + estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
    }, 0);
  }, [logs]);

  // Stats by action type
  const actionStats: ActionStats[] = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const byAction = logs.reduce((acc, log) => {
      const action = log.action_type || 'unknown';
      if (!acc[action]) {
        acc[action] = { requests: 0, tokens: 0, time: 0 };
      }
      acc[action].requests++;
      acc[action].tokens += log.total_tokens || 0;
      acc[action].time += log.response_time_ms || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; time: number }>);

    return Object.entries(byAction)
      .map(([action_type, data]) => ({
        action_type,
        requests: data.requests,
        tokens: data.tokens,
        avg_time: Math.round(data.time / data.requests),
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [logs]);

  // Daily stats for chart
  const dailyStats: DailyStats[] = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const byDay = logs.reduce((acc, log) => {
      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { requests: 0, tokens: 0 };
      }
      acc[date].requests++;
      acc[date].tokens += log.total_tokens || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number }>);

    return Object.entries(byDay)
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd MMM', { locale: es }),
        requests: data.requests,
        tokens: data.tokens,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs]);

  // Recent logs
  const recentLogs = logs?.slice(0, 10) || [];

  const successRate = overallStats.total_requests > 0 
    ? Math.round((overallStats.successful_requests / overallStats.total_requests) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Dashboard de Uso de IA
          </h1>
          <p className="text-muted-foreground">
            Estadísticas de uso de los modelos de inteligencia artificial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último día</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Peticiones</p>
                <p className="text-3xl font-bold">{overallStats.total_requests.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens Consumidos</p>
                <p className="text-3xl font-bold">{overallStats.total_tokens.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coste Estimado</p>
                <p className="text-3xl font-bold text-green-600">{formatCost(totalEstimatedCost)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                <p className="text-3xl font-bold">{overallStats.avg_response_time.toLocaleString()}ms</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                <p className="text-3xl font-bold">{successRate}%</p>
              </div>
              <div className={`p-3 rounded-lg ${successRate >= 95 ? 'bg-green-500/10' : successRate >= 80 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                {successRate >= 95 ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : successRate >= 80 ? (
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
            </div>
            <Progress value={successRate} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Cost Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        * Costes estimados basados en precios públicos de Google y OpenAI. El coste real puede variar.
      </p>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Uso Diario
            </CardTitle>
            <CardDescription>Peticiones y tokens por día</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="requests"
                    name="Peticiones"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    name="Tokens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by Action Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Por Tipo de Acción
            </CardTitle>
            <CardDescription>Distribución de peticiones por funcionalidad</CardDescription>
          </CardHeader>
          <CardContent>
            {actionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={actionStats.map((a, i) => ({
                      ...a,
                      name: ACTION_LABELS[a.action_type]?.label || a.action_type,
                      fill: ACTION_LABELS[a.action_type]?.color || MODEL_COLORS[i],
                    }))}
                    dataKey="requests"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {actionStats.map((_, i) => (
                      <Cell key={i} fill={Object.values(ACTION_LABELS)[i]?.color || MODEL_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats by Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Uso por Modelo
          </CardTitle>
          <CardDescription>Estadísticas detalladas de cada modelo de IA</CardDescription>
        </CardHeader>
        <CardContent>
          {modelStats.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={modelStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="model" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="requests" name="Peticiones" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Peticiones</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Coste Est.</TableHead>
                    <TableHead className="text-right">Tiempo Promedio</TableHead>
                    <TableHead className="text-right">Tasa de Éxito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelStats.map((stat) => (
                    <TableRow key={stat.model}>
                      <TableCell className="font-medium">{stat.model}</TableCell>
                      <TableCell className="text-right">{stat.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{stat.tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCost(stat.estimated_cost)}
                      </TableCell>
                      <TableCell className="text-right">{stat.avg_time.toLocaleString()}ms</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={stat.success_rate >= 95 ? 'default' : stat.success_rate >= 80 ? 'secondary' : 'destructive'}>
                          {stat.success_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No hay datos de modelos para mostrar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Últimas Peticiones
          </CardTitle>
          <CardDescription>Las 10 peticiones más recientes</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Coste Est.</TableHead>
                  <TableHead className="text-right">Tiempo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action_type];
                  const ActionIcon = actionInfo?.icon || Activity;
                  const logCost = estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4" style={{ color: actionInfo?.color }} />
                          <span>{actionInfo?.label || log.action_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {(log.model || '').replace('google/', '').replace('openai/', '')}
                      </TableCell>
                      <TableCell className="text-right">{(log.total_tokens || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCost(logCost)}
                      </TableCell>
                      <TableCell className="text-right">{(log.response_time_ms || 0).toLocaleString()}ms</TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No hay peticiones registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIUsageDashboard;
