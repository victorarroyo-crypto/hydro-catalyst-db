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
 * Includes extended timeout for requests with attachments.
 */
export async function streamAdvisorProxy(
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<Response> {
  // Create a timeout controller for extended streaming operations (match server-side: 5 min)
  const timeoutMs = 300000; // 5 minutes - Railway deep mode can be very slow
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[advisorProxy] Streaming timeout reached');
    timeoutController.abort();
  }, timeoutMs);
  
  // Combine external signal with timeout
  const combinedSignal = signal || timeoutController.signal;
  
  try {
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
        signal: combinedSignal,
      }
    );

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      // Return a synthetic timeout response
      return new Response(JSON.stringify({
        error: 'Request Timeout',
        message: 'La solicitud tardó demasiado. Por favor, intenta de nuevo.',
        code: 'CLIENT_TIMEOUT'
      }), {
        status: 408,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

/**
 * Check if the proxy/Railway backend is available
 */
export async function checkProxyHealth(): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/advisor/models',
          method: 'GET',
        }),
      }
    );
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { ok: true, latency };
    }
    
    const data = await response.json().catch(() => ({}));
    return { ok: false, latency, error: data.message || `HTTP ${response.status}` };
  } catch (error) {
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Get the base URL for the advisor proxy (for direct fetch if needed)
 */
export function getAdvisorProxyUrl(): string {
  return `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`;
}
