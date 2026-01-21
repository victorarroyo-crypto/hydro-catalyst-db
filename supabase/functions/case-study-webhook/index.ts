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
  | 'similar_found'  // Casos similares encontrados
  | 'user_decision'  // Frontend user decision (create new / merge)
  
  // Estados finales
  | 'saving' | 'completed' | 'complete' | 'processing_complete' | 'failed' | 'error'
  
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
  'similar_found': 'Tecnologías similares encontradas',  // NEW
  
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

// Interface for similar cases found
interface SimilarCase {
  id: string;
  name: string;
  similarity: number;
  sector?: string;
  country?: string;
}

interface WebhookPayload {
  event: WebhookEvent
  job_id: string
  
  // ═══════════════════════════════════════════════════════════════════
  // v12.7+ ROOT LEVEL FIELDS - CaseStudyCrew sends these at payload root
  // ═══════════════════════════════════════════════════════════════════
  caso_titulo?: string
  caso_cliente?: string
  caso_pais?: string
  caso_descripcion_problema?: string
  caso_solucion_aplicada?: string
  caso_resultados?: string
  technologies?: RailwayTechnologyFlat[]
  quality_score?: number
  similar_cases?: SimilarCase[]
  case_study_id?: string  // UUID del caso en Railway
  
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
    
    // v11 campos específicos por evento
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
    
    // similar_found event - for similar CASE STUDIES
    similar_cases?: SimilarCase[]
    current_problem?: string
    has_similar_cases?: boolean  // v12.4: included in completed event
    
    // user_decision event - frontend user decision
    decision?: 'create_new' | 'merge'
    merge_target_id?: string
    
    // Legacy: v13 ESTRUCTURA PLANA en data (backward compat)
    caso_titulo?: string
    caso_cliente?: string
    caso_pais?: string
    caso_descripcion_problema?: string
    caso_solucion_aplicada?: string
    caso_resultados?: string
    technologies?: RailwayTechnologyFlat[]
    case_study_id?: string
    technologies_found_in_db?: number
  }
  timestamp?: string
}

// v13: Estructura PLANA de Railway - campos directamente en el objeto
interface RailwayTechnologyFlat {
  nombre: string;
  proveedor?: string;
  web?: string;
  aplicacion?: string;
  descripcion?: string;
  ventaja?: string;
  innovacion?: string;
  comentarios?: string;
  referencias?: string;
  rol?: string;
  found_in_db?: boolean;
  technology_id?: string;  // Solo si found_in_db=true
}

// Legacy: Estructura anidada (para backward compatibility)
interface RailwayTechnologyNew {
  name: string;
  provider?: string;
  ficha: {
    nombre: string;
    proveedor?: string;
    web?: string;
    aplicacion?: string;
    descripcion?: string;
    ventaja?: string;
    innovacion?: string;
    comentarios?: string;
    referencias?: string;
  };
}

// Legacy: case_summary anidado
interface RailwayCaseSummary {
  titulo?: string;
  cliente?: string;
  pais?: string;
  descripcion?: string;
  soluciones?: string;
  resultados?: string;
}

