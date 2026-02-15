import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  // Background Jobs + Polling endpoints (new architecture)
  /^\/api\/advisor\/deep\/start$/,
  /^\/api\/advisor\/deep\/status\/[\w-]+$/,
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

// Keep-alive ping interval (15 seconds)
const PING_INTERVAL_MS = 15000;

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
const DEFAULT_NON_STREAMING_TIMEOUT = 120000; // 120s for most normal requests (backend can cold-start)
const CONFIG_NON_STREAMING_TIMEOUT = 180000; // 180s for /models and /deep/config
const STREAMING_TIMEOUT = 600000; // 10 minutes for streaming (Railway deep mode can be very slow with complex documents)

function getNonStreamingTimeoutMs(endpoint: string): number {
  // These endpoints are frequently called on page load and can be slow on backend cold-start.
  if (endpoint === '/api/advisor/models' || endpoint === '/api/advisor/deep/config') {
    return CONFIG_NON_STREAMING_TIMEOUT;
  }
  return DEFAULT_NON_STREAMING_TIMEOUT;
}

/**
 * Create a TransformStream that injects keep-alive pings every PING_INTERVAL_MS
 * to prevent proxies/CDN from closing the SSE connection due to inactivity.
 */
function createKeepAliveStream(
  originalBody: ReadableStream<Uint8Array>,
  requestId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pingData = encoder.encode('data: {"event":"ping"}\n\n');
  
  let pingIntervalId: number | undefined;
  
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  
  // Pipe original stream and inject pings
  (async () => {
    const writer = writable.getWriter();
    const reader = originalBody.getReader();
    
    // Start ping interval
    pingIntervalId = setInterval(() => {
      writer.write(pingData).catch(() => {
        // Ignore write errors - stream might be closed
      });
      console.log(`[advisor-railway-proxy][${requestId}] Sent keep-alive ping`);
    }, PING_INTERVAL_MS);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[advisor-railway-proxy][${requestId}] SSE stream completed`);
          break;
        }
        await writer.write(value);
      }
    } catch (err) {
      console.error(`[advisor-railway-proxy][${requestId}] SSE read error:`, err);
    } finally {
      if (pingIntervalId !== undefined) {
        clearInterval(pingIntervalId);
        console.log(`[advisor-railway-proxy][${requestId}] Stopped keep-alive pings`);
      }
      try {
        await writer.close();
      } catch {
        // Ignore close errors
      }
    }
  })();
  
  return readable;
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

    // Streaming SSE response - use extended timeout for deep mode (Railway is slow)
    const streamingTimeout = STREAMING_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[advisor-railway-proxy][${requestId}] SSE timeout after ${streamingTimeout}ms`);
      controller.abort();
    }, streamingTimeout);
    
    fetchOptions.signal = controller.signal;
    
    console.log(`[advisor-railway-proxy][${requestId}] Starting SSE fetch (timeout: ${streamingTimeout / 1000}s, keepalive: ${PING_INTERVAL_MS / 1000}s)...`);
    
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

    // Wrap SSE stream with keep-alive pings
    const duration = Date.now() - startTime;
    console.log(`[advisor-railway-proxy][${requestId}] SSE stream started:`, { duration: `${duration}ms` });
    
    const originalBody = response.body;
    
    if (!originalBody) {
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({ error: 'No response body from backend' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create keep-alive stream that injects pings every 15 seconds
    const keepAliveStream = createKeepAliveStream(originalBody, requestId);
    
    // Clear timeout after stream completes (the keep-alive stream handles its own cleanup)
    // We still keep the global timeout as a safety net
    
    return new Response(keepAliveStream, {
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
