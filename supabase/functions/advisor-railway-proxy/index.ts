import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

// Allowed Advisor endpoints (all /api/advisor/* paths)
const ALLOWED_ENDPOINT_PATTERNS = [
  /^\/api\/advisor\/models$/,
  /^\/api\/advisor\/deep\/config$/,
  /^\/api\/advisor\/chat$/,
  /^\/api\/advisor\/chat\/stream$/,
  /^\/api\/advisor\/deep\/chat$/,
  /^\/api\/advisor\/deep\/chat\/stream$/,
  /^\/api\/advisor\/service\/(comparador|checklist|ficha|presupuesto)$/,
  /^\/api\/advisor\/credits$/,
  /^\/api\/advisor\/history$/,
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT'];

// SSE endpoints that need streaming passthrough
const SSE_ENDPOINTS = [
  '/api/advisor/chat/stream',
  '/api/advisor/deep/chat/stream',
];

function isEndpointAllowed(endpoint: string): boolean {
  // Prevent path traversal
  if (endpoint.includes('..') || endpoint.includes('//')) return false;
  return ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(endpoint));
}

function isMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase());
}

function isSSEEndpoint(endpoint: string): boolean {
  return SSE_ENDPOINTS.some(sse => endpoint.startsWith(sse));
}

// Timeout configurations - Railway backend can take a long time for complex queries
// NOTE: We keep a shorter default for most endpoints, but allow longer waits for
// config/model endpoints which can be slow when the backend is cold-starting.
const DEFAULT_NON_STREAMING_TIMEOUT = 120000; // 120s for most normal requests (backend can cold-start)
const CONFIG_NON_STREAMING_TIMEOUT = 180000; // 180s for /models and /deep/config
const STREAMING_TIMEOUT = 300000; // 5 minutes for streaming (Railway deep mode is slow)

