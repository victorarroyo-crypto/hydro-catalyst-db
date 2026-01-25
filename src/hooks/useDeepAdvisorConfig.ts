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
  user_id: string;
}

async function fetchDeepAdvisorConfig(userId?: string): Promise<DeepAdvisorConfigResponse> {
  const url = userId 
    ? `${API_URL}/api/advisor/deep/config?user_id=${userId}`
    : `${API_URL}/api/advisor/deep/config`;
  const response = await fetch(url);
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

export function useDeepAdvisorConfig(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deep-advisor-config', userId],
    queryFn: () => fetchDeepAdvisorConfig(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: updateDeepAdvisorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deep-advisor-config', userId] });
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

// Helper function to validate a model against phase options
function getValidModel(
  savedModel: string | undefined,
  phaseConfig: PhaseConfig | undefined
): string {
  if (!phaseConfig) return '';
  
  const validKeys = phaseConfig.options.map(o => o.key);
  
  // If saved model is valid, use it
  if (savedModel && validKeys.includes(savedModel)) {
    return savedModel;
  }
  
  // Otherwise use backend default
  return phaseConfig.default;
}

// Get validated config with all models verified against backend options
export function getValidatedConfig(config: DeepAdvisorConfigResponse | undefined, userId?: string): Omit<DeepAdvisorConfigUpdate, 'user_id'> | null {
  if (!config) return null;
  
  return {
    search_model: getValidModel(config.current?.search_model, config.phases.search),
    analysis_model: getValidModel(config.current?.analysis_model, config.phases.analysis),
    synthesis_model: getValidModel(config.current?.synthesis_model, config.phases.synthesis),
    enable_web_search: config.current?.enable_web_search ?? true,
    enable_rag: config.current?.enable_rag ?? true,
  };
}

// Check if any configured model is invalid
export function hasInvalidModels(config: DeepAdvisorConfigResponse | undefined): boolean {
  if (!config?.phases || !config?.current) return false;
  
  const searchValid = config.phases.search?.options?.some(o => o.key === config.current.search_model) ?? true;
  const analysisValid = config.phases.analysis?.options?.some(o => o.key === config.current.analysis_model) ?? true;
  const synthesisValid = config.phases.synthesis?.options?.some(o => o.key === config.current.synthesis_model) ?? true;
  
  return !searchValid || !analysisValid || !synthesisValid;
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
