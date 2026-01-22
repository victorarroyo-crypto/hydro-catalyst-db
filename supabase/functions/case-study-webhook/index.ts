import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// Phase labels for UI display (v13.0)
const PHASE_LABELS: Record<string, string> = {
  'accumulating': 'Recibiendo documentos...',
  'classifying': 'Clasificando documento...',
  'classification_complete': 'Documento clasificado',
  'extracting_context': 'Extrayendo contexto y problema...',
  'context_complete': 'Contexto extraído',
  'similar_found': '⚠️ Casos similares encontrados', // INFO only in v13.0
  'extracting_methodology': 'Analizando metodología...',
  'methodology_complete': 'Metodología analizada',
  'extracting_analysis': 'Análisis comparativo...',
  'analysis_complete': 'Análisis completado',
  'extracting_results': 'Extrayendo resultados...',
  'results_complete': 'Resultados extraídos',
  'extracting_lessons': 'Lecciones aprendidas...',
  'lessons_complete': 'Lecciones extraídas',
  // LEGACY v12 (deprecated in v13.0)
  'listing_technologies': 'Inventariando tecnologías...',
  'technologies_listed': 'Tecnologías listadas',
  'enriching_technologies': 'Enriqueciendo fichas técnicas...',
  'technologies_enriched': 'Fichas completadas',
  // NEW v13.0: Tech Matching por embeddings
  'matching_technologies': 'Procesando tecnologías...',
  'generating_embeddings': 'Generando embeddings...',
  'searching_database': 'Buscando en base de datos...',
  'creating_fichas': 'Creando fichas técnicas...',
  'matching_complete': 'Matching completado',
  'saving': 'Guardando caso de estudio...',
  'completed': '✅ Procesamiento completado',
  'complete': '✅ Procesamiento completado',
  'processing_complete': '✅ Procesamiento completado',
  'failed': '❌ Error en procesamiento',
  'error': '❌ Error en procesamiento',
}

// Progress percentages v13.0
const PROGRESS_MAP_V13: Record<string, number> = {
  accumulating: 0,
  classifying: 5,
  classification_complete: 10,
  extracting_context: 12,
  context_complete: 20,
  similar_found: 22,
  extracting_methodology: 25,
  methodology_complete: 28,
  extracting_analysis: 30,
  analysis_complete: 40,
  extracting_results: 42,
  results_complete: 50,
  extracting_lessons: 52,
  lessons_complete: 58,
  // LEGACY v12
  listing_technologies: 58,
  technologies_listed: 60,
  enriching_technologies: 65,
  technologies_enriched: 85,
  // NEW v13.0
  matching_technologies: 60,
  generating_embeddings: 65,
  searching_database: 70,
  creating_fichas: 80,
  matching_complete: 90,
  saving: 95,
  completed: 100,
  complete: 100,
  processing_complete: 100,
  failed: -1,
  error: -1,
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

    // Build the broadcast payload with v13.0 progress map
    const mappedProgress = PROGRESS_MAP_V13[event];
    const progressValue = data?.progress ?? mappedProgress ?? (status === 'completed' ? 100 : undefined);
    
    const broadcastPayload = {
      job_id,
      event,
      status,
      phase_label: PHASE_LABELS[event] || event,
      progress: progressValue,
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
      // v13.0: Technology counters
      total_technologies: data?.total_technologies ?? mappedTechnologies.length,
      technologies_found_in_db: data?.technologies_found_in_db ?? mappedTechnologies.filter((t: any) => t.found_in_db).length,
      technologies_new: data?.technologies_new ?? mappedTechnologies.filter((t: any) => !t.found_in_db).length,
      // v13.0: Processing time
      processing_time_seconds: data?.processing_time_seconds,
      // Similar cases
      similar_cases: similar_cases || data?.similar_cases || [],
      has_similar_cases: data?.has_similar_cases ?? (similar_cases?.length > 0 || data?.similar_cases?.length > 0),
      // Additional data from payload
      message: data?.message,
      error: data?.error,
      documents_received: data?.documents_received,
      documents_total: data?.documents_total,
      // v13.0: Embedding matching details
      current: data?.current,
      total: data?.total,
      found_in_db: data?.found_in_db,
      new_for_scouting: data?.new_for_scouting,
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