// Function to queue FLAT technologies for scouting (v13)
// deno-lint-ignore no-explicit-any
async function queueFlatTechnologiesForScouting(
  supabase: any,
  caseStudyId: string | null,
  technologies: RailwayTechnologyFlat[]
): Promise<{ inserted: number; skipped: number; failed: number }> {
  console.log(`[CASE-STUDY-WEBHOOK] Queueing ${technologies.length} FLAT technologies...`);
  
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const tech of technologies) {
    // Skip technologies already in DB
    if (tech.found_in_db) {
      console.log(`[CASE-STUDY-WEBHOOK] ⏭️ Skipping "${tech.nombre}" - already in DB`);
      skipped++;
      continue;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EXTRAER DATOS DE ficha.* SI NO EXISTEN EN NIVEL RAÍZ
    // ═══════════════════════════════════════════════════════════════════
    const ficha = (tech as any).ficha || {};
    
    const insertData: Record<string, unknown> = {
      "Nombre de la tecnología": tech.nombre || ficha.nombre || (tech as any).technology_name,
      "Proveedor / Empresa": tech.proveedor || ficha.proveedor || (tech as any).provider || null,
      "Web de la empresa": tech.web || ficha.web || null,
      "Aplicación principal": tech.aplicacion || ficha.aplicacion || null,
      "Descripción técnica breve": tech.descripcion || ficha.descripcion || null,
      "Ventaja competitiva clave": tech.ventaja || ficha.ventaja || null,
      "Porque es innovadora": tech.innovacion || ficha.innovacion || null,
      "Comentarios del analista": tech.comentarios || ficha.comentarios || `Rol: ${tech.rol || ficha.rol || 'No especificado'}`,
      "Casos de referencia": tech.referencias || ficha.referencias || null,
      source: 'case_study',
      priority: 'normal',
      queue_status: 'pending',
      case_study_id: caseStudyId,
    };
    
    console.log(`[CASE-STUDY-WEBHOOK] Inserting tech: "${insertData["Nombre de la tecnología"]}", proveedor: "${insertData["Proveedor / Empresa"]}", web: "${insertData["Web de la empresa"]}"`);
    

    const { error } = await supabase.from('scouting_queue').insert(insertData);
    
    if (error) {
      console.error(`[CASE-STUDY-WEBHOOK] ❌ Failed: "${tech.nombre}": ${error.message}`);
      failed++;
    } else {
      console.log(`[CASE-STUDY-WEBHOOK] ✅ Queued: "${tech.nombre}"`);
      inserted++;
    }
  }

  console.log(`[CASE-STUDY-WEBHOOK] Result: ${inserted} inserted, ${skipped} skipped (in DB), ${failed} failed`);
  return { inserted, skipped, failed };
}

