import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// CaseStudyCrew v12.0 events + v11 + legacy v10 compatibility
type WebhookEvent = 
  // v12: Multi-documento
  | 'accumulating'
  
  // BLOQUE A: Caso de Estudio (Fases 1-6) - v11
  | 'classifying' | 'classification_complete'
  | 'extracting_context' | 'context_complete'
  | 'extracting_methodology' | 'methodology_complete'
  | 'extracting_analysis' | 'analysis_complete'
  | 'extracting_results' | 'results_complete'
  | 'extracting_lessons' | 'lessons_complete'
  
  // BLOQUE B: Tech Scouting (Fases 7-9) - v11
  | 'listing_technologies' | 'technologies_listed'
  | 'enriching_technologies' | 'technologies_enriched'
  | 'matching_technologies' | 'matching_complete'
  
  // Estados finales
  | 'saving' | 'completed' | 'complete' | 'failed' | 'error'
  
  // Legacy v10 (compatibilidad)
  | 'pending' | 'uploading' | 'extracting' | 'extraction_complete'
  | 'reviewing' | 'review_complete' | 'checking_technologies' 
  | 'tech_check_complete' | 'matching' | 'processing'

// Labels legibles para cada fase (usado solo para logs y respuesta, no se guarda en DB)
const PHASE_LABELS: Record<string, string> = {
  // v12: Multi-documento
  'accumulating': 'Recibiendo documentos...',
  
  // BLOQUE A: Caso de Estudio (Fases 1-6) - v11
  'classifying': 'Clasificando documento...',
  'classification_complete': 'Documento clasificado',
  'extracting_context': 'Extrayendo contexto y problema...',
  'context_complete': 'Contexto extraído',
  'extracting_methodology': 'Analizando metodología...',
  'methodology_complete': 'Metodología analizada',
  'extracting_analysis': 'Análisis comparativo...',
  'analysis_complete': 'Análisis completado',
  'extracting_results': 'Extrayendo resultados...',
  'results_complete': 'Resultados extraídos',
  'extracting_lessons': 'Lecciones aprendidas...',
  'lessons_complete': 'Lecciones extraídas',
  
  // BLOQUE B: Tech Scouting (Fases 7-9) - v11
  'listing_technologies': 'Inventariando tecnologías...',
  'technologies_listed': 'Tecnologías listadas',
  'enriching_technologies': 'Enriqueciendo fichas técnicas...',
  'technologies_enriched': 'Fichas completadas',
  'matching_technologies': 'Verificando en base de datos...',
  'matching_complete': 'Verificación completada',
  
  // Estados finales
  'saving': 'Guardando caso de estudio...',
  'completed': '✅ Procesamiento completado',
  'complete': '✅ Procesamiento completado',
  'failed': '❌ Error en procesamiento',
  'error': '❌ Error en procesamiento',
  
  // Legacy v10
  'pending': 'Pendiente...',
  'uploading': 'Subiendo documento...',
  'extracting': 'Extrayendo información...',
  'extraction_complete': 'Extracción completada',
  'reviewing': 'Revisando contenido...',
  'review_complete': 'Revisión completada',
  'checking_technologies': 'Verificando tecnologías...',
  'tech_check_complete': 'Tecnologías verificadas',
  'matching': 'Buscando coincidencias...',
  'processing': 'Procesando...',
}

interface WebhookPayload {
  event: WebhookEvent
  job_id: string
  data?: {
    progress?: number
    quality_score?: number
    technologies_found?: number
    technologies_new?: number
    result_data?: Record<string, unknown>
    error?: string
    message?: string
    
    // v12 campos multi-documento
    documents_received?: number  // accumulating
    documents_total?: number     // accumulating
    
    // v11 campos específicos por evento (recibidos pero no todos guardados en columnas dedicadas)
    document_type?: string       // classification_complete
    sector?: string              // classification_complete
    problem_title?: string       // context_complete
    total_technologies?: number  // technologies_listed, completed
    batch_current?: number       // enriching_technologies
    batch_total?: number         // enriching_technologies
    found_in_db?: number         // matching_complete
    new_for_scouting?: number    // matching_complete
    incomplete_skipped?: number  // matching_complete
    processing_time_seconds?: number // completed
    current_phase?: string       // error context
  }
  timestamp?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate webhook secret (case-insensitive header)
    const secret = req.headers.get('X-Webhook-Secret') || req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('CASE_STUDY_WEBHOOK_SECRET')
    
