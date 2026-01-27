import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ProxyRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT';
  payload?: unknown;
  queryParams?: Record<string, string | number | boolean | undefined>;
}

interface ProxyResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Call the advisor-railway-proxy edge function to communicate with Railway backend.
 * This bypasses CORS issues by routing through Supabase Edge Functions.
 */
export async function callAdvisorProxy<T = unknown>(
  options: ProxyRequestOptions
): Promise<ProxyResponse<T>> {
  const { endpoint, method = 'POST', payload, queryParams } = options;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method,
          payload,
          query_params: queryParams,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || data.message || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: data as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error('[advisorProxy] Network error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Stream SSE from the advisor-railway-proxy edge function.
 * Returns a ReadableStream for processing SSE events.
 */
export async function streamAdvisorProxy(
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<Response> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        endpoint,
        method: 'POST',
        payload,
      }),
      signal,
    }
  );

  return response;
}

/**
 * Get the base URL for the advisor proxy (for direct fetch if needed)
 */
export function getAdvisorProxyUrl(): string {
  return `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`;
}
