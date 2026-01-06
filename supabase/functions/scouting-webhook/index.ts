import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('SCOUTING_WEBHOOK_SECRET');
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    const { event, session_id, data } = payload;

    if (!event || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event and session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;

    switch (event) {
      case 'session_start':
        // Create new scouting session
        result = await supabase
          .from('scouting_sessions')
          .upsert({
            session_id,
            status: 'running',
            started_at: data?.started_at || new Date().toISOString(),
            current_phase: data?.phase || 'initialization',
            progress_percentage: 0,
            config: data?.config || {},
          }, { onConflict: 'session_id' });

        // Log session start
        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'initialization',
          message: 'Sesión de scouting iniciada',
          details: data,
        });
        break;

      case 'progress':
        // Update session progress
        const progressUpdate: Record<string, unknown> = {
          current_phase: data?.phase,
          progress_percentage: data?.progress_percentage || 0,
          updated_at: new Date().toISOString(),
        };

        if (data?.sites_examined !== undefined) {
          progressUpdate.sites_examined = data.sites_examined;
        }
        if (data?.technologies_found !== undefined) {
          progressUpdate.technologies_found = data.technologies_found;
        }
        if (data?.technologies_discarded !== undefined) {
          progressUpdate.technologies_discarded = data.technologies_discarded;
        }

        result = await supabase
          .from('scouting_sessions')
          .update(progressUpdate)
          .eq('session_id', session_id);

        // Log progress
        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: data?.level || 'info',
          phase: data?.phase,
          message: data?.message || `Progreso: ${data?.progress_percentage}%`,
          details: data?.details || data,
        });
        break;

      case 'technology_found':
        // Log technology found
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: data?.phase || 'analysis',
          message: `Tecnología encontrada: ${data?.technology_name || 'Sin nombre'}`,
          details: data,
        });

        // Update technologies_found count (increment manually)
        const { data: currentSession } = await supabase
          .from('scouting_sessions')
          .select('technologies_found')
          .eq('session_id', session_id)
          .single();
        
        if (currentSession) {
          await supabase
            .from('scouting_sessions')
            .update({ technologies_found: (currentSession.technologies_found || 0) + 1 })
            .eq('session_id', session_id);
        }
        break;

      case 'technology_discarded':
        // Log technology discarded
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: data?.phase || 'filtering',
          message: `Tecnología descartada: ${data?.technology_name || 'Sin nombre'} - ${data?.reason || 'Sin razón'}`,
          details: data,
        });
        break;

      case 'error':
        // Log error
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'error',
          phase: data?.phase,
          message: data?.message || 'Error desconocido',
          details: data?.details || data,
        });

        // Update session status if critical
        if (data?.critical) {
          await supabase
            .from('scouting_sessions')
            .update({
              status: 'failed',
              error_message: data?.message,
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', session_id);
        }
        break;

      case 'session_complete':
        // Mark session as completed
        result = await supabase
          .from('scouting_sessions')
          .update({
            status: 'completed',
            completed_at: data?.completed_at || new Date().toISOString(),
            progress_percentage: 100,
            current_phase: 'completed',
            sites_examined: data?.sites_examined,
            technologies_found: data?.technologies_found,
            technologies_discarded: data?.technologies_discarded,
            technologies_approved: data?.technologies_approved,
            summary: data?.summary || {},
          })
          .eq('session_id', session_id);

        // Log completion
        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'completed',
          message: 'Sesión de scouting completada',
          details: data,
        });
        break;

      case 'log':
        // Generic log entry
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: data?.level || 'info',
          phase: data?.phase,
          message: data?.message || 'Log entry',
          details: data?.details,
        });
        break;

      default:
        console.log(`Unknown event type: ${event}`);
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'warning',
          phase: 'unknown',
          message: `Evento desconocido: ${event}`,
          details: payload,
        });
    }

    if (result?.error) {
      console.error('Database error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully processed ${event} event for session ${session_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event,
        session_id,
        message: `Event ${event} processed successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
