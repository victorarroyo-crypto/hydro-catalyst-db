import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { 
  DollarSign, 
  Zap, 
  TrendingUp,
  Building2,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
} from 'recharts';
import { estimateCostFromTotal, formatCost } from '@/lib/aiModelPricing';

interface LLMLog {
  id: string;
  created_at: string;
  action_type: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  response_time_ms: number | null;
  success: boolean | null;
  error_message: string | null;
  user_id: string | null;
}

interface ProjectUsage {
  project_id: string;
  project_name: string;
  total_tokens: number;
  total_cost: number;
  last_usage: string;
  request_count: number;
}

interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#d97757',
  openai: '#10a37f',
  google: '#4285f4',
  groq: '#f55036',
  default: '#8b5cf6',
};

const getProvider = (model: string): string => {
  if (model.includes('claude') || model.includes('anthropic')) return 'anthropic';
  if (model.includes('gpt') || model.includes('openai')) return 'openai';
  if (model.includes('gemini') || model.includes('google')) return 'google';
  if (model.includes('llama') || model.includes('groq')) return 'groq';
  return 'other';
};

const AdminLLMCosts: React.FC = () => {
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Fetch all LLM usage logs for this month
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['llm-costs-logs'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', monthStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data as LLMLog[];
    },
  });

  // Get unique models and providers
  const { models, providers } = useMemo(() => {
    if (!logs) return { models: [], providers: [] };
    const modelSet = new Set<string>();
    const providerSet = new Set<string>();
    logs.forEach(log => {
      if (log.model) {
        modelSet.add(log.model);
        providerSet.add(getProvider(log.model));
      }
    });
    return {
      models: Array.from(modelSet).sort(),
      providers: Array.from(providerSet).sort(),
    };
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      if (providerFilter !== 'all' && getProvider(log.model) !== providerFilter) return false;
      if (modelFilter !== 'all' && log.model !== modelFilter) return false;
      return true;
    });
  }, [logs, providerFilter, modelFilter]);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    if (!filteredLogs.length) {
      return { totalCost: 0, totalTokens: 0, avgPerProject: 0, topProject: null as string | null };
    }

    let totalCost = 0;
    let totalTokens = 0;
    const projectCosts = new Map<string, number>();

    filteredLogs.forEach(log => {
      const cost = estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
      totalCost += cost;
      totalTokens += log.total_tokens || 0;

      // Group by action_type as proxy for project (or use actual project if available)
      const projectKey = log.action_type || 'unknown';
      projectCosts.set(projectKey, (projectCosts.get(projectKey) || 0) + cost);
    });

    const projectCount = projectCosts.size || 1;
    const avgPerProject = totalCost / projectCount;

    let topProject: string | null = null;
    let maxCost = 0;
    projectCosts.forEach((cost, project) => {
      if (cost > maxCost) {
        maxCost = cost;
        topProject = project;
      }
    });

    return { totalCost, totalTokens, avgPerProject, topProject };
  }, [filteredLogs]);

  // Calculate daily costs for chart (last 30 days)
  const dailyCosts: DailyCost[] = useMemo(() => {
    if (!filteredLogs.length) return [];

    const dailyMap = new Map<string, { cost: number; tokens: number; requests: number }>();

    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap.set(date, { cost: 0, tokens: 0, requests: 0 });
    }

    filteredLogs.forEach(log => {
      const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date);
      if (existing) {
        const cost = estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
        existing.cost += cost;
        existing.tokens += log.total_tokens || 0;
        existing.requests++;
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: es }),
        ...data,
      }))
      .reverse();
  }, [filteredLogs]);

  // Calculate usage by project/action
  const projectUsage: ProjectUsage[] = useMemo(() => {
    if (!filteredLogs.length) return [];

    const projectMap = new Map<string, { tokens: number; cost: number; lastUsage: string; requests: number }>();

    filteredLogs.forEach(log => {
      const projectKey = log.action_type || 'unknown';
      const existing = projectMap.get(projectKey) || { tokens: 0, cost: 0, lastUsage: log.created_at, requests: 0 };
      
      existing.tokens += log.total_tokens || 0;
      existing.cost += estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
      existing.requests++;
      if (log.created_at > existing.lastUsage) {
        existing.lastUsage = log.created_at;
      }
      
      projectMap.set(projectKey, existing);
    });

    return Array.from(projectMap.entries())
      .map(([key, data]) => ({
        project_id: key,
        project_name: key,
        total_tokens: data.tokens,
        total_cost: data.cost,
        last_usage: data.lastUsage,
        request_count: data.requests,
      }))
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [filteredLogs]);

  // Recent logs (last 100)
  const recentLogs = filteredLogs.slice(0, 100);

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Costos LLM</h1>
            <p className="text-muted-foreground">
              Monitoreo de uso y costos de modelos de lenguaje
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gastado (Este Mes)</p>
                <p className="text-3xl font-bold text-green-600">{formatCost(monthlySummary.totalCost)}</p>
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
                <p className="text-sm text-muted-foreground">Total Tokens (Este Mes)</p>
                <p className="text-3xl font-bold">{monthlySummary.totalTokens.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Promedio por Proyecto</p>
                <p className="text-3xl font-bold">{formatCost(monthlySummary.avgPerProject)}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Proyecto Más Costoso</p>
                <p className="text-xl font-bold truncate max-w-[150px]">
                  {monthlySummary.topProject || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(providerFilter !== 'all' || modelFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setProviderFilter('all');
                  setModelFilter('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Costos Diarios (Últimos 30 días)
          </CardTitle>
          <CardDescription>Evolución del gasto en LLM</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyCosts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis 
                  className="text-xs" 
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'cost') return [`$${value.toFixed(4)}`, 'Costo'];
                    return [value.toLocaleString(), name];
                  }}
                />
                <Bar 
                  dataKey="cost" 
                  name="cost"
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No hay datos para mostrar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage by Project Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Uso por Proyecto/Acción
          </CardTitle>
          <CardDescription>Desglose de tokens y costos por funcionalidad</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto/Acción</TableHead>
                <TableHead className="text-right">Peticiones</TableHead>
                <TableHead className="text-right">Total Tokens</TableHead>
                <TableHead className="text-right">Costo (USD)</TableHead>
                <TableHead className="text-right">Último Uso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectUsage.length > 0 ? (
                projectUsage.map((project) => (
                  <TableRow key={project.project_id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{project.project_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{project.request_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{project.total_tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCost(project.total_cost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(parseISO(project.last_usage), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay datos para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Logs Detallados
          </CardTitle>
          <CardDescription>Últimas 100 llamadas LLM</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => {
                  const provider = getProvider(log.model);
                  const cost = estimateCostFromTotal(log.model || 'unknown', log.total_tokens || 0);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(log.created_at), 'dd/MM HH:mm:ss', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: `${PROVIDER_COLORS[provider] || PROVIDER_COLORS.default}20`,
                              color: PROVIDER_COLORS[provider] || PROVIDER_COLORS.default,
                              borderColor: PROVIDER_COLORS[provider] || PROVIDER_COLORS.default,
                            }}
                            variant="outline"
                            className="text-xs"
                          >
                            {provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[150px] truncate">
                          {log.model?.replace('google/', '').replace('openai/', '').replace('anthropic/', '')}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {(log.input_tokens || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {(log.output_tokens || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-green-600">
                          {formatCost(cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.success ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">OK</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">ID:</span>
                                  <p className="font-mono text-xs">{log.id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">User ID:</span>
                                  <p className="font-mono text-xs">{log.user_id || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Tiempo respuesta:</span>
                                  <p>{log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total tokens:</span>
                                  <p>{(log.total_tokens || 0).toLocaleString()}</p>
                                </div>
                              </div>
                              {log.error_message && (
                                <div className="p-3 bg-destructive/10 rounded-md">
                                  <span className="text-destructive font-medium">Error:</span>
                                  <p className="text-sm text-destructive/80 mt-1">{log.error_message}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No hay logs para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        * Costes estimados basados en precios públicos. El coste real puede variar según acuerdos específicos con proveedores.
      </p>
    </div>
  );
};

export default AdminLLMCosts;
