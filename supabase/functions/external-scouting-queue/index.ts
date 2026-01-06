import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'list' | 'get' | 'update' | 'count';
  status?: string;
  id?: string;
  updates?: Record<string, unknown>;
}

// Status mapping for database queue_status column
const STATUS_MAPPING: Record<string, string[]> = {
  'review': ['pending', 'review', 'reviewing'],
  'pending_approval': ['pending_approval'],
  'approved': ['approved'],
  'rejected': ['rejected'],
  'active': ['pending', 'review', 'reviewing', 'pending_approval'],
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get external Supabase credentials from secrets
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured');
    }

    // Create client for external Supabase
    const externalSupabase = createClient(externalUrl, externalKey);

    const body: RequestBody = await req.json();
    const { action, status, id, updates } = body;

    if (action === 'list') {
      // Fetch scouting queue items from external DB
      let query = externalSupabase
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        const dbStatuses = STATUS_MAPPING[status] || [status];
        query = query.in('queue_status', dbStatuses);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[external-scouting-queue] List error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get' && id) {
      // Get single item from external DB
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[external-scouting-queue] Get error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update' && id && updates) {
      // Update item in external DB
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[external-scouting-queue] Update error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'count') {
      // Get counts from external DB
      const [reviewRes, pendingRes] = await Promise.all([
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .in('queue_status', ['pending', 'review', 'reviewing']),
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .eq('queue_status', 'pending_approval'),
      ]);

      // Rejected is in local DB (Lovable Cloud), not external
      // We'll fetch it separately from local

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            review: reviewRes.count ?? 0,
            pending_approval: pendingRes.count ?? 0,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[external-scouting-queue] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
