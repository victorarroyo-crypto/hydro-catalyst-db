// Lovable Cloud Function: proxy requests to the external scouting backend (avoids browser CORS)
// Security: Implements endpoint allowlist, method validation, and path traversal protection

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

// Allowlist of permitted endpoint patterns
const ALLOWED_ENDPOINT_PATTERNS = [
  /^\/api\/scouting\/queue\/?$/,
  /^\/api\/scouting\/queue\/[a-f0-9-]+\/?$/,
  /^\/api\/scouting\/sources\/?$/,
  /^\/api\/scouting\/sources\/[a-f0-9-]+\/?$/,
  /^\/api\/scouting\/technologies\/?$/,
  /^\/api\/scouting\/technologies\/[a-f0-9-]+\/?$/,
  /^\/api\/scouting\/stats\/?$/,
  /^\/api\/scouting\/sync\/?$/,
  /^\/api\/scouting\/import\/?$/,
  /^\/api\/scouting\/export\/?$/,
  /^\/api\/health\/?$/,
];

// Allowed HTTP methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Validate endpoint against allowlist
function isEndpointAllowed(endpoint: string): boolean {
  // Prevent path traversal attacks
  if (endpoint.includes('..') || endpoint.includes('//')) {
    return false;
  }
  
  // Normalize the endpoint
  const normalizedEndpoint = endpoint.toLowerCase().replace(/\/+$/, '');
  
  // Check against allowlist patterns
  return ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(normalizedEndpoint));
}

// Validate HTTP method
function isMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase());
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[scouting-proxy] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado: token de autenticación requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify the JWT and get user claims
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.warn('[scouting-proxy] Invalid JWT token');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticación inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;
    
    // Get user role from database
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    const userRole = roleData?.role || 'client_basic';
    
    // Only allow internal users (admin, supervisor, analyst) to use this proxy
    const allowedRoles = ['admin', 'supervisor', 'analyst'];
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[scouting-proxy] User ${userId} with role ${userRole} denied access`);
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permisos para acceder a este servicio' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse and validate request body
    const { endpoint, method = 'GET', body } = await req.json();
    
    // Validate endpoint is provided
    if (!endpoint || typeof endpoint !== 'string') {
      console.warn('[scouting-proxy] Missing or invalid endpoint parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetro "endpoint" es obligatorio y debe ser una cadena' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate endpoint against allowlist
    if (!isEndpointAllowed(endpoint)) {
      console.warn(`[scouting-proxy] Blocked disallowed endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Endpoint no permitido' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate HTTP method
    const normalizedMethod = (typeof method === 'string' ? method : 'GET').toUpperCase();
    if (!isMethodAllowed(normalizedMethod)) {
      console.warn(`[scouting-proxy] Blocked disallowed method: ${normalizedMethod}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Método HTTP no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scouting-proxy] ${normalizedMethod} ${endpoint} by user ${userId} (${userRole})`);

    const url = `${API_BASE}${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method: normalizedMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Pass authenticated user identity instead of hardcoded admin
        'X-User-Id': userId,
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole,
      },
    };

    if (body && normalizedMethod !== 'GET') {
      // Validate body is an object (basic validation)
      if (typeof body !== 'object' || body === null) {
        return new Response(
          JSON.stringify({ success: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log(`[scouting-proxy] Response status=${res.status}`);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error del backend: ${res.status}`,
          details: { status: res.status, body: data },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scouting-proxy] Exception: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
