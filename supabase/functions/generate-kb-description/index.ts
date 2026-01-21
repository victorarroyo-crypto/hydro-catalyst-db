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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAILWAY_API_URL || !RAILWAY_SYNC_SECRET) {
      console.error('[generate-kb-description] Missing RAILWAY_API_URL or RAILWAY_SYNC_SECRET');
      throw new Error('Railway configuration is missing');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[generate-kb-description] Missing Supabase configuration');
      throw new Error('Supabase configuration is missing');
    }

    // Fetch document details from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: doc, error: docError } = await supabase
      .from('knowledge_documents')
      .select('name, category, sector')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error('[generate-kb-description] Document not found:', docError);
      throw new Error('Document not found');
    }

    // Call Railway API with document info
    const railwayUrl = `${RAILWAY_API_URL}/api/kb/generate-description`;
    console.log('[generate-kb-description] Calling Railway:', railwayUrl, { fileName: doc.name, category: doc.category, sector: doc.sector });

    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': RAILWAY_SYNC_SECRET,
      },
      body: JSON.stringify({
        fileName: doc.name,
        category: doc.category || 'technical_guide',
        sector: doc.sector || 'general',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-kb-description] Railway error:', response.status, errorText);
      throw new Error(`Railway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[generate-kb-description] Railway response received:', data);

    // Extract description from response
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
