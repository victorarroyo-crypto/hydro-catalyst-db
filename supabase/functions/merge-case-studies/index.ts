import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  source_case_id: string;  // The newly created case to be merged (will be deleted)
  target_case_id: string;  // The existing case to merge into
  job_id?: string;         // Optional: job ID to update result_data
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MergeRequest = await req.json();
    const { source_case_id, target_case_id, job_id } = body;

    console.log('[MERGE-CASE-STUDIES] Starting merge:', {
      source: source_case_id,
      target: target_case_id,
      job: job_id
    });

    // Validate required fields
    if (!source_case_id || !target_case_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'source_case_id and target_case_id are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (source_case_id === target_case_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot merge a case with itself' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify both cases exist
    const { data: sourceCase, error: sourceError } = await supabase
      .from('casos_de_estudio')
      .select('id, name')
      .eq('id', source_case_id)
      .single();

    if (sourceError || !sourceCase) {
      console.error('[MERGE-CASE-STUDIES] Source case not found:', sourceError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Source case not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: targetCase, error: targetError } = await supabase
      .from('casos_de_estudio')
      .select('id, name')
      .eq('id', target_case_id)
      .single();

    if (targetError || !targetCase) {
      console.error('[MERGE-CASE-STUDIES] Target case not found:', targetError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Target case not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[MERGE-CASE-STUDIES] Both cases verified:', {
      source: sourceCase.name,
      target: targetCase.name
    });

    // 2. Move technologies from source to target
    const { data: movedTechs, error: moveError } = await supabase
      .from('case_study_technologies')
      .update({ case_study_id: target_case_id })
      .eq('case_study_id', source_case_id)
      .select('id, technology_name');

    if (moveError) {
      console.error('[MERGE-CASE-STUDIES] Error moving technologies:', moveError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to move technologies: ' + moveError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const movedCount = movedTechs?.length || 0;
    console.log('[MERGE-CASE-STUDIES] Moved technologies:', movedCount);

    // 3. Update job result_data if job_id provided
    if (job_id) {
      const { error: jobUpdateError } = await supabase
        .from('case_study_jobs')
        .update({
          result_data: {
            merged_into: target_case_id,
            merged_at: new Date().toISOString(),
            source_case_deleted: source_case_id,
            technologies_moved: movedCount,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      if (jobUpdateError) {
        console.warn('[MERGE-CASE-STUDIES] Failed to update job:', jobUpdateError);
        // Non-fatal, continue with merge
      }
    }

    // 4. Delete the source case (duplicated one)
    const { error: deleteError } = await supabase
      .from('casos_de_estudio')
      .delete()
      .eq('id', source_case_id);

    if (deleteError) {
      console.error('[MERGE-CASE-STUDIES] Error deleting source case:', deleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to delete source case: ' + deleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[MERGE-CASE-STUDIES] Merge completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cases merged successfully',
        data: {
          target_case_id,
          target_case_name: targetCase.name,
          source_case_deleted: source_case_id,
          source_case_name: sourceCase.name,
          technologies_moved: movedCount,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MERGE-CASE-STUDIES] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});