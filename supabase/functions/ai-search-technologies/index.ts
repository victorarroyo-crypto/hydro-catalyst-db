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

    console.log('AI Search query:', query);
    console.log('Active filters:', filters);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query with filters applied at database level - include ALL relevant fields for AI analysis
    let dbQuery = supabase
      .from('technologies')
      .select(`
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
        status, 
        tipo_id, 
        subcategoria_id, 
        sector_id
      `)
      .or('status.eq.approved,status.eq.active,status.is.null,status.eq.inactive,status.eq.en_revision');

    // Apply filters at database level for efficiency
    if (filters) {
      // New taxonomy filters
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
      
      // Legacy filters
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

    // Fetch all matching technologies (in batches to bypass limit)
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

    console.log(`Fetched ${totalCount} technologies after applying filters`);

    // If no technologies match filters, return early
    if (totalCount === 0) {
      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'No hay tecnologías que cumplan los filtros seleccionados.',
          total_analyzed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit for AI context - reduced to 200 due to richer field content per technology
    // (500 techs with all fields exceeds 272K token limit)
    const MAX_TECHS_FOR_AI = 200;
    const techsForAI = technologies.slice(0, MAX_TECHS_FOR_AI);
    const wasLimited = totalCount > MAX_TECHS_FOR_AI;

    console.log(`Sending ${techsForAI.length} technologies to AI (total matching: ${totalCount})`);

    // Create a rich summary for the AI (1 line per technology) with ALL relevant fields
    const techSummary =
      techsForAI.map((t) =>
        JSON.stringify({
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
          trl: t["Grado de madurez (TRL)"] ?? null,
          estado: t.status ?? null,
        })
      ).join('\n') || '[]';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch the AI model to use from settings
    const { data: modelSettings } = await supabase
      .from('ai_model_settings')
      .select('model')
      .eq('action_type', 'search')
      .single();
    
    const aiModel = modelSettings?.model || 'google/gemini-2.5-flash';
    console.log(`Using AI model for search: ${aiModel}`);

    // Build context about active filters
    const filterContext = filters ? Object.entries(filters)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') : 'ninguno';

    const systemPrompt = `Eres un experto en tecnologías del agua, medio ambiente e innovación industrial.

CONTEXTO:
Tienes ${techsForAI.length} tecnologías${wasLimited ? ` (de ${totalCount} totales)` : ''} para analizar.
${filterContext !== 'ninguno' ? `Filtros aplicados: ${filterContext}` : ''}

CAMPOS DISPONIBLES EN CADA TECNOLOGÍA:
- nombre: nombre comercial de la tecnología
- tipo: categoría principal (Software, Equipamiento, Proceso Químico, Sensores, etc.)
- subcategoria: clasificación específica dentro del tipo
- sector: industria o ámbito objetivo
- aplicacion: uso principal de la tecnología
- descripcion: resumen técnico breve
- ventaja: diferenciador competitivo principal
- innovacion: qué la hace innovadora o única
- casos: referencias de implementación reales
- proveedor: empresa fabricante o desarrolladora
- pais: país de origen
- trl: nivel de madurez tecnológica (1-9)
- estado: estado en la base de datos

LISTA DE TECNOLOGÍAS (JSONL - un JSON por línea):
${techSummary}

INSTRUCCIONES CRÍTICAS PARA LA BÚSQUEDA:
1. ANALIZA SEMÁNTICAMENTE la consulta del usuario - entiende la INTENCIÓN, no solo palabras literales
2. BUSCA EN TODOS LOS CAMPOS, no solo en nombre o descripción
3. CONSIDERA SINÓNIMOS Y TÉRMINOS RELACIONADOS:
   - "modelado hidráulico" → software de simulación, diseño de redes, análisis de flujos, EPANET, InfoWorks
   - "monitorización" → sensores, IoT, SCADA, telemetría, control en tiempo real
   - "tratamiento" → equipos físicos, procesos químicos/biológicos, depuración
   - "gestión" → software, plataformas, ERP, sistemas de información
   - "eficiencia energética" → bombas, variadores, recuperación de energía
   
4. DISTINGUE CLARAMENTE ENTRE CATEGORÍAS:
   - SOFTWARE/herramientas digitales ≠ equipos físicos de tratamiento
   - Simulación/diseño/planificación ≠ operación/tratamiento
   - Monitorización/sensores ≠ actuación/control
   
5. PRIORIZA POR RELEVANCIA SEMÁNTICA:
   - Alta: coincidencia directa en aplicación, descripción o innovación
   - Media: coincidencia en tipo/subcategoría relacionada
   - Baja: solo coincidencia parcial en campos secundarios

6. Devuelve HASTA 100 resultados ordenados de mayor a menor relevancia

FORMATO DE RESPUESTA (SOLO JSON válido, sin markdown):
{"matching_ids": ["id1", "id2", ...], "explanation": "Explicación breve de los criterios de selección usados"}

Si no encuentras coincidencias relevantes:
{"matching_ids": [], "explanation": "No se encontraron tecnologías que coincidan semánticamente con la búsqueda. Sugerencia: intenta con términos más específicos o sinónimos."}`;

    // Track timing for usage logs
    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Busca tecnologías que coincidan con: "${query}"` }
        ],
      }),
    });

    const responseTimeMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      // Log failed request
      await supabase.from('ai_usage_logs').insert({
        action_type: 'search',
        model: aiModel,
        response_time_ms: responseTimeMs,
        success: false,
        error_message: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de tasa excedido. Por favor, intenta de nuevo más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Se requiere pago. Por favor, añade fondos a tu cuenta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 400 && errorText.includes('maximum context length')) {
        return new Response(
          JSON.stringify({
            error:
              'La búsqueda es demasiado amplia para analizarla de una vez. Prueba añadiendo más filtros (sector, tipo, TRL) antes de buscar.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Error del servicio de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    // Extract token usage from response
    const usage = aiData.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    // Log successful request
    await supabase.from('ai_usage_logs').insert({
      action_type: 'search',
      model: aiModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      response_time_ms: responseTimeMs,
      success: true,
    });
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let result;
    try {
      // Extract JSON from the response - handle various formats
      let jsonStr = aiContent;
      
      // First, try to extract JSON from markdown code blocks
      const codeBlockMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to find JSON object directly (starts with { and ends with })
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'Error al procesar la respuesta de IA. Intenta reformular tu búsqueda.',
          raw_response: aiContent,
          total_analyzed: techsForAI.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed result:', result);

    // Add metadata about the search
    result.total_analyzed = techsForAI.length;
    result.total_matching_filters = totalCount;
    result.usage = { model: aiModel, tokens: totalTokens, response_time_ms: responseTimeMs };
    if (wasLimited) {
      result.note = `Se analizaron ${techsForAI.length} de ${totalCount} tecnologías que cumplen los filtros.`;
    }

    return new Response(
      JSON.stringify(result),
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