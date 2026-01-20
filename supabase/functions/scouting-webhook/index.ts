import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-webhook-secret, content-type',
}

// BD Externa donde el frontend consulta
const EXTERNAL_URL = 'https://ktzhrlcvluaptixngrsh.supabase.co';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('SCOUTING_WEBHOOK_SECRET')
    
    if (webhookSecret !== expectedSecret) {
      console.error('[WEBHOOK] Invalid secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = await req.json()
    const { event, session_id, timestamp, data } = payload

    console.log(`[WEBHOOK] Event: ${event}, Session: ${session_id}`)

    // Conectar a BD EXTERNA (donde el frontend consulta)
    const supabase = createClient(
      EXTERNAL_URL,
      Deno.env.get('EXTERNAL_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. SIEMPRE hacer UPSERT de la sesión primero
    const sessionData: Record<string, unknown> = {
      session_id: session_id,
      updated_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString()
    }

    // Actualizar campos según el tipo de evento
    switch (event) {
      case 'session_start':
        sessionData.status = 'running'
        sessionData.current_phase = data?.phase || 'init'
        sessionData.started_at = data?.started_at || new Date().toISOString()
        sessionData.config = data?.config || {}
        sessionData.progress_percentage = data?.progress_pct || 0
        // Nuevos campos v2.5
        sessionData.phase_details = {
          phase_index: data?.phase_index || 0,
          total_phases: data?.total_phases || 7,
          current_agent: data?.current_agent || 'Sistema',
          description: data?.description || ''
        }
        break
        
      case 'progress':
        sessionData.current_phase = data?.phase
        sessionData.current_activity = data?.activity || data?.description
        sessionData.progress_percentage = data?.progress_pct || 0
        // Nuevos campos v2.5
        sessionData.phase_details = {
          phase_index: data?.phase_index || 0,
          total_phases: data?.total_phases || 7,
          current_agent: data?.current_agent || '',
          description: data?.description || '',
          elapsed_seconds: data?.elapsed_seconds || 0
        }
        if (data?.metrics) {
          sessionData.technologies_found = data.metrics.technologies_found || 0
          sessionData.technologies_approved = data.metrics.technologies_approved || 0
          sessionData.technologies_discarded = data.metrics.technologies_discarded || 0
          sessionData.sites_examined = data.metrics.sources_checked || 0
        }
        break
        
      case 'activity':
        sessionData.current_activity = data?.message
        sessionData.current_site = data?.site
        break

      case 'technology_found':
        // Incrementar contador y registrar en timeline
        sessionData.current_activity = `🔬 Tecnología encontrada: ${data?.technology_name}`
        break

      case 'tech_decision':
        // Decisión sobre tecnología
        sessionData.current_activity = data?.message
        break
        
      case 'session_complete':
        sessionData.status = data?.status || 'completed'
        sessionData.completed_at = data?.completed_at || new Date().toISOString()
        sessionData.summary = data?.summary || {}
        sessionData.current_phase = 'completed'
        sessionData.progress_percentage = 100
        sessionData.current_activity = null
        // Guardar métricas finales del summary
        if (data?.summary?.metrics) {
          sessionData.technologies_found = data.summary.metrics.technologies_found || 0
          sessionData.technologies_approved = data.summary.metrics.technologies_approved || 0
          sessionData.technologies_discarded = data.summary.metrics.technologies_discarded || 0
          sessionData.sites_examined = data.summary.metrics.sources_checked || 0
        }
        break
        
      case 'error':
        if (data?.critical) {
          sessionData.status = 'failed'
          sessionData.error_message = data?.message
          sessionData.completed_at = new Date().toISOString()
        }
        break

      case 'warning':
        // Solo registrar en logs, no cambiar estado
        break
    }

    // UPSERT sesión en BD externa
    const { error: sessionError } = await supabase
      .from('scouting_sessions')
      .upsert(sessionData, { onConflict: 'session_id' })

    if (sessionError) {
      console.error('[WEBHOOK] Session upsert error:', sessionError)
    } else {
      console.log(`[WEBHOOK] Session upserted to EXTERNAL DB: ${session_id}`)
    }

    // 2. Insertar log en BD externa (con nivel correcto)
    const logLevel = event === 'error' ? 'error' : 
                     event === 'warning' ? 'warning' : 
                     event === 'tech_decision' && data?.decision === 'approved' ? 'success' :
                     'info'
    
    const { error: logError } = await supabase
      .from('scouting_session_logs')
      .insert({
        session_id: session_id,
        timestamp: timestamp || new Date().toISOString(),
        level: logLevel,
        phase: data?.phase || event,
        message: data?.message || `[${event}] ${data?.description || ''}`,
        details: data || {}
      })

    if (logError) {
      console.error('[WEBHOOK] Log insert error:', logError)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
