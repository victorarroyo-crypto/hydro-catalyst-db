import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed KB endpoints
const ALLOWED_ENDPOINT_PATTERNS = [
  /^\/api\/kb\/document\/[a-f0-9-]+\/generate-description$/,
  /^\/api\/kb\/reprocess\/[a-f0-9-]+$/,
  /^\/api\/kb\/process$/,
  /^\/api\/kb\/generate-description$/,
];

const ALLOWED_METHODS = ['POST'];
const ALLOWED_ROLES = ['admin', 'supervisor', 'analyst'];

function isEndpointAllowed(endpoint: string): boolean {
  // Prevent path traversal
  if (endpoint.includes('..') || endpoint.includes('//')) return false;
  return ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(endpoint));
}

function isMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase());
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[kb-railway-proxy] Missing or invalid auth header');
      return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      console.error('[kb-railway-proxy] Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    console.log('[kb-railway-proxy] Authenticated user:', userId);

    // Check user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('[kb-railway-proxy] Error fetching roles:', rolesError.message);
    }

    const userRoles = roles?.map(r => r.role) || [];
    console.log('[kb-railway-proxy] User roles:', userRoles);

    if (!userRoles.some(role => ALLOWED_ROLES.includes(role))) {
      console.error('[kb-railway-proxy] Forbidden - insufficient roles');
      return new Response(JSON.stringify({ error: 'Forbidden', message: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { endpoint, method = 'POST', payload } = body;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Bad Request', message: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate endpoint and method
    if (!isEndpointAllowed(endpoint)) {
      console.error('[kb-railway-proxy] Endpoint not allowed:', endpoint);
      return new Response(JSON.stringify({ error: 'Forbidden', message: 'Endpoint not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isMethodAllowed(method)) {
      console.error('[kb-railway-proxy] Method not allowed:', method);
      return new Response(JSON.stringify({ error: 'Method Not Allowed', message: `Method ${method} not allowed` }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Railway configuration
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!railwayApiUrl) {
      console.error('[kb-railway-proxy] RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Server Error', message: 'Backend not configured (RAILWAY_API_URL)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!syncSecret) {
      console.error('[kb-railway-proxy] RAILWAY_SYNC_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server Error', message: 'Backend not configured (RAILWAY_SYNC_SECRET)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = `${railwayApiUrl}${endpoint}`;
    console.log('[kb-railway-proxy] Proxying request:', { targetUrl, method, userId, hasPayload: !!payload });

    // Make request to Railway with server-side secret
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': syncSecret,
        'X-User-Id': userId,
        'X-User-Roles': userRoles.join(','),
      },
    };

    if (payload !== undefined && payload !== null) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();
    
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('[kb-railway-proxy] Railway response:', { 
      status: response.status, 
      ok: response.ok,
      hasData: !!responseData 
    });

    // Return response to client
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      ...responseData,
    }), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[kb-railway-proxy] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
