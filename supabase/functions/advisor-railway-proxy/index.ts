import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request body
    const body = await req.json();
    const { endpoint, method = 'POST', payload, query_params } = body;

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
    console.log('[advisor-railway-proxy] Proxying:', { 
      endpoint, 
      method, 
      isStreaming, 
      hasPayload: !!payload,
      userId: userId || 'N/A',
    });

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    };

    if (payload !== undefined && payload !== null && method.toUpperCase() !== 'GET') {
      fetchOptions.body = JSON.stringify(payload);
    }

    // Add timeout for non-streaming requests
    if (!isStreaming) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      fetchOptions.signal = controller.signal;
      
      try {
        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        
        let responseData: unknown;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        const duration = Date.now() - startTime;
        console.log('[advisor-railway-proxy] Response:', { 
          status: response.status, 
          ok: response.ok,
          duration: `${duration}ms`,
        });

        return new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[advisor-railway-proxy] Request timeout');
          return new Response(JSON.stringify({ error: 'Gateway Timeout', message: 'Backend did not respond in time' }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw fetchError;
      }
    }

    // Streaming SSE response - passthrough the body
    const response = await fetch(targetUrl, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: unknown;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('[advisor-railway-proxy] SSE error:', response.status, errorData);
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return SSE stream directly
    const duration = Date.now() - startTime;
    console.log('[advisor-railway-proxy] SSE stream started:', { duration: `${duration}ms` });

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
