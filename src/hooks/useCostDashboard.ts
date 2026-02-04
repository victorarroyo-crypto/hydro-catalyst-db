import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';

interface DashboardSummary {
  total_spend: number;
  total_savings_identified: number;
  savings_pct: number;
  invoice_count: number;
  supplier_count: number;
  opportunities_count: number;
  quick_wins_count: number;
  duplicate_candidates: number;
  potential_duplicate_savings: number;
}

interface SpendByCategory {
  category: string;
  total_spend: number;
  invoice_count: number;
  pct_of_total: number;
  benchmark_position: 'excellent' | 'good' | 'average' | 'above_market';
}

interface SpendBySupplier {
  supplier_id: string;
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
  pct_of_total: number;
  risk_flags: {
    single_source: boolean;
    no_contract: boolean;
    high_concentration: boolean;
  };
}

interface TimelinePoint {
  period: string;
  total_spend: number;
  invoice_count: number;
}

interface DashboardData {
  summary: DashboardSummary;
  spend_by_category: SpendByCategory[];
  spend_by_supplier: SpendBySupplier[];
  timeline: TimelinePoint[];
}

interface UseCostDashboardOptions {
  projectId: string;
  enabled?: boolean;
}

export function useCostDashboard({ projectId, enabled = true }: UseCostDashboardOptions) {
  const queryClient = useQueryClient();

  // Dashboard completo
  const dashboardQuery = useQuery({
    queryKey: ['cost-dashboard', projectId],
    queryFn: async (): Promise<DashboardData> => {
      const response = await fetch(
        `${API_URL}/api/cost-consulting/projects/${projectId}/dashboard`
      );
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json();
    },
    enabled: enabled && !!projectId,
    refetchInterval: 60000, // Refetch cada minuto
  });

  // Detectar duplicados
  const detectDuplicatesMutation = useMutation({
    mutationFn: async (options?: { includeSemanticSearch?: boolean }) => {
      const params = new URLSearchParams();
      if (options?.includeSemanticSearch !== undefined) {
        params.set('include_semantic', String(options.includeSemanticSearch));
      }
      const response = await fetch(
        `${API_URL}/api/cost-consulting/projects/${projectId}/detect-duplicates?${params}`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to detect duplicates');
      return response.json();
    },
    onSuccess: () => {
      // Refetch dashboard para actualizar stats
      dashboardQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['duplicate-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-candidates', projectId] });
    },
  });

  // Resolver duplicado
  const resolveDuplicateMutation = useMutation({
    mutationFn: async ({
      candidateId,
      status,
      notes,
    }: {
      candidateId: string;
      status: 'confirmed_dup' | 'false_positive' | 'merged';
      notes?: string;
    }) => {
      const response = await fetch(
        `${API_URL}/api/cost-consulting/duplicates/${candidateId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes }),
        }
      );
      if (!response.ok) throw new Error('Failed to resolve duplicate');
      return response.json();
    },
    onSuccess: () => {
      dashboardQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['duplicate-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-candidates', projectId] });
    },
  });

  return {
    // Data
    dashboard: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,

    // Actions
    detectDuplicates: detectDuplicatesMutation.mutate,
    isDetecting: detectDuplicatesMutation.isPending,

    resolveDuplicate: resolveDuplicateMutation.mutate,
    isResolving: resolveDuplicateMutation.isPending,

    // Refetch
    refetch: dashboardQuery.refetch,
  };
}

export type { DashboardData, DashboardSummary, SpendByCategory, SpendBySupplier, TimelinePoint };
