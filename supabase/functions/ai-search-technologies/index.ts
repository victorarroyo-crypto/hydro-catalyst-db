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

    // Fetch all technologies to provide context
    const { data: technologies, error: fetchError } = await supabase
      .from('technologies')
      .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Subcategoría", "Sector y subsector", "Aplicación principal", "Descripción técnica breve", "Ventaja competitiva clave", "Porque es innovadora", "Casos de referencia", "Paises donde actua", "País de origen", "Proveedor / Empresa", "Grado de madurez (TRL)", status')
      .or('status.eq.approved,status.eq.active,status.is.null');

    if (fetchError) {
      console.error('Error fetching technologies:', fetchError);
      throw new Error('Error fetching technologies');
    }

    console.log(`Fetched ${technologies?.length || 0} technologies for AI analysis`);

    // Create a summary of technologies for the AI
    const techSummary = technologies?.map((t, i) => 
      `[${i + 1}] ID: ${t.id}
       Nombre: ${t["Nombre de la tecnología"]}
       Tipo: ${t["Tipo de tecnología"]}
       Subcategoría: ${t["Subcategoría"] || 'N/A'}
       Sector: ${t["Sector y subsector"] || 'N/A'}
       Aplicación: ${t["Aplicación principal"] || 'N/A'}
       Descripción: ${t["Descripción técnica breve"] || 'N/A'}
       Ventaja: ${t["Ventaja competitiva clave"] || 'N/A'}
       Innovación: ${t["Porque es innovadora"] || 'N/A'}
       Casos de referencia: ${t["Casos de referencia"] || 'N/A'}
       Países donde actúa: ${t["Paises donde actua"] || 'N/A'}
       País de origen: ${t["País de origen"] || 'N/A'}
       Proveedor: ${t["Proveedor / Empresa"] || 'N/A'}
       TRL: ${t["Grado de madurez (TRL)"] || 'N/A'}`
    ).join('\n\n') || 'No hay tecnologías disponibles';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Eres un asistente experto en tecnologías industriales y de innovación. Tu tarea es analizar la consulta del usuario y encontrar las tecnologías más relevantes de la base de datos.

Tienes acceso a la siguiente base de datos de tecnologías:

${techSummary}

INSTRUCCIONES:
1. Analiza la consulta del usuario para entender qué tipo de tecnología busca
2. Considera sinónimos, términos relacionados y conceptos similares
3. Busca coincidencias en: nombre, tipo, sector, aplicación, descripción, casos de referencia, países, etc.
4. Devuelve SOLO los IDs de las tecnologías que coincidan, ordenados por relevancia (más relevante primero)
5. Si no hay coincidencias exactas, busca tecnologías relacionadas o similares
6. Máximo 20 tecnologías

IMPORTANTE: Tu respuesta debe ser SOLO un JSON válido con el siguiente formato:
{"matching_ids": ["id1", "id2", ...], "explanation": "Breve explicación de por qué estas tecnologías coinciden"}

Si no encuentras ninguna tecnología relevante, responde:
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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Error del servicio de IA');
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
