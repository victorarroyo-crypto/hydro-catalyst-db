import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentRequest {
  technology: {
    id: string;
    nombre: string;
    proveedor: string;
    web: string;
    pais: string;
    tipo_sugerido: string;
    subcategoria: string;
    sector: string;
    descripcion: string;
    aplicacion_principal: string;
    ventaja_competitiva: string;
    innovacion: string;
    trl_estimado: number | null;
    casos_referencia: string;
    paises_actua: string;
    comentarios_analista: string;
  };
  model?: string;
  fieldsToEnrich?: string[];
}

interface EnrichmentResult {
  descripcion?: string;
  aplicacion_principal?: string;
  ventaja_competitiva?: string;
  innovacion?: string;
  casos_referencia?: string;
  comentarios_analista?: string;
  trl_estimado?: number;
  paises_actua?: string;
}

const DEFAULT_FIELDS = [
  'descripcion',
  'aplicacion_principal', 
  'ventaja_competitiva',
  'innovacion',
  'casos_referencia',
  'paises_actua',
  'comentarios_analista'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { technology, model, fieldsToEnrich = DEFAULT_FIELDS }: EnrichmentRequest = await req.json();

    if (!technology || !technology.nombre) {
      throw new Error("Technology data with name is required");
    }

    // Get model from settings or use provided/default
    let aiModel = model;
    if (!aiModel) {
      const { data: modelSettings } = await supabase
        .from('ai_model_settings')
        .select('model')
        .eq('action_type', 'enrichment')
        .single();
      
      aiModel = modelSettings?.model || 'google/gemini-2.5-flash';
    }

    console.log(`Using AI model for enrichment: ${aiModel}`);
    console.log(`Technology: ${technology.nombre}`);
    console.log(`Website: ${technology.web}`);
    console.log(`Fields to enrich: ${fieldsToEnrich.join(', ')}`);

    // Build the enrichment prompt
    const systemPrompt = `Eres un analista experto en tecnologías del agua (WaterTech). Tu tarea es enriquecer fichas tecnológicas con información detallada y precisa.

INSTRUCCIONES:
1. Analiza la información proporcionada sobre la tecnología
2. Si se proporciona una URL web, considera que has investigado esa fuente
3. Genera contenido profesional, técnico y específico para cada campo solicitado
4. El contenido debe ser en español
5. Mantén un tono técnico pero accesible
6. Sé específico y evita generalidades

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido con los campos solicitados. No incluyas explicaciones adicionales.

CAMPOS A GENERAR:
${fieldsToEnrich.includes('descripcion') ? `- descripcion: Descripción técnica breve (150-300 palabras). Incluye tecnología principal, componentes clave, principio de funcionamiento y especificaciones técnicas relevantes.` : ''}
${fieldsToEnrich.includes('aplicacion_principal') ? `- aplicacion_principal: Aplicación principal (100-200 palabras). Describe los usos principales, sectores de aplicación y casos típicos de uso.` : ''}
${fieldsToEnrich.includes('ventaja_competitiva') ? `- ventaja_competitiva: Ventaja competitiva clave (100-200 palabras). Destaca qué diferencia esta tecnología de las alternativas del mercado.` : ''}
${fieldsToEnrich.includes('innovacion') ? `- innovacion: Por qué es innovadora (100-200 palabras). Explica los aspectos innovadores y cómo avanza el estado del arte.` : ''}
${fieldsToEnrich.includes('casos_referencia') ? `- casos_referencia: Casos de referencia (100-200 palabras). Menciona implementaciones conocidas, clientes destacados o proyectos relevantes.` : ''}
${fieldsToEnrich.includes('comentarios_analista') ? `- comentarios_analista: Comentarios del analista (150-250 palabras). Análisis experto sobre madurez tecnológica, potencial de mercado, barreras de adopción y recomendaciones.` : ''}
${fieldsToEnrich.includes('trl_estimado') ? `- trl_estimado: Nivel TRL estimado (número del 1 al 9). Basado en la información disponible.` : ''}
${fieldsToEnrich.includes('paises_actua') ? `- paises_actua: Países donde actúa. Lista de países o regiones donde opera la empresa.` : ''}`;

    const userPrompt = `INFORMACIÓN DE LA TECNOLOGÍA:

Nombre: ${technology.nombre}
Proveedor/Empresa: ${technology.proveedor || 'No especificado'}
Web: ${technology.web || 'No disponible'}
País de origen: ${technology.pais || 'No especificado'}
Tipo de tecnología sugerido: ${technology.tipo_sugerido || 'No clasificado'}
Subcategoría: ${technology.subcategoria || 'No especificada'}
Sector: ${technology.sector || 'No especificado'}

INFORMACIÓN EXISTENTE (para contexto, mejorar si está incompleta):
${technology.descripcion ? `- Descripción actual: ${technology.descripcion}` : ''}
${technology.aplicacion_principal ? `- Aplicación principal actual: ${technology.aplicacion_principal}` : ''}
${technology.ventaja_competitiva ? `- Ventaja competitiva actual: ${technology.ventaja_competitiva}` : ''}
${technology.innovacion ? `- Innovación actual: ${technology.innovacion}` : ''}
${technology.casos_referencia ? `- Casos de referencia actuales: ${technology.casos_referencia}` : ''}
${technology.trl_estimado ? `- TRL actual: ${technology.trl_estimado}` : ''}
${technology.paises_actua ? `- Países donde actúa: ${technology.paises_actua}` : ''}

Por favor, genera el contenido enriquecido para los campos solicitados. Si ya existe información, mejórala y amplíala. Si falta información, créala basándote en el contexto disponible.

Responde SOLO con el JSON, sin markdown ni explicaciones.`;

    // Call the AI API with higher max_tokens to avoid truncation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000, // Increased to prevent truncation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.");
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const responseContent = aiResponse.choices?.[0]?.message?.content;
    const finishReason = aiResponse.choices?.[0]?.finish_reason;

    if (!responseContent) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response length:", responseContent.length);
    console.log("Finish reason:", finishReason);
    console.log("Raw AI response (first 500 chars):", responseContent.substring(0, 500));

    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn("AI response was truncated due to max_tokens limit");
    }

    // Parse the JSON response with robust error handling
    let enrichedData: EnrichmentResult;
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanedResponse = responseContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();
      
      // Try to parse as-is first
      try {
        enrichedData = JSON.parse(cleanedResponse);
      } catch (firstParseError) {
        console.warn("First parse attempt failed, trying to repair JSON...");
        
        // Try to repair truncated JSON by closing open structures
        let repairedJson = cleanedResponse;
        
        // Count open braces/brackets
        const openBraces = (repairedJson.match(/{/g) || []).length;
        const closeBraces = (repairedJson.match(/}/g) || []).length;
        
        // If we have unclosed braces, try to close them
        if (openBraces > closeBraces) {
          // Find the last complete key-value pair
          const lastCompleteValue = repairedJson.lastIndexOf('",');
          const lastCompleteNumber = repairedJson.lastIndexOf(',\n');
          const lastComplete = Math.max(lastCompleteValue, lastCompleteNumber);
          
          if (lastComplete > 0) {
            // Truncate at last complete value and close the JSON
            repairedJson = repairedJson.substring(0, lastComplete + 1);
            // Remove trailing comma if present
            repairedJson = repairedJson.replace(/,\s*$/, '');
            // Close remaining braces
            for (let i = 0; i < openBraces - closeBraces; i++) {
              repairedJson += '}';
            }
          } else {
            // Last resort: just close all braces
            for (let i = 0; i < openBraces - closeBraces; i++) {
              repairedJson += '"}';
            }
          }
        }
        
        console.log("Repaired JSON (last 200 chars):", repairedJson.slice(-200));
        
        try {
          enrichedData = JSON.parse(repairedJson);
          console.log("Successfully parsed repaired JSON");
        } catch (repairError) {
          // If repair failed, try extracting just the valid fields we can find
          console.error("Repair failed, attempting field extraction...");
          
          enrichedData = {};
          const fieldPatterns = [
            { key: 'descripcion', regex: /"descripcion"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'aplicacion_principal', regex: /"aplicacion_principal"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'ventaja_competitiva', regex: /"ventaja_competitiva"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'innovacion', regex: /"innovacion"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'casos_referencia', regex: /"casos_referencia"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'paises_actua', regex: /"paises_actua"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'comentarios_analista', regex: /"comentarios_analista"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s },
            { key: 'trl_estimado', regex: /"trl_estimado"\s*:\s*(\d+)/s },
          ];
          
          for (const { key, regex } of fieldPatterns) {
            const match = cleanedResponse.match(regex);
            if (match) {
              enrichedData[key as keyof EnrichmentResult] = key === 'trl_estimado' 
                ? parseInt(match[1]) 
                : match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
          }
          
          if (Object.keys(enrichedData).length === 0) {
            throw new Error("Could not extract any valid fields from AI response");
          }
          
          console.log(`Extracted ${Object.keys(enrichedData).length} fields from partial response`);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Response content (last 500 chars):", responseContent.slice(-500));
      throw new Error("Failed to parse AI response as JSON");
    }

    const responseTimeMs = Date.now() - startTime;

    // Log AI usage
    const usage = aiResponse.usage;
    await supabase.from('ai_usage_logs').insert({
      action_type: 'enrichment',
      model: aiModel,
      input_tokens: usage?.prompt_tokens || null,
      output_tokens: usage?.completion_tokens || null,
      total_tokens: usage?.total_tokens || null,
      response_time_ms: responseTimeMs,
      success: true,
    });

    console.log(`Enrichment completed in ${responseTimeMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        enrichedData,
        model: aiModel,
        responseTimeMs,
        usage: {
          inputTokens: usage?.prompt_tokens,
          outputTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error("Error in enrich-technology:", error);

    // Log error
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('ai_usage_logs').insert({
        action_type: 'enrichment',
        model: 'unknown',
        response_time_ms: responseTimeMs,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