function getNonStreamingTimeoutMs(endpoint: string): number {
  // These endpoints are frequently called on page load and can be slow on backend cold-start.
  if (endpoint === '/api/advisor/models' || endpoint === '/api/advisor/deep/config') {
    return CONFIG_NON_STREAMING_TIMEOUT;
  }
  return DEFAULT_NON_STREAMING_TIMEOUT;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  console.log(`[advisor-railway-proxy][${requestId}] Request received`);

  try {
    // Parse request body
    const body = await req.json();
    const { endpoint, method = 'POST', payload, query_params } = body;
    
    console.log(`[advisor-railway-proxy][${requestId}] Parsed:`, { 
      endpoint, 
      method, 
      hasPayload: !!payload,
      payloadSize: payload ? JSON.stringify(payload).length : 0,
    });

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Bad Request', message: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate endpoint and method
    if (!isEndpointAllowed(endpoint)) {
      console.error('[advisor-railway-proxy] Endpoint not allowed:', endpoint);
      return new Response(JSON.stringify({ error: 'Forbidden', message: 'Endpoint not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isMethodAllowed(method)) {
      console.error('[advisor-railway-proxy] Method not allowed:', method);
      return new Response(JSON.stringify({ error: 'Method Not Allowed', message: `Method ${method} not allowed` }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: Validate user_id exists in advisor_users (minimal auth check)
    const userId = payload?.user_id;
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: user, error: userError } = await supabase
        .from('advisor_users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.warn('[advisor-railway-proxy] User not found in advisor_users:', userId);
        // Don't block - some endpoints might not require user validation
      } else {
        console.log('[advisor-railway-proxy] User validated:', userId);
      }
    }

    // Get Railway configuration
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');

    if (!railwayApiUrl) {
      console.error('[advisor-railway-proxy] RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Server Error', message: 'Backend not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build target URL with query params if provided
    let targetUrl = `${railwayApiUrl}${endpoint}`;
    if (query_params && typeof query_params === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query_params)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        targetUrl += `?${queryString}`;
      }
    }

    const isStreaming = isSSEEndpoint(endpoint);
    const hasAttachments = payload?.attachments && Array.isArray(payload.attachments) && payload.attachments.length > 0;
    
    console.log(`[advisor-railway-proxy][${requestId}] Proxying:`, { 
      endpoint, 
      method, 
      isStreaming,
      hasAttachments,
      attachmentCount: hasAttachments ? payload.attachments.length : 0,
      userId: userId || 'N/A',
    });

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Keep-Alive': 'timeout=120',
      },
    };

    if (payload !== undefined && payload !== null && method.toUpperCase() !== 'GET') {
      fetchOptions.body = JSON.stringify(payload);
    }

    // Add timeout for non-streaming requests
    if (!isStreaming) {
      const nonStreamingTimeout = getNonStreamingTimeoutMs(endpoint);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), nonStreamingTimeout);
      fetchOptions.signal = controller.signal;
      
      try {
        console.log(`[advisor-railway-proxy][${requestId}] Fetching Railway...`);
        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        console.log(`[advisor-railway-proxy][${requestId}] Response:`, { 
          status: response.status, 
          ok: response.ok,
          duration: `${duration}ms`,
        });
    
    // Handle Railway-specific errors (502 = Railway down)
    if (response.status === 502) {
      console.error(`[advisor-railway-proxy][${requestId}] Railway backend no disponible (502)`);
      return new Response(JSON.stringify({ 
        error: 'Backend No Disponible', 
        message: 'El servidor backend no está respondiendo. Por favor, intenta de nuevo en unos minutos.',
        code: 'BACKEND_UNAVAILABLE',
        technical_details: 'Railway application failed to respond'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const responseText = await response.text();
    
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

        return new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`[advisor-railway-proxy][${requestId}] Timeout after ${duration}ms`);
          return new Response(JSON.stringify({ 
            error: 'Gateway Timeout', 
            message: 'El servidor no respondió a tiempo. Intenta de nuevo.',
            code: 'TIMEOUT'
          }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw fetchError;
      }
    }

    // Streaming SSE response - always use full timeout for deep mode (Railway is slow)
    const streamingTimeout = STREAMING_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[advisor-railway-proxy][${requestId}] SSE timeout after ${streamingTimeout}ms`);
      controller.abort();
    }, streamingTimeout);
    
    fetchOptions.signal = controller.signal;
    
    console.log(`[advisor-railway-proxy][${requestId}] Starting SSE fetch (timeout: ${streamingTimeout}ms)...`);
    
    let response: Response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[advisor-railway-proxy][${requestId}] SSE connection timeout after ${duration}ms`);
        return new Response(JSON.stringify({ 
          error: 'Gateway Timeout', 
          message: 'La conexión con el servidor tardó demasiado. Intenta con menos documentos.',
          code: 'SSE_TIMEOUT'
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.error(`[advisor-railway-proxy][${requestId}] SSE fetch error:`, fetchError);
      return new Response(JSON.stringify({ 
        error: 'Bad Gateway', 
        message: 'No se pudo conectar con el servidor. Intenta más tarde.',
        code: 'CONNECTION_FAILED'
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Don't clear timeout yet for streaming - it will be handled by the response finishing
    
    if (!response.ok) {
      clearTimeout(timeoutId);
      const errorText = await response.text();
      let errorData: unknown;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error(`[advisor-railway-proxy][${requestId}] SSE error:`, response.status, errorData);
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return SSE stream directly
    const duration = Date.now() - startTime;
    console.log(`[advisor-railway-proxy][${requestId}] SSE stream started:`, { duration: `${duration}ms` });
    
    // Clear timeout when stream completes (wrap the body to detect end)
    const originalBody = response.body;
    
    // Pass through the stream directly - timeout will be cleared when edge function completes
    return new Response(originalBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[advisor-railway-proxy] Error:', error, `(${duration}ms)`);
    
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
