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
  const timeoutMs = 300000; // 5 minutes - Railway deep mode can be very slow
  
  // Create a combined controller that handles both timeout and external abort
  const combinedController = new AbortController();
  let timeoutId: number | undefined;
  
  // Configure timeout - aborts with CLIENT_TIMEOUT reason
  timeoutId = window.setTimeout(() => {
    console.warn('[advisorProxy] Streaming timeout reached (5 min)');
    combinedController.abort(new DOMException('CLIENT_TIMEOUT', 'AbortError'));
  }, timeoutMs);
  
  // Listen for external abort (user presses Stop or component unmounts)
  const handleExternalAbort = () => {
    clearTimeout(timeoutId);
    combinedController.abort(signal?.reason || new DOMException('User cancelled', 'AbortError'));
  };
  
  if (signal) {
    // Check if already aborted
    if (signal.aborted) {
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({
        error: 'Request cancelled',
        code: 'CANCELLED'
      }), { status: 499, headers: { 'Content-Type': 'application/json' } });
    }
    signal.addEventListener('abort', handleExternalAbort, { once: true });
  }
  
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
        signal: combinedController.signal,
      }
    );

    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleExternalAbort);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleExternalAbort);
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      const reason = error.message || 'Unknown';
      
      if (reason === 'CLIENT_TIMEOUT') {
        // Timeout - return synthetic response with clear message
        return new Response(JSON.stringify({
          error: 'Request Timeout',
          message: 'La solicitud tardó demasiado. Por favor, intenta de nuevo.',
          code: 'CLIENT_TIMEOUT'
        }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // User abort - propagate silently
      throw error;
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
