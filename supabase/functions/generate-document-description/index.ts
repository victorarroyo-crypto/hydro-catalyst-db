import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, category, sector } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Map category and sector to human-readable labels
    const categoryLabels: Record<string, string> = {
      'technical_guide': 'Guía Técnica',
      'regulation': 'Normativa',
    };

    const sectorLabels: Record<string, string> = {
      'general': 'General',
      'food_beverage': 'Alimentación y Bebidas',
      'pulp_paper': 'Celulosa y Papel',
      'textile': 'Textil',
      'chemical': 'Química',
      'pharma': 'Farmacéutica',
      'oil_gas': 'Oil & Gas',
      'metal': 'Metal-Mecánica',
      'mining': 'Minería',
      'power': 'Energía',
      'electronics': 'Electrónica/Semiconductores',
      'automotive': 'Automoción',
      'cosmetics': 'Cosmética',
      'cooling_towers': 'Torres de Refrigeración',
      'desalination': 'Desalación',
    };

    const categoryLabel = categoryLabels[category] || category || 'Documento técnico';
    const sectorLabel = sectorLabels[sector] || sector || 'General';

    const prompt = `Genera una descripción técnica breve (máximo 2 oraciones, 300 caracteres) para un documento PDF de tratamiento de aguas.

Nombre del archivo: ${fileName}
Categoría: ${categoryLabel}
Sector industrial: ${sectorLabel}

La descripción debe:
- Ser profesional y técnica
- Indicar el tema principal del documento basándote en el nombre del archivo
- Estar en español
- No exceder 300 caracteres
- No incluir el nombre del archivo ni mencionar que es un PDF

Responde SOLO con la descripción, sin explicaciones adicionales.`;

    console.log('[generate-document-description] Calling Lovable AI with prompt:', prompt.substring(0, 200));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Eres un experto en tratamiento de aguas industriales y documentación técnica. Generas descripciones concisas y profesionales.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[generate-document-description] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let description = data.choices?.[0]?.message?.content || '';

    // Clean up the description - remove quotes if present
    description = description.trim().replace(/^["']|["']$/g, '');

    // Ensure it doesn't exceed 300 characters
    if (description.length > 300) {
      description = description.substring(0, 297) + '...';
    }

    console.log('[generate-document-description] Generated description:', description);

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-document-description] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
