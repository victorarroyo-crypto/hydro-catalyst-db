import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse FormData from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string;
    const projectId = formData.get('project_id') as string;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing file or project_id' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Uploading file: ${file.name} (${file.size} bytes) for project: ${projectId}`);

    // 3. Forward to Railway backend
    const railwayUrl = Deno.env.get('RAILWAY_API_URL');
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!railwayUrl) {
      console.error('RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Backend not configured' }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build FormData for Railway
    const railwayFormData = new FormData();
    railwayFormData.append('file', file);
    railwayFormData.append('file_type', fileType || 'otro');

    const railwayHeaders: Record<string, string> = {
      'X-User-Id': userData.user.id,
    };
    
    if (syncSecret) {
      railwayHeaders['X-Sync-Secret'] = syncSecret;
    }

    const response = await fetch(
      `${railwayUrl}/api/cost-consulting/projects/${projectId}/documents`,
      {
        method: 'POST',
        headers: railwayHeaders,
        body: railwayFormData,
      }
    );

    const responseText = await response.text();
    console.log(`Railway response (${response.status}):`, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return new Response(JSON.stringify({
      success: response.ok,
      ...responseData,
    }), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Upload proxy error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
