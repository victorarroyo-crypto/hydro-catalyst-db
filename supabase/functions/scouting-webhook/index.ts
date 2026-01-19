import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-webhook-secret, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('SCOUTING_WEBHOOK_SECRET')
    
    if (webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = await req.json()
    const { event, session_id, timestamp, data } = payload

    console.log(`[WEBHOOK] Event: ${event}, Session: ${session_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ALWAYS upsert session first to handle FK constraint
    const sessionData: Record<string, unknown> = {
      session_id: session_id,
      updated_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString()
    }

    // Update session based on event type
    if (event === 'session_start') {
      sessionData.status = 'running'
      sessionData.current_phase = data?.phase || 'init'
      sessionData.started_at = data?.started_at || new Date().toISOString()
      sessionData.config = data?.config || {}
    } else if (event === 'progress') {
      sessionData.current_phase = data?.phase
      sessionData.progress_percentage = data?.progress_percentage || 0
      if (data?.metrics) {
        sessionData.technologies_found = data.metrics.technologies_found || 0
        sessionData.technologies_approved = data.metrics.technologies_approved || 0
        sessionData.technologies_discarded = data.metrics.technologies_discarded || 0
        sessionData.sites_examined = data.metrics.sources_checked || 0
      }
    } else if (event === 'activity' || event === 'site_start' || event === 'site_complete') {
      sessionData.current_activity = data?.message
      sessionData.current_site = data?.site
    } else if (event === 'session_complete') {
      sessionData.status = data?.status || 'completed'
      sessionData.completed_at = data?.completed_at || new Date().toISOString()
      sessionData.summary = data?.summary || {}
      sessionData.current_phase = 'completed'
    } else if (event === 'error') {
      if (data?.critical) {
        sessionData.status = 'failed'
        sessionData.error_message = data?.message
      }
    }

    // Upsert session FIRST
    const { error: sessionError } = await supabase
      .from('scouting_sessions')
      .upsert(sessionData, { onConflict: 'session_id' })

    if (sessionError) {
      console.error('[WEBHOOK] Session upsert error:', sessionError)
    }

    // THEN insert log entry
    const logEntry = {
      session_id: session_id,
      timestamp: timestamp || new Date().toISOString(),
      level: event === 'error' ? 'error' : (event === 'warning' ? 'warn' : 'info'),
      phase: data?.phase || sessionData.current_phase,
      message: data?.message || event,
      details: data || {}
    }

    const { error: logError } = await supabase
      .from('scouting_session_logs')
      .insert(logEntry)

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
