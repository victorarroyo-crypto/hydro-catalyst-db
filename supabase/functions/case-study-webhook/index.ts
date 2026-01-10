import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

type WebhookEvent = 
  | 'extracting' 
  | 'extraction_complete' 
  | 'reviewing' 
  | 'review_complete' 
  | 'checking_technologies' 
  | 'tech_check_complete' 
  | 'completed' 
  | 'failed'

interface WebhookPayload {
  event: WebhookEvent
  job_id: string
  data: {
    progress?: number
    quality_score?: number
    technologies_found?: number
    technologies_new?: number
    result_data?: Record<string, unknown>
    error?: string
  }
  timestamp: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate webhook secret
    const secret = req.headers.get('X-Webhook-Secret')
    const expectedSecret = Deno.env.get('CASE_STUDY_WEBHOOK_SECRET')
    
    if (!secret || secret !== expectedSecret) {
      console.error('[CASE-STUDY-WEBHOOK] Unauthorized request - invalid or missing secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: WebhookPayload = await req.json()
    const { event, job_id, data, timestamp } = payload

    console.log(`[CASE-STUDY-WEBHOOK] Received event: ${event} for job: ${job_id}`)
    console.log(`[CASE-STUDY-WEBHOOK] Data:`, JSON.stringify(data))
    console.log(`[CASE-STUDY-WEBHOOK] Timestamp: ${timestamp}`)

    // Validate required fields
    if (!event) {
      return new Response(
        JSON.stringify({ error: 'event is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Map event to status
    let status: string
    switch (event) {
      case 'completed':
        status = 'completed'
        break
      case 'failed':
        status = 'failed'
        break
      default:
        status = 'processing'
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      current_phase: event,
      updated_at: new Date().toISOString(),
      status,
    }

    // Add progress if provided
    if (data?.progress !== undefined) {
      updateData.progress_percentage = data.progress
    }

    // Add quality score if provided
    if (data?.quality_score !== undefined) {
      updateData.quality_score = data.quality_score
    }

    // Add technologies found if provided
    if (data?.technologies_found !== undefined) {
      updateData.technologies_found = data.technologies_found
    }

    // Add technologies new if provided
    if (data?.technologies_new !== undefined) {
      updateData.technologies_new = data.technologies_new
    }

    // Add result_data if provided (typically on completed)
    if (data?.result_data !== undefined) {
      updateData.result_data = data.result_data
    }

    // Add error message if provided (typically on failed)
    if (data?.error) {
      updateData.error_message = data.error
    }

    // Set completed_at for terminal states
    if (event === 'completed' || event === 'failed') {
      updateData.completed_at = timestamp || new Date().toISOString()
      
      // Set started_at if not already set (edge case)
      if (event === 'completed') {
        updateData.progress_percentage = 100
      }
    }

    console.log(`[CASE-STUDY-WEBHOOK] Updating job ${job_id} with:`, JSON.stringify(updateData))

    const { error: updateError } = await supabase
      .from('case_study_jobs')
      .update(updateData)
      .eq('id', job_id)

    if (updateError) {
      console.error('[CASE-STUDY-WEBHOOK] Error updating job:', updateError)
      throw updateError
    }

    console.log(`[CASE-STUDY-WEBHOOK] Job ${job_id} updated successfully - event: ${event}, status: ${status}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id, 
        event,
        status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CASE-STUDY-WEBHOOK] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
