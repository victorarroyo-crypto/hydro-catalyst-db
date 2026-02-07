import { useState, useEffect, useMemo } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { format, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export interface LlmUsageLog {
  id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
  usage_type: string;
  operation: string | null;
  agent_name: string | null;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CostSummary {
  totalCost: number;
  totalCalls: number;
  llmCost: number;
  llmCalls: number;
  llmTokens: number;
  embeddingCost: number;
  embeddingCalls: number;
  embeddingTokens: number;
  searchCost: number;
  searchCalls: number;
}

export interface DailyChartData {
  date: string;
  dateFormatted: string;
  llm: number;
  embedding: number;
  search: number;
  total: number;
}

export interface ProviderBreakdown {
  provider: string;
  model: string;
  usageType: string;
  calls: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  errors: number;
}

export function useLlmCosts(startDate: string, endDate: string) {
  const [logs, setLogs] = useState<LlmUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreData, setHasMoreData] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await externalSupabase
          .from('llm_usage_logs')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(5000);

        if (fetchError) throw fetchError;

        setLogs(data || []);
        setHasMoreData((data?.length || 0) >= 5000);
      } catch (err: any) {
        console.error('Error fetching LLM usage logs:', err);
        setError(err.message);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchLogs();
    }
  }, [startDate, endDate]);

  const summary = useMemo<CostSummary>(() => {
    const result: CostSummary = {
      totalCost: 0,
      totalCalls: 0,
      llmCost: 0,
      llmCalls: 0,
      llmTokens: 0,
      embeddingCost: 0,
      embeddingCalls: 0,
      embeddingTokens: 0,
      searchCost: 0,
      searchCalls: 0,
    };

    logs.forEach((log) => {
      const cost = Number(log.total_cost_usd) || 0;
      const tokens = log.total_tokens || 0;
      
      result.totalCost += cost;
      result.totalCalls += 1;

      if (log.usage_type === 'agent' || log.usage_type === 'chat') {
        result.llmCost += cost;
        result.llmCalls += 1;
        result.llmTokens += tokens;
      } else if (log.usage_type === 'embedding') {
        result.embeddingCost += cost;
        result.embeddingCalls += 1;
        result.embeddingTokens += tokens;
      } else if (log.usage_type === 'other') {
        result.searchCost += cost;
        result.searchCalls += 1;
      }
    });

    return result;
  }, [logs]);

  const chartData = useMemo<DailyChartData[]>(() => {
    if (!startDate || !endDate) return [];

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = eachDayOfInterval({ start, end });

      const dailyTotals = new Map<string, { llm: number; embedding: number; search: number }>();
      
      days.forEach((day) => {
        const key = format(day, 'yyyy-MM-dd');
        dailyTotals.set(key, { llm: 0, embedding: 0, search: 0 });
      });

      logs.forEach((log) => {
        const dayKey = format(parseISO(log.created_at), 'yyyy-MM-dd');
        const existing = dailyTotals.get(dayKey);
        if (existing) {
          const cost = Number(log.total_cost_usd) || 0;
          if (log.usage_type === 'agent' || log.usage_type === 'chat') {
            existing.llm += cost;
          } else if (log.usage_type === 'embedding') {
            existing.embedding += cost;
          } else if (log.usage_type === 'other') {
            existing.search += cost;
          }
        }
      });

      return days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const totals = dailyTotals.get(key) || { llm: 0, embedding: 0, search: 0 };
        return {
          date: key,
          dateFormatted: format(day, 'd MMM', { locale: es }),
          llm: totals.llm,
          embedding: totals.embedding,
          search: totals.search,
          total: totals.llm + totals.embedding + totals.search,
        };
      });
    } catch {
      return [];
    }
  }, [logs, startDate, endDate]);

  const providerBreakdown = useMemo<ProviderBreakdown[]>(() => {
    const groups = new Map<string, {
      provider: string;
      model: string;
      usageType: string;
      calls: number;
      tokens: number;
      cost: number;
      totalLatency: number;
      latencyCount: number;
      errors: number;
    }>();

    logs.forEach((log) => {
      const key = `${log.provider}|${log.model}`;
      const existing = groups.get(key);
      
      if (existing) {
        existing.calls += 1;
        existing.tokens += log.total_tokens || 0;
        existing.cost += Number(log.total_cost_usd) || 0;
        if (log.latency_ms) {
          existing.totalLatency += log.latency_ms;
          existing.latencyCount += 1;
        }
        if (!log.success) {
          existing.errors += 1;
        }
      } else {
        groups.set(key, {
          provider: log.provider,
          model: log.model,
          usageType: log.usage_type,
          calls: 1,
          tokens: log.total_tokens || 0,
          cost: Number(log.total_cost_usd) || 0,
          totalLatency: log.latency_ms || 0,
          latencyCount: log.latency_ms ? 1 : 0,
          errors: log.success ? 0 : 1,
        });
      }
    });

    return Array.from(groups.values())
      .map((g) => ({
        provider: g.provider,
        model: g.model,
        usageType: g.usageType,
        calls: g.calls,
        tokens: g.tokens,
        cost: g.cost,
        avgLatency: g.latencyCount > 0 ? Math.round(g.totalLatency / g.latencyCount) : 0,
        errors: g.errors,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [logs]);

  const recentLogs = useMemo(() => logs.slice(0, 50), [logs]);

  return {
    logs,
    summary,
    chartData,
    providerBreakdown,
    recentLogs,
    isLoading,
    error,
    hasMoreData,
  };
}

export function getProviderType(provider: string): 'llm' | 'embedding' | 'search' {
  const embeddingProviders = ['voyage', 'cohere'];
  const searchProviders = ['brave', 'tavily'];
  
  if (embeddingProviders.includes(provider.toLowerCase())) return 'embedding';
  if (searchProviders.includes(provider.toLowerCase())) return 'search';
  return 'llm';
}

export function formatCurrency(value: number, decimals = 4): string {
  return `$${value.toFixed(decimals)}`;
}

export function formatTokens(value: number): string {
  return value.toLocaleString('es-ES');
}

export function exportToCsv(logs: LlmUsageLog[], startDate: string, endDate: string): void {
  const headers = [
    'fecha',
    'provider',
    'model',
    'tipo',
    'input_tokens',
    'output_tokens',
    'coste_usd',
    'latencia_ms',
    'estado',
    'operacion',
  ];

  const rows = logs.map((log) => [
    format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    log.provider,
    log.model,
    log.usage_type,
    log.input_tokens,
    log.output_tokens,
    log.total_cost_usd,
    log.latency_ms || '',
    log.success ? 'ok' : 'error',
    log.operation || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `api-costs-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