    if (expectedSecret && (!secret || secret !== expectedSecret)) {
      console.error('[CASE-STUDY-WEBHOOK] Unauthorized request - invalid or missing secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: WebhookPayload = await req.json()
    const { event, job_id, data, timestamp } = payload

    console.log(`[CASE-STUDY-WEBHOOK] ==========================================`)
    console.log(`[CASE-STUDY-WEBHOOK] Received event: "${event}" for job: ${job_id}`)
    console.log(`[CASE-STUDY-WEBHOOK] Progress: ${data?.progress}`)
    console.log(`[CASE-STUDY-WEBHOOK] Phase label: ${PHASE_LABELS[event] || event}`)
    console.log(`[CASE-STUDY-WEBHOOK] Full data:`, JSON.stringify(data || {}).slice(0, 1000))
    console.log(`[CASE-STUDY-WEBHOOK] Timestamp: ${timestamp}`)

    // Validate required fields
    if (!event) {
      console.error('[CASE-STUDY-WEBHOOK] Missing event field')
      return new Response(
        JSON.stringify({ error: 'event is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!job_id) {
      console.error('[CASE-STUDY-WEBHOOK] Missing job_id field')
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Map event to status - handle both 'complete' and 'completed'
    let status: string
    if (event === 'completed' || event === 'complete') {
      status = 'completed'
    } else if (event === 'failed' || event === 'error') {
      status = 'failed'
    } else {
      status = 'processing'
    }

    // Normalize event name for database (convert 'complete' to 'completed')
    const normalizedPhase = event === 'complete' ? 'completed' : event

    // Build update object - ONLY using existing columns in case_study_jobs:
    // status, current_phase, progress_percentage, quality_score, technologies_found, 
    // technologies_new, result_data, error_message, completed_at, updated_at
    const updateData: Record<string, unknown> = {
      current_phase: normalizedPhase,
      updated_at: new Date().toISOString(),
      status,
    }

    // Add progress if provided
    if (data?.progress !== undefined) {
      updateData.progress_percentage = Math.min(100, Math.max(0, Math.round(data.progress)))
    }

    // v12: Handle accumulating event
    if (event === 'accumulating') {
      // Only update progress based on documents received, keep status as 'processing'
      if (data?.documents_received !== undefined && data?.documents_total !== undefined) {
        // Accumulating uses 0-10% of progress bar
        updateData.progress_percentage = Math.min(10, Math.round((data.documents_received / data.documents_total) * 10))
        console.log(`[CASE-STUDY-WEBHOOK] Accumulating: ${data.documents_received}/${data.documents_total} documents`)
      }
    }

    // Technologies listed
    if (event === 'technologies_listed') {
      if (data?.total_technologies !== undefined) {
        updateData.technologies_found = data.total_technologies
      }
    }

    // Matching complete
    if (event === 'matching_complete') {
      const foundInDb = data?.found_in_db || 0
      const newForScouting = data?.new_for_scouting || 0
      updateData.technologies_found = foundInDb + newForScouting
      updateData.technologies_new = newForScouting
    }

    // Completed event - full data extraction
    if (event === 'completed' || event === 'complete') {
      updateData.completed_at = timestamp || new Date().toISOString()
      updateData.progress_percentage = 100
      
      if (data?.quality_score !== undefined) {
        updateData.quality_score = data.quality_score
      }
      if (data?.total_technologies !== undefined) {
        updateData.technologies_found = data.total_technologies
      } else if (data?.technologies_found !== undefined) {
        updateData.technologies_found = data.technologies_found
      }
      if (data?.new_for_scouting !== undefined) {
        updateData.technologies_new = data.new_for_scouting
      } else if (data?.technologies_new !== undefined) {
        updateData.technologies_new = data.technologies_new
      }
      if (data?.result_data) {
        updateData.result_data = data.result_data
      }
    }

    // Failed event
    if (event === 'failed' || event === 'error') {
      updateData.error_message = data?.error || data?.message || 'Unknown error'
    }

    // Legacy fields for backward compatibility
    if (data?.quality_score !== undefined && !updateData.quality_score) {
      updateData.quality_score = data.quality_score
    }
    if (data?.technologies_found !== undefined && !updateData.technologies_found) {
      updateData.technologies_found = data.technologies_found
    }
    if (data?.technologies_new !== undefined && !updateData.technologies_new) {
      updateData.technologies_new = data.technologies_new
    }
    if (data?.result_data !== undefined && !updateData.result_data) {
      updateData.result_data = data.result_data
    }
    if (data?.error) {
      updateData.error_message = data.error
    }

    console.log(`[CASE-STUDY-WEBHOOK] Will update job ${job_id} with:`, JSON.stringify(updateData).slice(0, 1000))

    // Perform the update
    const { data: updatedJob, error: updateError } = await supabase
      .from('case_study_jobs')
      .update(updateData)
      .eq('id', job_id)
      .select('id, progress_percentage, current_phase, status')
      .single()

    if (updateError) {
      console.error('[CASE-STUDY-WEBHOOK] Error updating job:', updateError)
      console.error('[CASE-STUDY-WEBHOOK] Error code:', updateError.code)
      console.error('[CASE-STUDY-WEBHOOK] Error details:', updateError.details)
      throw updateError
    }

    console.log(`[CASE-STUDY-WEBHOOK] Job ${job_id} updated successfully:`)
    console.log(`[CASE-STUDY-WEBHOOK]   - Progress: ${updatedJob?.progress_percentage}%`)
    console.log(`[CASE-STUDY-WEBHOOK]   - Phase: ${updatedJob?.current_phase}`)
    console.log(`[CASE-STUDY-WEBHOOK]   - Status: ${updatedJob?.status}`)
    console.log(`[CASE-STUDY-WEBHOOK] ==========================================`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id, 
        event,
        normalized_phase: normalizedPhase,
        status,
        phase_label: PHASE_LABELS[event] || event,
        updated_progress: updatedJob?.progress_percentage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CASE-STUDY-WEBHOOK] Unhandled error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
