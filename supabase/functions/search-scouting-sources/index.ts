import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    const { prompt, filters } = await req.json()

    if (!prompt || prompt.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un prompt de búsqueda (mínimo 5 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SEARCH-SOURCES] Prompt:', prompt)
    console.log('[SEARCH-SOURCES] Filters:', filters)

    // Build context from filters
    const filterContext = []
    if (filters?.tipo) filterContext.push(`Tipo de fuente preferido: ${filters.tipo}`)
    if (filters?.region) filterContext.push(`Región/País: ${filters.region}`)
    if (filters?.sector) filterContext.push(`Sector: ${filters.sector}`)
    
    const filterString = filterContext.length > 0 
      ? `\n\nFiltros aplicados:\n${filterContext.join('\n')}`
      : ''

    const systemPrompt = `Eres un experto en tecnología del agua (watertech) y en descubrir fuentes de información sobre innovación tecnológica.

Tu tarea es sugerir fuentes útiles para descubrir nuevas tecnologías del agua basándote en la solicitud del usuario.

IMPORTANTE:
- Sugiere entre 5 y 10 fuentes relevantes
- Prioriza fuentes actuales, activas y verificables
- Incluye URLs reales que existan
- Varía los tipos de fuentes: webs, directorios, ferias, aceleradoras, newsletters, etc.
- Para ferias y eventos, menciona si son anuales y su próxima edición si es conocida

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin texto adicional):
{
  "sources": [
    {
      "nombre": "Nombre de la fuente",
      "url": "https://...",
      "descripcion": "Breve descripción (1-2 oraciones)",
      "tipo": "web|directorio|feria|aceleradora|gobierno|universidad|newsletter|asociacion|revista",
      "pais": "País específico o 'Global'",
      "sector_foco": "municipal|industrial|agricola|desalacion|reutilizacion|general"
    }
  ],
  "explanation": "Breve explicación de las fuentes encontradas y por qué son relevantes"
}`

    const userMessage = `Busca fuentes de scouting para tecnologías del agua con este criterio:

${prompt}${filterString}`

    console.log('[SEARCH-SOURCES] Calling Lovable AI...')

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SEARCH-SOURCES] AI error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de uso excedido. Intenta de nuevo más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Contacta al administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error(`AI gateway error: ${response.status}`)
    }

    const aiResult = await response.json()
    const content = aiResult.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No response from AI')
    }

    console.log('[SEARCH-SOURCES] AI response received, parsing...')

    // Parse JSON from response (handle potential markdown wrapping)
    let parsedResult
    try {
      // Try direct parse first
      parsedResult = JSON.parse(content)
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1].trim())
      } else {
        // Try to find JSON object in the response
        const objectMatch = content.match(/\{[\s\S]*\}/)
        if (objectMatch) {
          parsedResult = JSON.parse(objectMatch[0])
        } else {
          throw new Error('Could not parse AI response as JSON')
        }
      }
    }

    // Validate structure
    if (!parsedResult.sources || !Array.isArray(parsedResult.sources)) {
      throw new Error('Invalid response structure: missing sources array')
    }

    // Clean and validate sources
    const validSources = parsedResult.sources
      .filter((s: any) => s.nombre && s.url)
      .map((s: any) => ({
        nombre: s.nombre?.trim() || '',
        url: s.url?.trim() || '',
        descripcion: s.descripcion?.trim() || '',
        tipo: s.tipo || 'web',
        pais: s.pais || 'Global',
        sector_foco: s.sector_foco || 'general',
      }))

    console.log(`[SEARCH-SOURCES] Found ${validSources.length} valid sources`)

    return new Response(
      JSON.stringify({
        success: true,
        sources: validSources,
        explanation: parsedResult.explanation || `Se encontraron ${validSources.length} fuentes relevantes.`,
        prompt_used: prompt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SEARCH-SOURCES] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
