import { useQuery } from '@tanstack/react-query';

const RAILWAY_API_URL = 'https://watertech-scouting-production.up.railway.app';

// Map deprecated models to valid equivalents
const MODEL_MIGRATION_MAP: Record<string, string> = {
  'claude-3-7-sonnet-20250219': 'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
  'gpt-4o': 'gpt-4.1',
  'gpt-4o-mini': 'gpt-4.1-mini',
};

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

// Migrate deprecated model keys to valid ones
function migrateModelKey(key: string): string {
  return MODEL_MIGRATION_MAP[key] || key;
}

async function fetchLLMModels(): Promise<LLMModelsResponse> {
  const response = await fetch(`${RAILWAY_API_URL}/api/advisor/models`);
  
  if (!response.ok) {
    throw new Error('Error fetching LLM models');
  }
  
  const data: LLMModelsResponse = await response.json();
  
  // Migrate any deprecated model keys in the response
  const migratedModels = data.models.map(model => ({
    ...model,
    key: migrateModelKey(model.key),
  }));
  
  // Migrate the default model key
  const migratedDefault = migrateModelKey(data.default);
  
  // Migrate free models list
  const migratedFreeModels = data.free_models?.map(migrateModelKey) || [];
  
  return {
    models: migratedModels,
    default: migratedDefault,
    free_models: migratedFreeModels,
  };
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
  
  // If it's the full response, use the default key (already migrated)
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

// Export migration function for use in other components
export function getValidModelKey(key: string): string {
  return migrateModelKey(key);
}
