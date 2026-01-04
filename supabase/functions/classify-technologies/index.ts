import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
}

interface TaxonomySubcategoria {
  id: number;
  codigo: string;
  nombre: string;
  tipo_id: number;
}

interface TaxonomySector {
  id: string;
  nombre: string;
}

interface Technology {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Subcategoría": string | null;
  "Sector y subsector": string | null;
  "Descripción técnica breve": string | null;
  "Aplicación principal": string | null;
}

interface ClassificationResult {
  id: string;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 40 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch taxonomy data
    const [tiposRes, subcategoriasRes, sectoresRes] = await Promise.all([
      supabase.from('taxonomy_tipos').select('*').order('id'),
      supabase.from('taxonomy_subcategorias').select('*').order('tipo_id, id'),
      supabase.from('taxonomy_sectores').select('*').order('nombre'),
    ]);

    if (tiposRes.error) throw tiposRes.error;
    if (subcategoriasRes.error) throw subcategoriasRes.error;
    if (sectoresRes.error) throw sectoresRes.error;

    const tipos: TaxonomyTipo[] = tiposRes.data || [];
    const subcategorias: TaxonomySubcategoria[] = subcategoriasRes.data || [];
    const sectores: TaxonomySector[] = sectoresRes.data || [];

    // Fetch unclassified technologies
    const { data: technologies, error: techError } = await supabase
      .from('technologies')
      .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Subcategoría", "Sector y subsector", "Descripción técnica breve", "Aplicación principal"')
      .is('tipo_id', null)
      .limit(batchSize);

    if (techError) throw techError;

    if (!technologies || technologies.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No hay tecnologías pendientes de clasificar",
        classified: 0,
        remaining: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count remaining unclassified
    const { count: remainingCount } = await supabase
      .from('technologies')
      .select('id', { count: 'exact', head: true })
      .is('tipo_id', null);

    // Build taxonomy reference for the AI
    const taxonomyReference = `
## TIPOS DE TECNOLOGÍA (8 tipos principales):
${tipos.map(t => `- ID ${t.id}: ${t.nombre} (${t.codigo})`).join('\n')}

## SUBCATEGORÍAS (organizadas por tipo):
${tipos.map(tipo => {
  const subs = subcategorias.filter(s => s.tipo_id === tipo.id);
  return `### ${tipo.nombre} (tipo_id: ${tipo.id}):
${subs.map(s => `  - ID ${s.id}: ${s.nombre} (${s.codigo})`).join('\n')}`;
}).join('\n\n')}

## SECTORES:
${sectores.map(s => `- ID "${s.id}": ${s.nombre}`).join('\n')}
`;

    // Prepare technologies for classification
    const techDescriptions = technologies.map((t: Technology) => `
ID: ${t.id}
Nombre: ${t["Nombre de la tecnología"]}
Tipo actual (texto): ${t["Tipo de tecnología"] || "No especificado"}
Subcategoría actual (texto): ${t["Subcategoría"] || "No especificada"}
Sector actual (texto): ${t["Sector y subsector"] || "No especificado"}
Descripción: ${t["Descripción técnica breve"] || "Sin descripción"}
Aplicación: ${t["Aplicación principal"] || "No especificada"}
`).join('\n---\n');

    const systemPrompt = `Eres un experto en clasificación de tecnologías de tratamiento de agua. Tu tarea es clasificar tecnologías según una taxonomía predefinida.

${taxonomyReference}

INSTRUCCIONES:
1. Para cada tecnología, asigna el tipo_id, subcategoria_id y sector_id más apropiados basándote en su nombre, descripción y aplicación.
2. La subcategoría DEBE pertenecer al tipo seleccionado.
3. Para sector_id usa: "MUN" (Municipal), "IND" (Industrial), o "AMB" (Ambos).
4. Proporciona un razonamiento breve para cada clasificación.
5. Si no estás seguro, usa tu mejor juicio basándote en la información disponible.

RESPONDE ÚNICAMENTE en formato JSON válido, sin texto adicional:
{
  "classifications": [
    {
      "id": "uuid de la tecnología",
      "tipo_id": número,
      "subcategoria_id": número,
      "sector_id": "MUN" | "IND" | "AMB",
      "confidence": número entre 0 y 1,
      "reasoning": "breve explicación"
    }
  ]
}`;

    console.log(`Classifying ${technologies.length} technologies...`);

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Clasifica las siguientes tecnologías:\n\n${techDescriptions}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI Response:", content);

    // Parse AI response
    let classifications: ClassificationResult[];
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const parsed = JSON.parse(jsonStr);
      classifications = parsed.classifications;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Invalid AI response format");
    }

    // Update technologies in database
    const updateResults = [];
    for (const classification of classifications) {
      const { id, tipo_id, subcategoria_id, sector_id, reasoning } = classification;
      
      const { error: updateError } = await supabase
        .from('technologies')
        .update({
          tipo_id,
          subcategoria_id,
          sector_id,
        })
        .eq('id', id);

      if (updateError) {
        console.error(`Failed to update technology ${id}:`, updateError);
        updateResults.push({ id, success: false, error: updateError.message });
      } else {
        console.log(`Updated technology ${id}: tipo=${tipo_id}, sub=${subcategoria_id}, sector=${sector_id}`);
        updateResults.push({ id, success: true, reasoning });
      }
    }

    const successCount = updateResults.filter(r => r.success).length;
    const remaining = (remainingCount || 0) - successCount;

    return new Response(JSON.stringify({
      message: `Clasificadas ${successCount} tecnologías correctamente`,
      classified: successCount,
      remaining: Math.max(0, remaining),
      results: updateResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
