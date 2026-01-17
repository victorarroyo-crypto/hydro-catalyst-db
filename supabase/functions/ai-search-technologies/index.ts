import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchFilters {
  tipoId?: number | null;
  subcategoriaId?: number | null;
  sectorId?: string | null;
  tipoTecnologia?: string | null;
  subcategoria?: string | null;
  sector?: string | null;
  pais?: string | null;
  trlMin?: number | null;
  trlMax?: number | null;
  estado?: string | null;
}

// ============ CASCADE SEARCH CONSTANTS ============
// NOTE: Edge functions have execution/time limits. We keep Stage 1 lightweight.
const BLOCK_SIZE = 120;               // Smaller blocks to reduce prompt size
const STAGE1_CONCURRENCY = 2;         // Avoid rate limits/timeouts
const MAX_CANDIDATES_PER_BLOCK = 40;  // Keep inclusive but bounded
const MAX_STAGE2_CANDIDATES = 300;    // Max candidates for deep analysis
const MAX_FINAL_RESULTS = 100;        // Max final results

// Use faster model for Stage 1 pre-filtering (less critical, needs speed)
const STAGE1_MODEL = 'google/gemini-2.5-flash-lite';

// Light fields for Stage 1 pre-filtering (faster, less tokens)
const LIGHT_FIELDS = `
  id, 
  "Nombre de la tecnología", 
  "Tipo de tecnología", 
  "Subcategoría",
  "Sector y subsector",
  "Aplicación principal",
  "Descripción técnica breve"
`;

// Full fields for Stage 2 deep analysis
const FULL_FIELDS = `
  id, 
  "Nombre de la tecnología", 
  "Tipo de tecnología", 
  "Subcategoría",
  "Sector y subsector", 
  "Aplicación principal", 
  "Descripción técnica breve", 
  "Ventaja competitiva clave",
  "Porque es innovadora",
  "Casos de referencia",
  "Proveedor / Empresa", 
  "Grado de madurez (TRL)", 
  "País de origen",
  status
`;

const compactText = (v: unknown, max = 220): string | null => {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned;
};

