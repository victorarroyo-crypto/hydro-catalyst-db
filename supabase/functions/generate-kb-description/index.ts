import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAILWAY_API_URL = Deno.env.get('RAILWAY_API_URL');
    const RAILWAY_SYNC_SECRET = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!RAILWAY_API_URL || !RAILWAY_SYNC_SECRET) {
      console.error('[generate-kb-description] Missing RAILWAY_API_URL or RAILWAY_SYNC_SECRET');
      throw new Error('Railway configuration is missing');
    }

    const railwayUrl = `${RAILWAY_API_URL}/api/kb/document/${documentId}/generate-description`;
    console.log('[generate-kb-description] Calling Railway:', railwayUrl);

    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': RAILWAY_SYNC_SECRET,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-kb-description] Railway error:', response.status, errorText);
      throw new Error(`Railway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[generate-kb-description] Railway response received');

    // Extract description from ai_analysis
    const description = data.ai_analysis?.description || data.description || '';

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-kb-description] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
