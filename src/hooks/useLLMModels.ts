import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Nueva interfaz basada en respuesta de Railway /api/models
export interface LLMModel {
  key: string;           // Value para el selector (ej: "claude-sonnet")
  name: string;          // Display name (ej: "Claude Sonnet 4.5")
  cost_per_query: number; // Costo por consulta (ej: 0.031)
  is_default: boolean;   // Si es el modelo por defecto
  is_recommended: boolean; // Si es recomendado
}

export interface LLMModelsResponse {
  models: LLMModel[];
}

const FREE_TIER_THRESHOLD = 0.01;

async function fetchLLMModels(): Promise<LLMModelsResponse> {
  const { data, error } = await supabase.functions.invoke('study-proxy', {
    body: { endpoint: '/api/models', method: 'GET' },
  });

  if (error) throw new Error(error.message);

  if (!data?.success) {
    throw new Error(data?.error || 'Error fetching LLM models');
  }

  return data.data as LLMModelsResponse;
}

export function useLLMModels() {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Helper functions
export function getDefaultModel(models: LLMModel[]): LLMModel | undefined {
  return models.find(m => m.is_default) || models[0];
}

export function isFreeModel(model: LLMModel): boolean {
  return model.cost_per_query < FREE_TIER_THRESHOLD;
}

export function formatModelCost(cost: number): string {
  return `$${cost.toFixed(3)}/query`;
}
