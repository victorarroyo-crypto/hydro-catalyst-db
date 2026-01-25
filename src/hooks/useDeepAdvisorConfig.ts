import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

export interface ModelOption {
  key: string;
  name: string;
  cost_indicator: '$' | '$$' | '$$$';
}

export interface PhaseConfig {
  label: string;
  description: string;
  options: ModelOption[];
  default: string;
}

export interface DeepAdvisorConfigResponse {
  phases: {
    search: PhaseConfig;
    analysis: PhaseConfig;
    synthesis: PhaseConfig;
  };
  toggles: {
    enable_web_search: boolean;
    enable_rag: boolean;
  };
  current: {
    search_model: string;
    analysis_model: string;
    synthesis_model: string;
    enable_web_search: boolean;
    enable_rag: boolean;
  };
}

export interface DeepAdvisorConfigUpdate {
  search_model: string;
  analysis_model: string;
  synthesis_model: string;
  enable_web_search: boolean;
  enable_rag: boolean;
}

async function fetchDeepAdvisorConfig(): Promise<DeepAdvisorConfigResponse> {
  const response = await fetch(`${API_URL}/api/advisor/deep/config`);
  if (!response.ok) {
    throw new Error('Error al cargar configuración');
  }
  return response.json();
}

async function updateDeepAdvisorConfig(config: DeepAdvisorConfigUpdate): Promise<void> {
  const response = await fetch(`${API_URL}/api/advisor/deep/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error al guardar' }));
    throw new Error(error.detail || 'Error al guardar configuración');
  }
}

export function useDeepAdvisorConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deep-advisor-config'],
    queryFn: fetchDeepAdvisorConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const mutation = useMutation({
    mutationFn: updateDeepAdvisorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deep-advisor-config'] });
      toast.success('Configuración guardada correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    saveConfig: mutation.mutate,
    isSaving: mutation.isPending,
  };
}

export function getCostLevel(config: DeepAdvisorConfigResponse | undefined, selectedModels: {
  search_model: string;
  analysis_model: string;
  synthesis_model: string;
}): { level: '$' | '$$' | '$$$'; label: string } {
  if (!config) return { level: '$', label: 'Económico' };

  // El modelo de síntesis es el que más influye en el coste
  const synthesisOption = config.phases.synthesis.options.find(
    o => o.key === selectedModels.synthesis_model
  );
  const analysisOption = config.phases.analysis.options.find(
    o => o.key === selectedModels.analysis_model
  );

  const synthesisLevel = synthesisOption?.cost_indicator || '$';
  const analysisLevel = analysisOption?.cost_indicator || '$';

  // Calcular nivel combinado (síntesis pesa más)
  const levels = { '$': 1, '$$': 2, '$$$': 3 };
  const avgLevel = (levels[synthesisLevel] * 2 + levels[analysisLevel]) / 3;

  if (avgLevel <= 1.3) return { level: '$', label: 'Económico' };
  if (avgLevel <= 2.3) return { level: '$$', label: 'Balanceado' };
  return { level: '$$$', label: 'Premium' };
}
