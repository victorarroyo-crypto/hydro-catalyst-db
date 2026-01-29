import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Timeout for Railway requests (2 minutes should be enough for non-streaming)
const REQUEST_TIMEOUT_MS = 120000;

async function proxyToRailway(
  railwayUrl: string, 
  endpoint: string, 
  options?: { method?: string; body?: unknown }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const fetchOptions: RequestInit = {
      method: options?.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };
    
    if (options?.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    console.log(`[deep-advisor] Proxying ${options?.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${railwayUrl}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[deep-advisor] Request timed out');
      return new Response(JSON.stringify({ error: 'Timeout', message: 'Request timed out' }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Extract path after function name
  const path = url.pathname.replace('/deep-advisor', '').replace('/functions/v1/deep-advisor', '');
  const method = req.method;

  const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
  if (!railwayApiUrl) {
    console.error('[deep-advisor] RAILWAY_API_URL not configured');
    return new Response(JSON.stringify({ error: 'Backend not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // POST /start - Iniciar nuevo job
    if (path === '/start' && method === 'POST') {
      const body = await req.json();
      
      // Validar user_id
      if (!body.user_id) {
        return new Response(JSON.stringify({ error: 'user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`[deep-advisor] Starting job for user ${body.user_id}`);
      
      return proxyToRailway(railwayApiUrl, '/api/advisor/deep/start', { 
        method: 'POST', 
        body 
      });
    }

    // GET /status/:job_id - Consultar estado del job
    if (path.startsWith('/status/') && method === 'GET') {
      const jobId = path.split('/status/')[1];
      
      if (!jobId || !/^[\w-]+$/.test(jobId)) {
        return new Response(JSON.stringify({ error: 'Invalid job_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, `/api/advisor/deep/status/${jobId}`);
    }

    // GET /jobs?user_id=xxx - Listar jobs de un usuario
    if (path === '/jobs' && method === 'GET') {
      const userId = url.searchParams.get('user_id');
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id query param is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, `/api/advisor/deep/jobs?user_id=${userId}`);
    }

    // POST /cancel/:job_id - Cancel a running job (future extensibility)
    if (path.startsWith('/cancel/') && method === 'POST') {
      const jobId = path.split('/cancel/')[1];
      
      if (!jobId || !/^[\w-]+$/.test(jobId)) {
        return new Response(JSON.stringify({ error: 'Invalid job_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, `/api/advisor/deep/cancel/${jobId}`, { method: 'POST' });
    }

    // 404 for unknown routes
    console.warn(`[deep-advisor] Unknown route: ${method} ${path}`);
    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[deep-advisor] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      message: error instanceof Error ? error.message : 'Unknown' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
