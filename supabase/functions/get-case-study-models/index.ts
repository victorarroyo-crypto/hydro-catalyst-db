import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[get-case-study-models] Fetching models from Railway...');
    
    const response = await fetch(`${RAILWAY_URL}/api/case-study/models`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-case-study-models] Railway error:', response.status, errorText);
      throw new Error(`Railway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[get-case-study-models] Received models:', data.models?.length || 0);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-case-study-models] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
