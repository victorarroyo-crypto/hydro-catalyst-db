import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  cost_per_1m_tokens: number;
  recommended: boolean;
}

export interface LLMProviderData {
  name: string;
  models: LLMModel[];
}

export type LLMModelsResponse = Record<string, LLMProviderData>;

// Proxy helper - calls to Railway backend via study-proxy
async function fetchLLMModelsFromRailway(): Promise<LLMModelsResponse> {
  const { data, error } = await supabase.functions.invoke('study-proxy', {
    body: { endpoint: '/api/llm/models', method: 'GET' },
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
    queryFn: fetchLLMModelsFromRailway,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
