import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const caseStudyId = url.searchParams.get('id');
    
    if (!caseStudyId) {
      return new Response(
        JSON.stringify({ error: 'Missing case study ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAILWAY_API_URL = Deno.env.get('RAILWAY_API_URL');
    const RAILWAY_SYNC_SECRET = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!RAILWAY_API_URL) {
      return new Response(
        JSON.stringify({ error: 'Backend not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching document for case study: ${caseStudyId}`);
    
    const headers: Record<string, string> = {};
    if (RAILWAY_SYNC_SECRET) {
      headers['X-Sync-Secret'] = RAILWAY_SYNC_SECRET;
    }

    const response = await fetch(
      `${RAILWAY_API_URL}/api/case-study/${caseStudyId}/document`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Backend error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const blob = await response.blob();
    
    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="caso_estudio_${caseStudyId}.docx"`,
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
