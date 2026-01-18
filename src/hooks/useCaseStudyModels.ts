import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

export interface CaseStudyModel {
  key: string;
  name: string;
  description: string;
  provider: string;
  cost_per_query: number;
  is_default: boolean;
  is_recommended: boolean;
}

interface CaseStudyModelsResponse {
  models: CaseStudyModel[];
  default_key: string;
  note?: string;
}

// Fallback models in case the API fails
const FALLBACK_MODELS: CaseStudyModel[] = [
  {
    key: 'claude-sonnet',
    name: 'Claude Sonnet 4.5',
    description: 'Modelo balanceado - recomendado',
    provider: 'anthropic',
    cost_per_query: 0.031,
    is_default: true,
    is_recommended: true,
  },
  {
    key: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    description: 'Rápido y económico',
    provider: 'anthropic',
    cost_per_query: 0.010,
    is_default: false,
    is_recommended: false,
  },
  {
    key: 'deepseek',
    name: 'DeepSeek V3.2',
    description: 'Muy económico, buen rendimiento',
    provider: 'deepseek',
    cost_per_query: 0.002,
    is_default: false,
    is_recommended: true,
  },
];

async function fetchCaseStudyModels(): Promise<CaseStudyModelsResponse> {
  try {
    // Use Edge Function as proxy to avoid CORS issues
    const { data, error } = await externalSupabase.functions.invoke('get-case-study-models');

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    console.log('[useCaseStudyModels] Received models from Railway:', data?.models?.length || 0);
    
    // Normalize API response to match our interface
    const normalizedModels: CaseStudyModel[] = (data.models || []).map((model: any) => ({
      key: model.key,
      name: model.name,
      description: model.description || '',
      provider: model.provider,
      // Handle both cost_per_query and cost_per_1k_tokens
      cost_per_query: model.cost_per_query ?? (model.cost_per_1k_tokens ? model.cost_per_1k_tokens * 10 : 0.01),
      is_default: model.is_default === true || model.key === (data.default_key || data.default),
      is_recommended: model.is_recommended === true || model.recommended === true,
    }));

    return {
      models: normalizedModels.length > 0 ? normalizedModels : FALLBACK_MODELS,
      default_key: data.default_key || data.default || 'claude-sonnet',
      note: data.note,
    };
  } catch (error) {
    console.warn('[useCaseStudyModels] Failed to fetch models, using fallback:', error);
    return {
      models: FALLBACK_MODELS,
      default_key: 'claude-sonnet',
    };
  }
}

export function useCaseStudyModels() {
  return useQuery({
    queryKey: ['case-study-models'],
    queryFn: fetchCaseStudyModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    // Return fallback on error
    placeholderData: {
      models: FALLBACK_MODELS,
      default_key: 'claude-sonnet',
    },
  });
}

export function getDefaultModel(): string {
  return 'claude-sonnet';
}
