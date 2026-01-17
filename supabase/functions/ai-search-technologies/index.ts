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

// ============ CONSTANTS ============
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_FINAL_RESULTS = 100;

// ============ Extract keywords using AI ============
async function extractKeywords(query: string, apiKey: string, model: string): Promise<string[]> {
  const prompt = `Extrae 8-12 palabras clave de búsqueda para esta consulta sobre tecnologías:

"${query}"

Incluye:
- Términos técnicos específicos
- Tipos de tecnología (ej: sensores, membranas, IoT, IA)
- Procesos/aplicaciones (ej: tratamiento, detección, modelado)
- Sectores si se mencionan
- Variantes en español e inglés si aplica

Responde SOLO con un JSON array de strings:
["keyword1", "keyword2", ...]`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fast model for keyword extraction
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        console.warn("[extractKeywords] Rate limited, using fallback");
      } else if (status === 402) {
        console.warn("[extractKeywords] Payment required, using fallback");
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const keywords = JSON.parse(jsonMatch[0]);
      console.log("[extractKeywords] AI extracted:", keywords);
      return keywords;
    }
    
    throw new Error("Could not parse keywords");
  } catch (error) {
    console.error("[extractKeywords] Error:", error);
    // Fallback: basic extraction
    return query
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 12);
  }
}

// ============ Rank results with AI for semantic relevance ============
async function rankResults(
  technologies: any[],
  query: string,
  apiKey: string,
  model: string
): Promise<{ matching_ids: string[], explanation: string, tokensUsed: number }> {
  
  if (technologies.length === 0) {
    return { matching_ids: [], explanation: "No se encontraron tecnologías con las palabras clave.", tokensUsed: 0 };
  }
  
  // If few results, skip AI ranking
  if (technologies.length <= 10) {
    return {
      matching_ids: technologies.map(t => t.id),
      explanation: `Se encontraron ${technologies.length} tecnologías relevantes mediante búsqueda por palabras clave.`,
      tokensUsed: 0
    };
  }

  const summary = technologies.slice(0, 80).map(t => JSON.stringify({
    id: t.id,
    nombre: t.nombre,
    tipo: t.tipo || null,
    sub: t.subcategoria || null,
    sector: t.sector || null,
    app: t.aplicacion || null,
    desc: (t.descripcion || '').slice(0, 200),
    score: t.relevance_score,
  })).join('\n');

  const prompt = `Eres un experto en tecnologías del agua e innovación industrial.

TAREA: Reordena estas tecnologías pre-filtradas por relevancia semántica para: "${query}"

TECNOLOGÍAS (ordenadas por coincidencia de keywords):
${summary}

INSTRUCCIONES:
1. Analiza la relación semántica con la consulta
2. Prioriza por aplicación y descripción que coincidan con el problema
3. Distingue: software/modelado ≠ equipos físicos, sensores ≠ actuadores
4. Máximo ${MAX_FINAL_RESULTS} resultados ordenados de mayor a menor relevancia

RESPONDE SOLO JSON:
{"matching_ids": ["id1", "id2", ...], "explanation": "Criterios aplicados..."}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("[rankResults] AI error:", response.status);
      // Fallback: return by relevance_score order
      return {
        matching_ids: technologies.slice(0, MAX_FINAL_RESULTS).map(t => t.id),
        explanation: "Ordenado por coincidencia de palabras clave.",
        tokensUsed: 0
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON
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
    
    console.log(`[rankResults] Complete: ${parsed.matching_ids?.length || 0} results (${data.usage?.total_tokens || 0} tokens)`);
    
    return {
      matching_ids: parsed.matching_ids || technologies.slice(0, MAX_FINAL_RESULTS).map((t: any) => t.id),
      explanation: parsed.explanation || "Ordenado por relevancia semántica.",
      tokensUsed: data.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error("[rankResults] Error:", error);
    return {
      matching_ids: technologies.slice(0, MAX_FINAL_RESULTS).map(t => t.id),
      explanation: "Ordenado por coincidencia de palabras clave.",
      tokensUsed: 0
    };
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

    console.log('=== AI KEYWORD SEARCH ===');
    console.log('Query:', query);
    console.log('Filters:', filters);

    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch the AI model to use for ranking
    const { data: modelSettings } = await supabase
      .from('ai_model_settings')
      .select('model')
      .eq('action_type', 'search')
      .single();
    
    const aiModel = modelSettings?.model || 'google/gemini-2.5-flash';
    console.log(`Using AI model for ranking: ${aiModel}`);

    // Step 1: Extract keywords with AI
    const keywords = await extractKeywords(query, LOVABLE_API_KEY, aiModel);
    console.log(`Extracted ${keywords.length} keywords:`, keywords);

    if (keywords.length === 0) {
      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'No se pudieron extraer palabras clave de la consulta.',
          metadata: { keywords: [] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Search using the new RPC function (fast DB text search)
    const { data: technologies, error: searchError } = await supabase.rpc(
      'search_technologies_by_keywords_v2',
      {
        p_keywords: keywords,
        p_min_trl: filters?.trlMin ?? null,
        p_max_trl: filters?.trlMax ?? null,
        p_statuses: null, // Allow all statuses by default
        p_sector_ids: filters?.sectorId ? [filters.sectorId] : null,
        p_tipo_id: filters?.tipoId ?? null,
        p_subcategoria_id: filters?.subcategoriaId ?? null,
        p_limit: 300
      }
    );

    if (searchError) {
      console.error('[search] RPC error:', searchError);
      throw new Error(`Database search error: ${searchError.message}`);
    }

    console.log(`[search] Found ${technologies?.length || 0} technologies matching keywords`);

    // Step 3: Rank results semantically with AI
    const rankResult = await rankResults(technologies || [], query, LOVABLE_API_KEY, aiModel);
    
    const responseTimeMs = Date.now() - startTime;

    // Log usage
    await supabase.from('ai_usage_logs').insert({
      action_type: 'search_keywords',
      model: aiModel,
      total_tokens: rankResult.tokensUsed,
      response_time_ms: responseTimeMs,
      success: true,
    });

    console.log(`[DONE] ${rankResult.matching_ids.length} results in ${responseTimeMs}ms`);

    return new Response(
      JSON.stringify({
        matching_ids: rankResult.matching_ids,
        explanation: rankResult.explanation,
        metadata: {
          keywords,
          db_matches: technologies?.length || 0,
          final_results: rankResult.matching_ids.length,
          total_tokens: rankResult.tokensUsed,
          response_time_ms: responseTimeMs
        },
        usage: {
          model: aiModel,
          tokens: rankResult.tokensUsed
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-search-technologies] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Surface specific errors
    if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      return new Response(
        JSON.stringify({ error: 'Límite de tasa excedido. Espera unos segundos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (errorMessage.includes('402') || errorMessage.includes('payment')) {
      return new Response(
        JSON.stringify({ error: 'Créditos de IA agotados. Requiere pago.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
