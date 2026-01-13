import { useQuery } from '@tanstack/react-query';

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

const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL || '';

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
  if (!RAILWAY_URL) {
    console.warn('VITE_RAILWAY_URL not configured, using fallback models');
    return {
      models: FALLBACK_MODELS,
      default_key: 'claude-sonnet',
    };
  }

  const response = await fetch(`${RAILWAY_URL}/api/case-study/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching models: ${response.status}`);
  }

  return response.json();
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
