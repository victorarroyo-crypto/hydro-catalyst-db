import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed endpoints for the study proxy
const ALLOWED_ENDPOINT_PATTERNS = [
  /^\/api\/study\/(start|stop|status|cancel)$/,
  /^\/api\/study\/session\/[a-f0-9-]+$/,
  /^\/api\/study\/session\/[a-f0-9-]+\/(logs|progress|results)$/,
  /^\/api\/health$/,
  /^\/api\/models$/,
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

function isEndpointAllowed(endpoint: string): boolean {
  // Prevent path traversal
  if (endpoint.includes('..') || endpoint.includes('//')) {
    return false;
  }
  return ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(endpoint));
}

function isMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase());
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
    const webhookSecret = Deno.env.get('STUDY_WEBHOOK_SECRET');

    if (!railwayApiUrl) {
      console.error('RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Backend not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;

    // Check user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = roles?.map(r => r.role) || [];
    const allowedRoles = ['admin', 'supervisor', 'analyst'];
    
    if (!userRoles.some(role => allowedRoles.includes(role))) {
      console.error('User lacks required role:', userId, userRoles);
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const { endpoint, method = 'GET', payload } = body;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate endpoint and method
    if (!isEndpointAllowed(endpoint)) {
      console.error('Endpoint not allowed:', endpoint);
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!isMethodAllowed(method)) {
      console.error('Method not allowed:', method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Proxying request:', { endpoint, method, userId });

    // Forward request to Railway backend
    const targetUrl = `${railwayApiUrl}${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret || '',
        'X-User-Id': userId,
        'X-User-Roles': userRoles.join(',')
      }
    };

    if (payload && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.json().catch(() => null);

    console.log('Backend response:', response.status);

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      data: responseData
    }), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in study-proxy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
