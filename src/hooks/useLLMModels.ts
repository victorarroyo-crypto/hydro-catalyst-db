import { useQuery } from '@tanstack/react-query';

const RAILWAY_API_URL = 'https://watertech-scouting-production.up.railway.app';

export interface LLMModel {
  key: string;
  name: string;
  cost_per_query: number;
  is_default?: boolean;
  is_recommended?: boolean;
  is_free?: boolean;
}

export interface LLMModelsResponse {
  models: LLMModel[];
  default: string;
  free_models: string[];
}

async function fetchLLMModels(): Promise<LLMModelsResponse> {
  const response = await fetch(`${RAILWAY_API_URL}/api/advisor/models`);
  
  if (!response.ok) {
    throw new Error('Error fetching LLM models');
  }
  
  return response.json();
}

export function useLLMModels() {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLLMModels,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Helper functions - accepts both LLMModelsResponse or LLMModel[]
export function getDefaultModel(data: LLMModelsResponse | LLMModel[]): LLMModel | undefined {
  // If it's an array, use the old logic
  if (Array.isArray(data)) {
    return data.find(m => m.is_default) || data[0];
  }
  
  // If it's the full response, use the default key
  if (data.default) {
    const defaultModel = data.models.find(m => m.key === data.default);
    if (defaultModel) return defaultModel;
  }
  
  // Fallback to is_default flag
  return data.models.find(m => m.is_default) || data.models[0];
}

export function isFreeModel(model: LLMModel): boolean {
  return model.is_free === true;
}

export function formatModelCost(cost: number): string {
  return `$${cost.toFixed(3)}/query`;
}
