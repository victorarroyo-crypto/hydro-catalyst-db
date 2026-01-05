// Lovable Cloud Function: proxy ALL requests to the external scouting backend (avoids browser CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = 'GET', body } = await req.json();
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetro "endpoint" es obligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scouting-proxy] ${method} ${endpoint}`);

    const url = `${API_BASE}${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Id': 'admin',
        'X-User-Role': 'admin',
      },
    };

    if (body && method !== 'GET') {
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
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