// Legacy function for nested structure
// deno-lint-ignore no-explicit-any
async function queueTechnologiesForScouting(
  supabase: any,
  caseStudyId: string | null,
  technologies: RailwayTechnologyNew[]
): Promise<{ inserted: number; failed: number }> {
  console.log(`[CASE-STUDY-WEBHOOK] Queueing ${technologies.length} NESTED technologies (legacy)...`);
  
  let inserted = 0;
  let failed = 0;

  for (const tech of technologies) {
    const ficha = tech.ficha || {};
    
    const insertData: Record<string, unknown> = {
      "Nombre de la tecnología": ficha.nombre || tech.name,
      "Proveedor / Empresa": ficha.proveedor || tech.provider || null,
      "Web de la empresa": ficha.web || null,
      "Aplicación principal": ficha.aplicacion || null,
      "Descripción técnica breve": ficha.descripcion || null,
      "Ventaja competitiva clave": ficha.ventaja || null,
      "Porque es innovadora": ficha.innovacion || null,
      "Comentarios del analista": ficha.comentarios || `Extraído de caso de estudio`,
      "Casos de referencia": ficha.referencias || null,
      source: 'case_study',
      priority: 'normal',
      queue_status: 'pending',
      case_study_id: caseStudyId,
    };

    const { error } = await supabase.from('scouting_queue').insert(insertData);
    
    if (error) {
      console.error(`[CASE-STUDY-WEBHOOK] ❌ Failed: "${tech.name}": ${error.message}`);
      failed++;
    } else {
      console.log(`[CASE-STUDY-WEBHOOK] ✅ Queued: "${ficha.nombre || tech.name}"`);
      inserted++;
    }
  }

  return { inserted, failed };
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
    
    // ═══════════════════════════════════════════════════════════════════
    // v12.7+ ROOT LEVEL EXTRACTION - Read fields from payload root first
    // ═══════════════════════════════════════════════════════════════════
    const rootCasoTitulo = payload.caso_titulo;
    const rootCasoCliente = payload.caso_cliente;
    const rootCasoPais = payload.caso_pais;
    const rootCasoDescripcion = payload.caso_descripcion_problema;
    const rootCasoSolucion = payload.caso_solucion_aplicada;
    const rootCasoResultados = payload.caso_resultados;
    const rootTechnologies = payload.technologies;
    const rootQualityScore = payload.quality_score;
    const rootSimilarCases = payload.similar_cases;

    console.log(`[CASE-STUDY-WEBHOOK] ==========================================`)
    console.log(`[CASE-STUDY-WEBHOOK] Received event: "${event}" for job: ${job_id}`)
    console.log(`[CASE-STUDY-WEBHOOK] Progress: ${data?.progress}`)
    console.log(`[CASE-STUDY-WEBHOOK] Phase label: ${PHASE_LABELS[event] || event}`)
    console.log(`[CASE-STUDY-WEBHOOK] ROOT-level caso_titulo: ${rootCasoTitulo?.slice(0, 50) || 'null'}`)
    console.log(`[CASE-STUDY-WEBHOOK] ROOT-level technologies: ${rootTechnologies?.length || 0} items`)
    console.log(`[CASE-STUDY-WEBHOOK] ROOT-level quality_score: ${rootQualityScore}`)
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

    // Map event to status - handle 'complete', 'completed', and 'processing_complete'
    let status: string
    if (event === 'completed' || event === 'complete' || event === 'processing_complete') {
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

    // Handle similar_found event - Railway v12.4+ sends this as INFO only (non-blocking)
    // Railway CONTINUES processing after sending this, no user decision required before completion
    if (event === 'similar_found') {
      const similarCases = data?.similar_cases as SimilarCase[] | undefined;
      const currentProblem = data?.current_problem;
      
      if (Array.isArray(similarCases) && similarCases.length > 0) {
        console.log(`[CASE-STUDY-WEBHOOK] similar_found (INFO): ${similarCases.length} similar cases detected`);
        
        // Get existing job to preserve result_data
        const { data: existingJobArr } = await supabase
          .from('case_study_jobs')
          .select('result_data, case_study_id')
          .eq('id', job_id)
        
        const existingJob = existingJobArr?.[0]
        const existingResultData = (existingJob?.result_data as Record<string, unknown>) || {};
        
        // v12.4: Store as preview info ONLY - DO NOT change status to awaiting_user_decision
        // Railway continues processing automatically, merge decision happens POST-creation
        updateData.result_data = {
          ...existingResultData,
          similar_cases_preview: similarCases,
          current_problem_preview: currentProblem,
          similar_found_at: new Date().toISOString(),
        };
        
        console.log(`[CASE-STUDY-WEBHOOK] similar_found: INFO stored, Railway continues processing`);
        console.log(`[CASE-STUDY-WEBHOOK] Similar cases preview:`, JSON.stringify(similarCases));
        
        // Also handle legacy technology queuing if technologies are provided
        const technologies = data?.technologies as RailwayTechnologyNew[] | undefined;
        if (Array.isArray(technologies) && technologies.length > 0) {
          const result = await queueTechnologiesForScouting(
            supabase,
            existingJob?.case_study_id || null,
            technologies
          );
          console.log(`[CASE-STUDY-WEBHOOK] similar_found: ${result.inserted}/${technologies.length} technologies queued`);
        }
      }
    }

    // Handle user_decision event from frontend - v12.4: POST-creation merge decision
    // This is now used for merging AFTER the case has already been created
    if (event === 'user_decision') {
      const decision = data?.decision;
      const mergeTargetId = data?.merge_target_id;
      
      console.log(`[CASE-STUDY-WEBHOOK] user_decision (POST-creation): ${decision}, merge_target_id: ${mergeTargetId}`);
      
      // Get existing job to preserve result_data
      const { data: existingJobArr } = await supabase
        .from('case_study_jobs')
        .select('result_data, case_study_id')
        .eq('id', job_id)
      
      const existingJob = existingJobArr?.[0]
      const existingResultData = (existingJob?.result_data as Record<string, unknown>) || {};
      
      // Store the merge decision in result_data (case already exists)
      updateData.result_data = {
        ...existingResultData,
        merge_decision: decision,
        merge_target_id: mergeTargetId || null,
        merge_decision_made_at: new Date().toISOString(),
      };
      
      // TODO: If merge, implement actual case merging logic
      // For now, we just record the decision
      console.log(`[CASE-STUDY-WEBHOOK] POST-creation decision: ${decision === 'merge' ? `merge with ${mergeTargetId}` : 'keep both cases'}`);
    }

    // Completed event - full data extraction (handles completed, complete, processing_complete)
    if (event === 'completed' || event === 'complete' || event === 'processing_complete') {
      updateData.completed_at = timestamp || new Date().toISOString()
      updateData.progress_percentage = 100
      
      // ═══════════════════════════════════════════════════════════════════
      // v12.7+ READ FROM ROOT LEVEL FIRST, fallback to data.*
      // ═══════════════════════════════════════════════════════════════════
      const finalQualityScore = rootQualityScore ?? data?.quality_score;
      if (finalQualityScore !== undefined) {
        updateData.quality_score = finalQualityScore
      }
      
      // Technologies count - check root first, then data
      const finalTechnologiesCount = rootTechnologies?.length ?? data?.total_technologies ?? data?.technologies_found;
      if (finalTechnologiesCount !== undefined) {
        updateData.technologies_found = finalTechnologiesCount
      }
      
      if (data?.new_for_scouting !== undefined) {
        updateData.technologies_new = data.new_for_scouting
      } else if (data?.technologies_new !== undefined) {
        updateData.technologies_new = data.technologies_new
      }
      
      // Store all data in result_data (MERGE with existing), without filtering fields
      if (data) {
        // Fetch existing job to preserve previous result_data accumulated across events
        const { data: existingJobArr } = await supabase
          .from('case_study_jobs')
          .select('result_data')
          .eq('id', job_id)

        const existingJob = existingJobArr?.[0]
        const existingResultData = (existingJob?.result_data as Record<string, unknown>) || {};

        // ✅ FIX: Railway puede enviar data.result_data anidado - aplanarlo
        // Si data tiene un campo "result_data", extraer su contenido al nivel raíz
        const nestedResultData = (data as any).result_data as Record<string, unknown> | undefined;
        
        // Construir result_data aplanado:
        // 1. Mantener datos existentes
        // 2. Copiar campos directos de data (excepto result_data anidado)
        // 3. Aplanar contenido de data.result_data si existe
        const { result_data: _nested, ...dataWithoutNested } = data as any;
        
        // ═══════════════════════════════════════════════════════════════════
        // v12.7+ MAPEO Railway → UI: READ FROM ROOT LEVEL FIRST
        // Campos ahora vienen en payload.caso_titulo, NO payload.data.caso_titulo
        // ═══════════════════════════════════════════════════════════════════
        const rawData = { ...dataWithoutNested, ...(nestedResultData || {}) };
        
        // Use ROOT-level fields with fallback to data.* for backward compatibility
        const finalCasoTitulo = rootCasoTitulo || rawData.caso_titulo || '';
        const finalCasoCliente = rootCasoCliente || rawData.caso_cliente || '';
        const finalCasoPais = rootCasoPais || rawData.caso_pais || '';
        const finalCasoDescripcion = rootCasoDescripcion || rawData.caso_descripcion_problema || '';
        const finalCasoSolucion = rootCasoSolucion || rawData.caso_solucion_aplicada || '';
        const finalCasoResultados = rootCasoResultados || rawData.caso_resultados || '';
        
        // 🔍 DEBUG: Ver estructura exacta de datos recibidos
        console.log('[WEBHOOK] ============ DEBUG v12.7 ROOT FIELDS ============');
        console.log('[WEBHOOK] ROOT caso_titulo:', rootCasoTitulo?.slice(0, 50) || 'null');
        console.log('[WEBHOOK] ROOT caso_cliente:', rootCasoCliente || 'null');
        console.log('[WEBHOOK] ROOT caso_pais:', rootCasoPais || 'null');
        console.log('[WEBHOOK] ROOT technologies count:', rootTechnologies?.length || 0);
        console.log('[WEBHOOK] ROOT quality_score:', rootQualityScore);
        console.log('[WEBHOOK] dataWithoutNested keys:', Object.keys(dataWithoutNested));
        console.log('[WEBHOOK] nestedResultData keys:', nestedResultData ? Object.keys(nestedResultData as object) : 'null');
        console.log('[WEBHOOK] rawData keys:', Object.keys(rawData));
        console.log('[WEBHOOK] FINAL caso_titulo:', finalCasoTitulo?.slice(0, 50) || 'empty');
        
        // Log technologies from root
        if (rootTechnologies) {
          console.log('[WEBHOOK] ROOT technologies preview:', 
            JSON.stringify(rootTechnologies)?.slice(0, 500) || 'undefined'
          );
        }
        
        const extractedForUI = {
          title: finalCasoTitulo,
          sector: finalCasoCliente,
          country: finalCasoPais,
          problem: {
            description: finalCasoDescripcion,
            parameters: [],
          },
          solution: {
            description: finalCasoSolucion,
            treatment_train: [],
          },
          results: {
            description: finalCasoResultados,
          },
        };
        
        // ═══════════════════════════════════════════════════════════════════
        // v12.7+ TECHNOLOGIES: CHECK ROOT LEVEL FIRST (payload.technologies)
        // ═══════════════════════════════════════════════════════════════════
        let rawTechnologies: any[] = [];
        
        // 0. PRIORITY: Check ROOT level (v12.7+)
        if (Array.isArray(rootTechnologies) && rootTechnologies.length > 0) {
          rawTechnologies = rootTechnologies;
          console.log('[WEBHOOK] ✅ Found technologies in ROOT payload:', rawTechnologies.length);
        }
        // 1. Fallback: buscar directamente en data
        else if (Array.isArray((data as any).technologies)) {
          rawTechnologies = (data as any).technologies;
          console.log('[WEBHOOK] ✅ Found technologies in data (flat array):', rawTechnologies.length);
        }
        // 2. Si no, buscar en rawData (combinación de data + nestedResultData)
        else if (Array.isArray(rawData.technologies)) {
          rawTechnologies = rawData.technologies as any[];
          console.log('[WEBHOOK] ✅ Found technologies in rawData:', rawTechnologies.length);
        }
        // 3. Si es objeto, extraer arrays internos (technologies_found, technologies_new)
        else if (rawData.technologies && typeof rawData.technologies === 'object') {
          const techObj = rawData.technologies as any;
          console.log('[WEBHOOK] technologies is object, keys:', Object.keys(techObj));
          
          if (Array.isArray(techObj.technologies_found)) {
            rawTechnologies = [...rawTechnologies, ...techObj.technologies_found];
            console.log('[WEBHOOK] Extracted technologies_found:', techObj.technologies_found.length);
          }
          if (Array.isArray(techObj.technologies_new)) {
            rawTechnologies = [...rawTechnologies, ...techObj.technologies_new];
            console.log('[WEBHOOK] Extracted technologies_new:', techObj.technologies_new.length);
          }
          if (Array.isArray(techObj.items)) {
            rawTechnologies = [...rawTechnologies, ...techObj.items];
            console.log('[WEBHOOK] Extracted technologies.items:', techObj.items.length);
          }
        }
        // 4. Buscar en nestedResultData directamente
        else if (nestedResultData && Array.isArray((nestedResultData as any).technologies)) {
          rawTechnologies = (nestedResultData as any).technologies;
          console.log('[WEBHOOK] ✅ Found technologies in nestedResultData:', rawTechnologies.length);
        }
        
        console.log('[WEBHOOK] FINAL rawTechnologies count:', rawTechnologies.length);
        if (rawTechnologies.length > 0) {
          console.log('[WEBHOOK] First technology sample:', JSON.stringify(rawTechnologies[0])?.slice(0, 300));
        }
        console.log('[WEBHOOK] ============================================');
        
        // Mapear tecnologías Railway → UI (español → inglés)
        // ═══════════════════════════════════════════════════════════════════
        // IMPORTANTE: Los datos pueden venir en tech.ficha.* o directamente en tech.*
        // ═══════════════════════════════════════════════════════════════════
        const mappedTechnologies = rawTechnologies.map((tech: any) => {
          const ficha = tech.ficha || {};
          return {
            name: tech.nombre || ficha.nombre || tech.name || tech.technology_name || '',
            provider: tech.proveedor || ficha.proveedor || tech.provider || '',
            website: tech.web || ficha.web || tech.website || '',
            description: tech.descripcion || ficha.descripcion || tech.description || '',
            role: tech.rol || ficha.rol || tech.role || 'identified',
            trl: tech.trl || ficha.trl || null,
            application: tech.aplicacion || ficha.aplicacion || tech.application || '',
            advantage: tech.ventaja || ficha.ventaja || tech.advantage || '',
            innovation: tech.innovacion || ficha.innovacion || tech.innovation || '',
            references: tech.referencias || ficha.referencias || tech.references || '',
            comments: tech.comentarios || ficha.comentarios || tech.comments || '',
            found_in_db: tech.found_in_db || false,
            technology_id: tech.technology_id || null,
            // Mantener campos originales por compatibilidad (extraer de ficha si no existen)
            nombre: tech.nombre || ficha.nombre,
            proveedor: tech.proveedor || ficha.proveedor,
            web: tech.web || ficha.web,
            descripcion: tech.descripcion || ficha.descripcion,
          };
        });
        
        // ═══════════════════════════════════════════════════════════════════
        // v12.7+ SIMILAR_CASES: CHECK ROOT LEVEL FIRST (payload.similar_cases)
        // ═══════════════════════════════════════════════════════════════════
        let rawSimilarCases: any[] = [];
        
        // 0. PRIORITY: Check ROOT level (v12.7+)
        if (Array.isArray(rootSimilarCases) && rootSimilarCases.length > 0) {
          rawSimilarCases = rootSimilarCases;
          console.log('[WEBHOOK] ✅ Found similar_cases in ROOT payload:', rawSimilarCases.length);
        }
        // 1. Fallback: buscar en data
        else if (Array.isArray((data as any).similar_cases)) {
          rawSimilarCases = (data as any).similar_cases;
          console.log('[WEBHOOK] ✅ Found similar_cases in data:', rawSimilarCases.length);
        } 
        // 2. Buscar en rawData
        else if (Array.isArray(rawData.similar_cases)) {
          rawSimilarCases = rawData.similar_cases as any[];
          console.log('[WEBHOOK] ✅ Found similar_cases in rawData:', rawSimilarCases.length);
        } 
        // 3. Buscar en nestedResultData
        else if (nestedResultData && Array.isArray((nestedResultData as any).similar_cases)) {
          rawSimilarCases = (nestedResultData as any).similar_cases;
          console.log('[WEBHOOK] ✅ Found similar_cases in nestedResultData:', rawSimilarCases.length);
        }
        
        updateData.result_data = {
          ...existingResultData,
          ...rawData,
          // Estructura mapeada para UI
          extracted: extractedForUI,
          technologies: mappedTechnologies,
          similar_cases: rawSimilarCases,
          has_similar_cases: rawSimilarCases.length > 0,
        };

        // Debug logs
        console.log('[WEBHOOK] Mapped extracted for UI:', {
          title: extractedForUI.title?.slice(0, 50),
          sector: extractedForUI.sector,
          country: extractedForUI.country,
        });
        console.log('[WEBHOOK] Mapped technologies count:', mappedTechnologies.length);
        console.log('[WEBHOOK] has_similar_cases:', rawSimilarCases.length > 0);
        console.log('[WEBHOOK] similar_cases count:', rawSimilarCases.length);
      }

      // Log para debug (legacy logs)
      console.log('[CASE-STUDY-WEBHOOK] ═══════════════════════════════════════════');
      console.log('[CASE-STUDY-WEBHOOK] COMPLETED EVENT - Procesando datos...');
      console.log('[CASE-STUDY-WEBHOOK] data keys:', data ? Object.keys(data) : 'none');

      // Get case_study_id from job
      const { data: jobDataArr } = await supabase
        .from('case_study_jobs')
        .select('case_study_id')
        .eq('id', job_id)

      const jobData = jobDataArr?.[0]
      const caseStudyId = jobData?.case_study_id || null;
      console.log('[CASE-STUDY-WEBHOOK] case_study_id:', caseStudyId);
      
      // ═══════════════════════════════════════════════════════════════════
      // v12.7+ DETECTAR ESTRUCTURA - Campos en ROOT o en data
      // ═══════════════════════════════════════════════════════════════════
      const hasRootFields = !!(rootCasoTitulo || rootCasoDescripcion || rootTechnologies);
      const hasDataFields = !!(data?.caso_titulo || data?.caso_descripcion_problema || data?.technologies);
      const isV12Plus = hasRootFields || hasDataFields;
      
      console.log('[CASE-STUDY-WEBHOOK] Estructura detectada:', 
        hasRootFields ? 'v12.7+ ROOT LEVEL' : 
        hasDataFields ? 'v13 en data.*' : 'Legacy anidada');
      
      if (isV12Plus) {
        // ════════════════════════════════════════════════════════════════
        // PROCESO 1: Campos del caso - USE ROOT LEVEL FIRST
        // ════════════════════════════════════════════════════════════════
        console.log('[CASE-STUDY-WEBHOOK] Procesando campos caso_* (v12.7+)...');
        
        if (caseStudyId) {
          const caseUpdateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          
          // Use ROOT-level fields with fallback to data.*
          const titleToSave = rootCasoTitulo || data?.caso_titulo;
          const clienteToSave = rootCasoCliente || data?.caso_cliente;
          const paisToSave = rootCasoPais || data?.caso_pais;
          const descripcionToSave = rootCasoDescripcion || data?.caso_descripcion_problema;
          const solucionToSave = rootCasoSolucion || data?.caso_solucion_aplicada;
          const resultadosToSave = rootCasoResultados || data?.caso_resultados;
          
          if (titleToSave) {
            caseUpdateData.name = titleToSave;
            console.log('[CASE-STUDY-WEBHOOK] → name:', titleToSave.slice(0, 80) + '...');
          }
          if (clienteToSave) {
            caseUpdateData.entity_type = clienteToSave;
            console.log('[CASE-STUDY-WEBHOOK] → entity_type:', clienteToSave);
          }
          if (paisToSave) {
            caseUpdateData.country = paisToSave;
            console.log('[CASE-STUDY-WEBHOOK] → country:', paisToSave);
          }
          if (descripcionToSave) {
            caseUpdateData.description = descripcionToSave;
            console.log('[CASE-STUDY-WEBHOOK] → description:', descripcionToSave.slice(0, 80) + '...');
          }
          if (solucionToSave) {
            caseUpdateData.solution_applied = solucionToSave;
            console.log('[CASE-STUDY-WEBHOOK] → solution_applied:', solucionToSave.slice(0, 80) + '...');
          }
          if (resultadosToSave) {
            caseUpdateData.results_achieved = resultadosToSave;
            console.log('[CASE-STUDY-WEBHOOK] → results_achieved:', resultadosToSave.slice(0, 80) + '...');
          }
          
          // ═══════════════════════════════════════════════════════════════════
          // GUARDAR original_data CON TODO EL PAYLOAD COMPLETO
          // ═══════════════════════════════════════════════════════════════════
          caseUpdateData.original_data = {
            ...payload,
            _webhook_received_at: new Date().toISOString(),
            _event: event,
          };
          console.log('[CASE-STUDY-WEBHOOK] → original_data: payload completo guardado');
          
          const fieldsToUpdate = Object.keys(caseUpdateData).length - 1;
          if (fieldsToUpdate > 0) {
            const { error: caseError } = await supabase
              .from('casos_de_estudio')
              .update(caseUpdateData)
              .eq('id', caseStudyId);
            
            if (caseError) {
              console.error('[CASE-STUDY-WEBHOOK] ❌ Error actualizando caso:', caseError.message);
            } else {
              console.log(`[CASE-STUDY-WEBHOOK] ✅ Caso actualizado: ${fieldsToUpdate} campos (incl. original_data)`);
            }
          }
        }
        
        // ════════════════════════════════════════════════════════════════
        // PROCESO 2: Tecnologías - USE ROOT LEVEL FIRST
        // ════════════════════════════════════════════════════════════════
        const techsToQueue = rootTechnologies || data?.technologies as RailwayTechnologyFlat[] | undefined;
        console.log('[CASE-STUDY-WEBHOOK] technologies array:', techsToQueue?.length || 0, 'items');
        
        if (Array.isArray(techsToQueue) && techsToQueue.length > 0) {
          console.log('[CASE-STUDY-WEBHOOK] Primera tecnología:', JSON.stringify(techsToQueue[0]).slice(0, 400));
          
          const result = await queueFlatTechnologiesForScouting(
            supabase,
            caseStudyId,
            techsToQueue
          );
          console.log(`[CASE-STUDY-WEBHOOK] ✅ Tecnologías: ${result.inserted} nuevas, ${result.skipped} existentes, ${result.failed} fallidas`);
        } else {
          console.log('[CASE-STUDY-WEBHOOK] ⚠️ No hay technologies en ROOT ni data');
        }
        
      } else if (data?.result_data) {
        // ════════════════════════════════════════════════════════════════
        // LEGACY: Estructura anidada (result_data.technologies.technologies_new)
        // ════════════════════════════════════════════════════════════════
        console.log('[CASE-STUDY-WEBHOOK] Procesando estructura LEGACY anidada...');
        console.log('[CASE-STUDY-WEBHOOK] result_data keys:', Object.keys(data.result_data));
        
        // Tecnologías legacy
        const technologiesData = data.result_data?.technologies as { 
          technologies_new?: RailwayTechnologyNew[];
        } | undefined;
        
        const technologiesNew = technologiesData?.technologies_new;
        if (Array.isArray(technologiesNew) && technologiesNew.length > 0) {
          const result = await queueTechnologiesForScouting(
            supabase,
            caseStudyId,
            technologiesNew
          );
          console.log(`[CASE-STUDY-WEBHOOK] Legacy: ${result.inserted} queued`);
        }
        
        // Case summary legacy
        const caseSummary = data.result_data?.case_summary as RailwayCaseSummary | undefined;
        if (caseSummary && caseStudyId) {
          const caseUpdateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          
          if (caseSummary.titulo) caseUpdateData.name = caseSummary.titulo;
          if (caseSummary.cliente) caseUpdateData.entity_type = caseSummary.cliente;
          if (caseSummary.pais) caseUpdateData.country = caseSummary.pais;
          if (caseSummary.descripcion) caseUpdateData.description = caseSummary.descripcion;
          if (caseSummary.soluciones) caseUpdateData.solution_applied = caseSummary.soluciones;
          if (caseSummary.resultados) caseUpdateData.results_achieved = caseSummary.resultados;
          
          await supabase
            .from('casos_de_estudio')
            .update(caseUpdateData)
            .eq('id', caseStudyId);
          
          console.log('[CASE-STUDY-WEBHOOK] Legacy case_summary applied');
        }
      }
      
      console.log('[CASE-STUDY-WEBHOOK] ═══════════════════════════════════════════');
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

    // First check if the job exists
    const { data: existingJobCheck, error: checkError } = await supabase
      .from('case_study_jobs')
      .select('id')
      .eq('id', job_id)
      .maybeSingle()

    if (checkError) {
      console.error('[CASE-STUDY-WEBHOOK] Error checking job existence:', checkError)
    }

    if (!existingJobCheck) {
      console.warn(`[CASE-STUDY-WEBHOOK] ⚠️ Job ${job_id} not found in database - skipping update`)
      console.warn(`[CASE-STUDY-WEBHOOK] This may happen if the job was created in Railway but not yet synced to Supabase`)
      
      // Return success anyway to not block Railway's webhook retry
      return new Response(
        JSON.stringify({ 
          success: false, 
          warning: 'Job not found',
          job_id, 
          event,
          message: 'Job does not exist in database yet. This webhook event was acknowledged but not processed.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform the update - use select() without .single() to avoid PGRST116 error
    const { data: updatedJobs, error: updateError } = await supabase
      .from('case_study_jobs')
      .update(updateData)
      .eq('id', job_id)
      .select('id, progress_percentage, current_phase, status')

    if (updateError) {
      console.error('[CASE-STUDY-WEBHOOK] Error updating job:', updateError)
      console.error('[CASE-STUDY-WEBHOOK] Error code:', updateError.code)
      console.error('[CASE-STUDY-WEBHOOK] Error details:', updateError.details)
      throw updateError
    }

    const updatedJob = updatedJobs?.[0]
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
    console.error('[CASE-STUDY-WEBHOOK] ============ UNHANDLED ERROR ============')
    console.error('[CASE-STUDY-WEBHOOK] Error object:', error)
    
    if (error instanceof Error) {
      console.error('[CASE-STUDY-WEBHOOK] Error message:', error.message)
      console.error('[CASE-STUDY-WEBHOOK] Error stack:', error.stack)
    }
    
    // Try to get request body for debugging
    try {
      const bodyText = await req.text?.() || 'Unable to read body'
      console.error('[CASE-STUDY-WEBHOOK] Request body preview:', bodyText.slice(0, 1000))
    } catch {
      console.error('[CASE-STUDY-WEBHOOK] Could not read request body')
    }
    
    console.error('[CASE-STUDY-WEBHOOK] =========================================')
    
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    
    return new Response(
      JSON.stringify({ 
        error: message, 
        stack: stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
