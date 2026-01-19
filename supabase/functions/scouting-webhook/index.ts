import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Helper function to ensure session exists before inserting logs
    // This prevents FK constraint violations
    async function ensureSessionExists(sessionId: string, eventData?: Record<string, unknown>) {
      const { data: existingSession } = await supabase
        .from('scouting_sessions')
        .select('session_id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!existingSession) {
        console.log(`Session ${sessionId} does not exist, creating it...`);
        const { error: upsertError } = await supabase
          .from('scouting_sessions')
          .upsert({
            session_id: sessionId,
            status: 'running',
            started_at: eventData?.started_at || new Date().toISOString(),
            current_phase: eventData?.phase || 'initialization',
            progress_percentage: 0,
            config: eventData?.config || {},
            current_activity: 'Sesión iniciada automáticamente',
            activity_timeline: [],
          }, { onConflict: 'session_id' });

        if (upsertError) {
          console.error('Error creating session:', upsertError);
          throw new Error(`Failed to create session: ${upsertError.message}`);
        }
        console.log(`Session ${sessionId} created successfully`);
      }
    }

    let result;

    switch (event) {
      case 'session_start':
        // FIRST: Create/update the session record
        console.log(`Creating session ${session_id}...`);
        const { error: sessionError } = await supabase
          .from('scouting_sessions')
          .upsert({
            session_id,
            status: 'running',
            started_at: data?.started_at || new Date().toISOString(),
            current_phase: data?.phase || 'initialization',
            progress_percentage: 0,
            config: data?.config || {},
            current_activity: 'Iniciando sesión de scouting...',
            activity_timeline: [],
          }, { onConflict: 'session_id' });

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          return new Response(
            JSON.stringify({ error: `Failed to create session: ${sessionError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log(`Session ${session_id} created successfully`);

        // THEN: Insert the log (now the FK constraint will be satisfied)
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'initialization',
          message: 'Sesión de scouting iniciada',
          details: data,
        });
        break;

      case 'activity':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // New event: structured activity update for UI
        console.log('Processing activity event:', data);
        
        // Get current timeline
        const { data: currentSessionData } = await supabase
          .from('scouting_sessions')
          .select('activity_timeline')
          .eq('session_id', session_id)
          .single();
        
        // Prepare new timeline entry
        const newTimelineEntry = {
          timestamp: data?.timestamp || new Date().toISOString(),
          message: data?.message || 'Actividad sin descripción',
          type: data?.type,
          site: data?.site,
          tech_name: data?.tech_name,
        };
        
        // Keep last 20 entries
        const currentTimeline = (currentSessionData?.activity_timeline as unknown[]) || [];
        const updatedTimeline = [newTimelineEntry, ...currentTimeline].slice(0, 20);
        
        // Update session with activity info
        const activityUpdate: Record<string, unknown> = {
          current_activity: data?.message,
          activity_timeline: updatedTimeline,
          updated_at: new Date().toISOString(),
        };
        
        if (data?.site) {
          activityUpdate.current_site = data.site;
        }
        if (data?.phase) {
          activityUpdate.current_phase = data.phase;
        }
        if (data?.phase_details) {
          activityUpdate.phase_details = data.phase_details;
        }
        if (data?.progress_percentage !== undefined) {
          activityUpdate.progress_percentage = data.progress_percentage;
        }
        if (data?.sites_examined !== undefined) {
          activityUpdate.sites_examined = data.sites_examined;
        }
        if (data?.technologies_found !== undefined) {
          activityUpdate.technologies_found = data.technologies_found;
        }
        if (data?.technologies_discarded !== undefined) {
          activityUpdate.technologies_discarded = data.technologies_discarded;
        }
        
        result = await supabase
          .from('scouting_sessions')
          .update(activityUpdate)
          .eq('session_id', session_id);

        // Also log to session_logs
        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: data?.level || 'info',
          phase: data?.phase || data?.type,
          message: data?.message || 'Activity update',
          details: data?.details || { site: data?.site, tech_name: data?.tech_name },
        });
        break;

      case 'site_start':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // New event: starting to analyze a site
        result = await supabase
          .from('scouting_sessions')
          .update({
            current_activity: `📄 Analizando: ${data?.site || 'sitio desconocido'}`,
            current_site: data?.site,
            current_phase: 'analyzing',
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', session_id);

        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'analyzing',
          message: `Iniciando análisis de sitio: ${data?.site}`,
          details: data,
        });
        break;

      case 'site_complete':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // New event: finished analyzing a site
        const siteCompleteUpdate: Record<string, unknown> = {
          current_activity: `✅ Completado: ${data?.site || 'sitio'}`,
          updated_at: new Date().toISOString(),
        };
        
        if (data?.sites_examined !== undefined) {
          siteCompleteUpdate.sites_examined = data.sites_examined;
        }
        if (data?.technologies_found !== undefined) {
          siteCompleteUpdate.technologies_found = data.technologies_found;
        }
        
        result = await supabase
          .from('scouting_sessions')
          .update(siteCompleteUpdate)
          .eq('session_id', session_id);

        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'site_complete',
          message: `Sitio analizado: ${data?.site} - ${data?.techs_found || 0} tecnologías encontradas`,
          details: data,
        });
        break;

      case 'tech_analyzing':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // New event: analyzing a specific technology
        result = await supabase
          .from('scouting_sessions')
          .update({
            current_activity: `🔍 Analizando tecnología: ${data?.tech_name || 'desconocida'}`,
            phase_details: { current_tech: data?.tech_name, provider: data?.provider },
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', session_id);

        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: 'tech_analyzing',
          message: `Analizando: ${data?.tech_name} (${data?.provider || 'proveedor desconocido'})`,
          details: data,
        });
        break;

      case 'tech_decision':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // New event: decision made about a technology
        const isApproved = data?.decision === 'approved';
        const decisionEmoji = isApproved ? '✅' : '❌';
        const decisionMsg = isApproved 
          ? `${decisionEmoji} Tecnología guardada: ${data?.tech_name}`
          : `${decisionEmoji} Descartada: ${data?.tech_name} - ${data?.reason || 'sin razón'}`;

        // Update activity timeline
        const { data: sessionForDecision } = await supabase
          .from('scouting_sessions')
          .select('activity_timeline, technologies_found, technologies_discarded')
          .eq('session_id', session_id)
          .single();
        
        const decisionTimeline = (sessionForDecision?.activity_timeline as unknown[]) || [];
        const decisionEntry = {
          timestamp: new Date().toISOString(),
          message: decisionMsg,
          type: isApproved ? 'approved' : 'discarded',
          tech_name: data?.tech_name,
        };
        
        const decisionUpdate: Record<string, unknown> = {
          current_activity: decisionMsg,
          activity_timeline: [decisionEntry, ...decisionTimeline].slice(0, 20),
          updated_at: new Date().toISOString(),
        };
        
        if (isApproved) {
          decisionUpdate.technologies_found = (sessionForDecision?.technologies_found || 0) + 1;
        } else {
          decisionUpdate.technologies_discarded = (sessionForDecision?.technologies_discarded || 0) + 1;
        }
        
        result = await supabase
          .from('scouting_sessions')
          .update(decisionUpdate)
          .eq('session_id', session_id);

        await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: isApproved ? 'technology_found' : 'technology_discarded',
          message: decisionMsg,
          details: data,
        });
        break;

      case 'progress':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
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
        if (data?.message) {
          progressUpdate.current_activity = data.message;
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
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // Log technology found
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: data?.phase || 'analysis',
          message: `✅ Tecnología encontrada: ${data?.technology_name || 'Sin nombre'}`,
          details: data,
        });

        // Update technologies_found count and activity
        const { data: currentSessionForFound } = await supabase
          .from('scouting_sessions')
          .select('technologies_found, activity_timeline')
          .eq('session_id', session_id)
          .single();
        
        if (currentSessionForFound) {
          const foundTimeline = (currentSessionForFound.activity_timeline as unknown[]) || [];
          const foundEntry = {
            timestamp: new Date().toISOString(),
            message: `✅ Tecnología encontrada: ${data?.technology_name || 'Sin nombre'}`,
            type: 'technology_found',
            tech_name: data?.technology_name,
          };
          
          await supabase
            .from('scouting_sessions')
            .update({ 
              technologies_found: (currentSessionForFound.technologies_found || 0) + 1,
              current_activity: `✅ Encontrada: ${data?.technology_name}`,
              activity_timeline: [foundEntry, ...foundTimeline].slice(0, 20),
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', session_id);
        }
        break;

      case 'technology_discarded':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // Log technology discarded
        result = await supabase.from('scouting_session_logs').insert({
          session_id,
          level: 'info',
          phase: data?.phase || 'filtering',
          message: `❌ Descartada: ${data?.technology_name || 'Sin nombre'} - ${data?.reason || 'Sin razón'}`,
          details: data,
        });
        
        // Update activity
        const { data: currentSessionForDiscard } = await supabase
          .from('scouting_sessions')
          .select('technologies_discarded, activity_timeline')
          .eq('session_id', session_id)
          .single();
        
        if (currentSessionForDiscard) {
          const discardTimeline = (currentSessionForDiscard.activity_timeline as unknown[]) || [];
          const discardEntry = {
            timestamp: new Date().toISOString(),
            message: `❌ Descartada: ${data?.technology_name} - ${data?.reason || ''}`,
            type: 'technology_discarded',
            tech_name: data?.technology_name,
          };
          
          await supabase
            .from('scouting_sessions')
            .update({
              technologies_discarded: (currentSessionForDiscard.technologies_discarded || 0) + 1,
              current_activity: `❌ Descartada: ${data?.technology_name}`,
              activity_timeline: [discardEntry, ...discardTimeline].slice(0, 20),
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', session_id);
        }
        break;

      case 'error':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
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
              current_activity: `⚠️ Error: ${data?.message}`,
            })
            .eq('session_id', session_id);
        }
        break;

      case 'session_complete':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
        // Mark session as completed
        result = await supabase
          .from('scouting_sessions')
          .update({
            status: 'completed',
            completed_at: data?.completed_at || new Date().toISOString(),
            progress_percentage: 100,
            current_phase: 'completed',
            current_activity: '🎉 Scouting completado',
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
          message: '🎉 Sesión de scouting completada',
          details: data,
        });
        break;

      case 'log':
        // Ensure session exists first
        await ensureSessionExists(session_id, data);
        
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
        // Ensure session exists first for unknown events too
        await ensureSessionExists(session_id, data);
        
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
