import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Search query:', query);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch a limited set of technologies to stay within AI context limits
    // NOTE: PostgREST defaults to 1000 rows; keeping this small avoids 400 context-length errors.
    const MAX_TECHS_FOR_AI = 200;

    const { data: technologies, error: fetchError } = await supabase
      .from('technologies')
      .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Sector y subsector", "Aplicación principal", "Descripción técnica breve", "Proveedor / Empresa", "Grado de madurez (TRL)", status')
      .or('status.eq.approved,status.eq.active,status.is.null,status.eq.inactive,status.eq.en_revision')
      .limit(MAX_TECHS_FOR_AI);

    if (fetchError) {
      console.error('Error fetching technologies:', fetchError);
      throw new Error('Error fetching technologies');
    }

    console.log(`Fetched ${technologies?.length || 0} technologies for AI analysis (limit=${MAX_TECHS_FOR_AI})`);

    // Create a compact summary for the AI (1 line per technology)
    const techSummary =
      technologies?.map((t) =>
        JSON.stringify({
          id: t.id,
          nombre: t["Nombre de la tecnología"],
          tipo: t["Tipo de tecnología"],
          sector: t["Sector y subsector"] ?? null,
          aplicacion: t["Aplicación principal"] ?? null,
          descripcion: t["Descripción técnica breve"] ?? null,
          proveedor: t["Proveedor / Empresa"] ?? null,
          trl: t["Grado de madurez (TRL)"] ?? null,
          estado: t.status ?? null,
        })
      ).join('\n') || '[]';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

     const systemPrompt = `Eres un asistente experto en tecnologías industriales e innovación.

Tienes una lista (limitada) de tecnologías en formato JSONL (un JSON por línea). Cada objeto incluye: id, nombre, tipo, sector, aplicacion, descripcion, proveedor, trl, estado.

LISTA (JSONL):
${techSummary}

INSTRUCCIONES:
1. Analiza la consulta del usuario.
2. Encuentra las tecnologías más relevantes dentro de la LISTA.
3. Devuelve SOLO los IDs ordenados por relevancia (máximo 20) y una explicación breve.

FORMATO DE RESPUESTA (SOLO JSON válido):
{"matching_ids": ["id1", "id2"], "explanation": "..."}

Si no encuentras coincidencias:
{"matching_ids": [], "explanation": "No se encontraron tecnologías que coincidan con la búsqueda"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Busca tecnologías que coincidan con: "${query}"` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

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
              'La búsqueda es demasiado amplia para analizarla de una vez. Prueba con más palabras clave (sector, aplicación, TRL, proveedor) o una búsqueda más específica.',
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
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let result;
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = aiContent;
      if (aiContent.includes('```')) {
        jsonStr = aiContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          matching_ids: [], 
          explanation: 'Error al procesar la respuesta de IA. Intenta reformular tu búsqueda.',
          raw_response: aiContent
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed result:', result);

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
