import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// Phase labels for UI display
const PHASE_LABELS: Record<string, string> = {
  'accumulating': 'Recibiendo documentos...',
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
  'listing_technologies': 'Inventariando tecnologías...',
  'technologies_listed': 'Tecnologías listadas',
  'enriching_technologies': 'Enriqueciendo fichas técnicas...',
  'technologies_enriched': 'Fichas completadas',
  'matching_technologies': 'Verificando en base de datos...',
  'matching_complete': 'Verificación completada',
  'similar_found': 'Tecnologías similares encontradas',
  'saving': 'Guardando caso de estudio...',
  'completed': '✅ Procesamiento completado',
  'complete': '✅ Procesamiento completado',
  'processing_complete': '✅ Procesamiento completado',
  'failed': '❌ Error en procesamiento',
  'error': '❌ Error en procesamiento',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate webhook secret
    const secret = req.headers.get('X-Webhook-Secret') || req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('CASE_STUDY_WEBHOOK_SECRET')
    
    if (expectedSecret && (!secret || secret !== expectedSecret)) {
      console.error('[CASE-STUDY-WEBHOOK] Unauthorized request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the webhook payload
    const payload = await req.json()
    const { 
      event, 
      job_id, 
      data,
      timestamp,
      // v12.7+ root level fields
      caso_titulo,
      caso_cliente,
      caso_pais,
      caso_descripcion_problema,
      caso_solucion_aplicada,
      caso_resultados,
      technologies,
      quality_score,
      similar_cases,
      case_study_id,
    } = payload

    console.log(`[CASE-STUDY-WEBHOOK] ==========================================`)
    console.log(`[CASE-STUDY-WEBHOOK] Received event: "${event}" for job: ${job_id}`)
    console.log(`[CASE-STUDY-WEBHOOK] Progress: ${data?.progress}`)
    console.log(`[CASE-STUDY-WEBHOOK] Phase label: ${PHASE_LABELS[event] || event}`)
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

    // Create Supabase client for Realtime broadcast only
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determine status from event
    let status: string
    if (event === 'completed' || event === 'complete' || event === 'processing_complete') {
      status = 'completed'
    } else if (event === 'failed' || event === 'error') {
      status = 'failed'
    } else {
      status = 'processing'
    }

    // Map technologies - Railway ahora envía columnas en español directamente
    let mappedTechnologies: any[] = []
    const rawTechnologies = technologies || data?.technologies || []
    
    if (Array.isArray(rawTechnologies) && rawTechnologies.length > 0) {
      mappedTechnologies = rawTechnologies.map((tech: any) => ({
        nombre: tech.nombre || '',
        proveedor: tech.proveedor || '',
        web: tech.web || '',
        descripcion: tech.descripcion || '',
        aplicacion: tech.aplicacion || '',
        ventaja: tech.ventaja || '',
        trl: tech.trl || null,
        role: tech.role || 'evaluated',
        found_in_db: tech.found_in_db || false,
        technology_id: tech.technology_id || null,
      }))
      console.log(`[CASE-STUDY-WEBHOOK] Mapped ${mappedTechnologies.length} technologies`)
    }

    // Build the broadcast payload
    const broadcastPayload = {
      job_id,
      event,
      status,
      phase_label: PHASE_LABELS[event] || event,
      progress: data?.progress ?? (status === 'completed' ? 100 : undefined),
      timestamp: timestamp || new Date().toISOString(),
      // Case study fields (v12.7+ root level with fallbacks)
      caso_titulo: caso_titulo || data?.caso_titulo,
      caso_cliente: caso_cliente || data?.caso_cliente,
      caso_pais: caso_pais || data?.caso_pais,
      caso_descripcion_problema: caso_descripcion_problema || data?.caso_descripcion_problema,
      caso_solucion_aplicada: caso_solucion_aplicada || data?.caso_solucion_aplicada,
      caso_resultados: caso_resultados || data?.caso_resultados,
      case_study_id: case_study_id || data?.case_study_id,
      quality_score: quality_score ?? data?.quality_score,
      // Technologies
      technologies: mappedTechnologies,
      technologies_count: mappedTechnologies.length,
      // Similar cases
      similar_cases: similar_cases || data?.similar_cases || [],
      // Additional data from payload
      message: data?.message,
      error: data?.error,
      documents_received: data?.documents_received,
      documents_total: data?.documents_total,
    }

    console.log(`[CASE-STUDY-WEBHOOK] Broadcasting to channel: case-study-progress-${job_id}`)
    console.log(`[CASE-STUDY-WEBHOOK] Payload preview:`, JSON.stringify(broadcastPayload).slice(0, 500))

    // Broadcast via Supabase Realtime to job-specific channel
    const channel = supabase.channel(`case-study-progress-${job_id}`)
    
    await channel.send({
      type: 'broadcast',
      event: 'progress',
      payload: broadcastPayload,
    })

    console.log(`[CASE-STUDY-WEBHOOK] ✅ Broadcast sent successfully`)
    console.log(`[CASE-STUDY-WEBHOOK] ==========================================`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id, 
        event,
        status,
        phase_label: PHASE_LABELS[event] || event,
        broadcast_channel: `case-study-progress-${job_id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CASE-STUDY-WEBHOOK] ============ ERROR ============')
    console.error('[CASE-STUDY-WEBHOOK] Error:', error)
    
    if (error instanceof Error) {
      console.error('[CASE-STUDY-WEBHOOK] Message:', error.message)
      console.error('[CASE-STUDY-WEBHOOK] Stack:', error.stack)
    }
    
    console.error('[CASE-STUDY-WEBHOOK] ===============================')
    
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ 
        error: message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