// ============ STAGE 1: Process a single block ============
async function processBlock(
  blockTechs: any[],
  blockIndex: number,
  query: string,
  filterContext: string,
  apiKey: string,
  model: string
): Promise<{ candidateIds: string[], tokensUsed: number }> {
  
  const lightSummary = blockTechs.map(t => JSON.stringify({
    id: t.id,
    nombre: compactText(t["Nombre de la tecnología"], 120),
    tipo: compactText(t["Tipo de tecnología"], 80),
    sub: compactText(t["Subcategoría"], 80),
    sector: compactText(t["Sector y subsector"], 120),
    app: compactText(t["Aplicación principal"], 160),
    desc: compactText(t["Descripción técnica breve"], 220),
  })).join('\n');

  // Compact prompt for speed - Stage 1 just needs to be inclusive
  const prompt = `Pre-filter technologies for: "${query}"
Include ANY that MIGHT be relevant. Be inclusive. Max ${MAX_CANDIDATES_PER_BLOCK} from this block.

Technologies (JSONL):
${lightSummary}

Reply JSON only: {"candidate_ids": ["id1", ...]}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`[Block ${blockIndex}] Failed with status ${response.status}`);
      return { candidateIds: [], tokensUsed: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Robust JSON extraction - handle markdown, truncated responses, etc.
    let candidates: string[] = [];
    
    try {
      // Try 1: Direct parse
      const direct = JSON.parse(content);
      candidates = direct.candidate_ids || [];
    } catch {
      try {
        // Try 2: Extract from markdown code block
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          const parsed = JSON.parse(codeBlockMatch[1].trim());
          candidates = parsed.candidate_ids || [];
        } else {
          // Try 3: Find JSON object in text
          const jsonMatch = content.match(/\{[\s\S]*?"candidate_ids"\s*:\s*\[[\s\S]*?\]\s*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            candidates = parsed.candidate_ids || [];
          } else {
            // Try 4: Extract IDs directly from array pattern (handles truncated JSON)
            const idsMatch = content.match(/"candidate_ids"\s*:\s*\[([\s\S]*)/);
            if (idsMatch) {
              const idsStr = idsMatch[1];
              const idMatches = idsStr.match(/"([a-f0-9-]{36})"/gi);
              if (idMatches) {
                candidates = idMatches.map((m: string) => m.replace(/"/g, ''));
              }
            }
          }
        }
      } catch (innerErr) {
        // Try 5: Last resort - extract all UUID patterns
        const uuidMatches = content.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
        if (uuidMatches) {
          candidates = [...new Set(uuidMatches)] as string[];
        }
      }
    }
    
    candidates = candidates.slice(0, MAX_CANDIDATES_PER_BLOCK);
    console.log(`[Block ${blockIndex}] Found ${candidates.length} candidates (${data.usage?.total_tokens || 0} tokens)`);
    
    return { 
      candidateIds: candidates,
      tokensUsed: data.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error(`[Block ${blockIndex}] Error:`, error);
    return { candidateIds: [], tokensUsed: 0 };
  }
}

// ============ STAGE 1: Process all blocks in parallel ============
async function stage1ParallelBlocks(
  technologies: any[],
  query: string,
  filterContext: string,
  apiKey: string,
  model: string
): Promise<{ allCandidateIds: string[], totalTokens: number, blocksProcessed: number }> {
  
  // Divide into blocks
  const blocks: any[][] = [];
  for (let i = 0; i < technologies.length; i += BLOCK_SIZE) {
    blocks.push(technologies.slice(i, i + BLOCK_SIZE));
  }
  
  console.log(`[Stage 1] Processing ${blocks.length} blocks of ~${BLOCK_SIZE} techs each (${technologies.length} total)...`);

  // Process blocks in small batches to avoid network failures / rate limits
  const results: Array<{ candidateIds: string[]; tokensUsed: number }> = [];
  for (let i = 0; i < blocks.length; i += STAGE1_CONCURRENCY) {
    const batch = blocks.slice(i, i + STAGE1_CONCURRENCY);
    console.log(`[Stage 1] Batch ${Math.floor(i / STAGE1_CONCURRENCY) + 1}/${Math.ceil(blocks.length / STAGE1_CONCURRENCY)} (${batch.length} blocks)...`);

    const batchResults = await Promise.all(
      batch.map((block, offset) => {
        const index = i + offset;
        return processBlock(block, index, query, filterContext, apiKey, STAGE1_MODEL);
      })
    );
    results.push(...batchResults);
  }

  // Merge all candidates (remove duplicates)
  const allCandidateIds = [...new Set(results.flatMap(r => r.candidateIds))];
  const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

  console.log(`[Stage 1] Complete: ${allCandidateIds.length} unique candidates from ${blocks.length} blocks (${totalTokens} tokens)`);
  
  return { allCandidateIds, totalTokens, blocksProcessed: blocks.length };
}

// ============ STAGE 2: Deep analysis of candidates ============
async function stage2DeepAnalysis(
  supabase: any,
  candidateIds: string[],
  query: string,
  apiKey: string,
  model: string
): Promise<{ matching_ids: string[], explanation: string, tokensUsed: number }> {
  
  // Fetch full data ONLY for candidates
  const { data: candidates, error } = await supabase
    .from('technologies')
    .select(FULL_FIELDS)
    .in('id', candidateIds);

  if (error || !candidates?.length) {
    console.error('[Stage 2] Error fetching candidates:', error);
    return { matching_ids: [], explanation: 'No se pudieron obtener los candidatos', tokensUsed: 0 };
  }

  console.log(`[Stage 2] Deep analysis of ${candidates.length} candidates...`);

  const fullSummary = candidates.map((t: any) => JSON.stringify({
    id: t.id,
    nombre: t["Nombre de la tecnología"],
    tipo: t["Tipo de tecnología"],
    subcategoria: t["Subcategoría"] ?? null,
    sector: t["Sector y subsector"] ?? null,
    aplicacion: t["Aplicación principal"] ?? null,
    descripcion: t["Descripción técnica breve"] ?? null,
    ventaja: t["Ventaja competitiva clave"] ?? null,
    innovacion: t["Porque es innovadora"] ?? null,
    casos: t["Casos de referencia"] ?? null,
    proveedor: t["Proveedor / Empresa"] ?? null,
    pais: t["País de origen"] ?? null,
    trl: t["Grado de madurez (TRL)"] ?? null
  })).join('\n');

  const prompt = `Eres un experto en tecnologías del agua, medio ambiente e innovación industrial.

TAREA: Analiza en PROFUNDIDAD y ordena por relevancia semántica para: "${query}"

CANDIDATOS PRE-SELECCIONADOS (${candidates.length} tecnologías):
${fullSummary}

INSTRUCCIONES CRÍTICAS:
1. Analiza TODOS los campos de cada tecnología, especialmente:
   - descripcion: información técnica detallada
   - ventaja: diferenciador competitivo
   - innovacion: aspectos únicos
   - casos: referencias de implementación real
   
2. DISTINGUE claramente entre categorías:
   - SOFTWARE/herramientas digitales ≠ equipos físicos de tratamiento
   - Simulación/modelado/diseño ≠ operación/tratamiento real
   - Monitorización/sensores ≠ actuación/control

3. PRIORIZA por relevancia semántica:
   - Alta: coincidencia directa en aplicación, descripción o innovación
   - Media: coincidencia en tipo/subcategoría relacionada
   - Baja: solo coincidencia parcial en campos secundarios

4. Ordena de MAYOR a MENOR relevancia real
5. Devuelve hasta ${MAX_FINAL_RESULTS} resultados

RESPUESTA (solo JSON válido, sin markdown):
{"matching_ids": ["id1", "id2", ...], "explanation": "Criterios de ordenación aplicados..."}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Stage 2] AI error:', response.status, errorText);
      return { matching_ids: [], explanation: 'Error en análisis profundo', tokensUsed: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Extract JSON from response
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }
    
    const parsed = JSON.parse(jsonStr);
    
    console.log(`[Stage 2] Complete: ${parsed.matching_ids?.length || 0} results (${data.usage?.total_tokens || 0} tokens)`);
    
    return { 
      matching_ids: parsed.matching_ids || [],
      explanation: parsed.explanation || '',
      tokensUsed: data.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('[Stage 2] Error:', error);
    return { matching_ids: [], explanation: 'Error procesando respuesta', tokensUsed: 0 };
  }
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters } = await req.json() as { query: string; filters?: SearchFilters };
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== AI CASCADE SEARCH ===');
    console.log('Query:', query);
    console.log('Filters:', filters);

    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query with LIGHT fields for Stage 1
    let dbQuery = supabase
      .from('technologies')
      .select(LIGHT_FIELDS + `, tipo_id, subcategoria_id, sector_id`)
      .or('status.eq.approved,status.eq.active,status.is.null,status.eq.inactive,status.eq.en_revision');

    // Apply filters at database level
    if (filters) {
      if (filters.tipoId !== null && filters.tipoId !== undefined) {
        if (filters.tipoId === -1) {
          dbQuery = dbQuery.is('tipo_id', null);
        } else {
          dbQuery = dbQuery.eq('tipo_id', filters.tipoId);
        }
      }
      if (filters.subcategoriaId) {
        dbQuery = dbQuery.eq('subcategoria_id', filters.subcategoriaId);
      }
      if (filters.sectorId) {
        dbQuery = dbQuery.eq('sector_id', filters.sectorId);
      }
      if (filters.tipoTecnologia) {
        dbQuery = dbQuery.eq('Tipo de tecnología', filters.tipoTecnologia);
      }
      if (filters.subcategoria) {
        dbQuery = dbQuery.eq('Subcategoría', filters.subcategoria);
      }
      if (filters.sector) {
        dbQuery = dbQuery.eq('Sector y subsector', filters.sector);
      }
      if (filters.pais) {
        dbQuery = dbQuery.eq('País de origen', filters.pais);
      }
      if (filters.trlMin !== null && filters.trlMin !== undefined) {
        dbQuery = dbQuery.gte('"Grado de madurez (TRL)"', filters.trlMin);
      }
      if (filters.trlMax !== null && filters.trlMax !== undefined) {
        dbQuery = dbQuery.lte('"Grado de madurez (TRL)"', filters.trlMax);
      }
      if (filters.estado) {
        dbQuery = dbQuery.eq('status', filters.estado);
      }
    }

    // Fetch ALL matching technologies (in batches)
    const fetchAllFiltered = async () => {
      const allRecords: any[] = [];
      const batchSize = 1000;
      let from = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await dbQuery.range(from, from + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allRecords.push(...data);
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      return allRecords;
    };

    const technologies = await fetchAllFiltered();
    const totalCount = technologies.length;

    console.log(`Fetched ${totalCount} technologies from database`);

    // If no technologies match filters, return early
    if (totalCount === 0) {
      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'No hay tecnologías que cumplan los filtros seleccionados.',
          metadata: { total_in_db: 0, stage1_analyzed: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch the AI model to use
    const { data: modelSettings } = await supabase
      .from('ai_model_settings')
      .select('model')
      .eq('action_type', 'search')
      .single();
    
    const aiModel = modelSettings?.model || 'google/gemini-2.5-flash';
    console.log(`Using AI model: ${aiModel}`);

    // Build filter context for prompts
    const filterContext = filters ? Object.entries(filters)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') : 'ninguno';

    // ============ STAGE 1: Parallel block pre-filtering ============
    const stage1Result = await stage1ParallelBlocks(
      technologies,
      query,
      filterContext,
      LOVABLE_API_KEY,
      aiModel
    );

    // If no candidates found, return early
    if (stage1Result.allCandidateIds.length === 0) {
      const responseTimeMs = Date.now() - startTime;
      
      // Log usage
      await supabase.from('ai_usage_logs').insert({
        action_type: 'search_cascade',
        model: aiModel,
        total_tokens: stage1Result.totalTokens,
        response_time_ms: responseTimeMs,
        success: true,
      });

      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'No se encontraron tecnologías relevantes en el análisis de toda la base de datos.',
          metadata: {
            total_in_db: totalCount,
            blocks_processed: stage1Result.blocksProcessed,
            stage1_candidates: 0,
            stage2_analyzed: 0,
            total_tokens: stage1Result.totalTokens,
            response_time_ms: responseTimeMs
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STAGE 2: Deep analysis of top candidates ============
    const candidatesForStage2 = stage1Result.allCandidateIds.slice(0, MAX_STAGE2_CANDIDATES);
    
    const stage2Result = await stage2DeepAnalysis(
      supabase,
      candidatesForStage2,
      query,
      LOVABLE_API_KEY,
      aiModel
    );

    const responseTimeMs = Date.now() - startTime;
    const totalTokens = stage1Result.totalTokens + stage2Result.tokensUsed;

    // Log usage
    await supabase.from('ai_usage_logs').insert({
      action_type: 'search_cascade',
      model: aiModel,
      total_tokens: totalTokens,
      response_time_ms: responseTimeMs,
      success: true,
    });

    // Prepare final response with rich metadata
    const finalResult = {
      matching_ids: stage2Result.matching_ids.slice(0, MAX_FINAL_RESULTS),
      explanation: stage2Result.explanation,
      metadata: {
        total_in_db: totalCount,
        blocks_processed: stage1Result.blocksProcessed,
        stage1_candidates: stage1Result.allCandidateIds.length,
        stage2_analyzed: candidatesForStage2.length,
        final_results: Math.min(stage2Result.matching_ids.length, MAX_FINAL_RESULTS),
        total_tokens: totalTokens,
        response_time_ms: responseTimeMs,
        ai_model: aiModel
      }
    };

    console.log(`=== CASCADE SEARCH COMPLETE ===`);
    console.log(`Total: ${totalCount} techs → ${stage1Result.allCandidateIds.length} candidates → ${finalResult.matching_ids.length} results`);
    console.log(`Time: ${responseTimeMs}ms, Tokens: ${totalTokens}`);

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-search-technologies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
