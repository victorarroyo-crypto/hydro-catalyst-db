import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to normalize URLs for comparison
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '')
    .replace(/\/en\/?$/, '')
    .replace(/\/es\/?$/, '')
}

// Function to normalize names for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
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

    // Create Supabase client to fetch existing sources
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { prompt, filters, model } = await req.json()
    const selectedModel = model || 'google/gemini-2.5-pro'

    if (!prompt || prompt.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un prompt de búsqueda (mínimo 5 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SEARCH-SOURCES] Prompt:', prompt)
    console.log('[SEARCH-SOURCES] Model:', selectedModel)
    console.log('[SEARCH-SOURCES] Filters:', filters)

    // Fetch existing sources from database
    const { data: existingSources, error: fetchError } = await supabase
      .from('scouting_sources')
      .select('nombre, url')
    
    if (fetchError) {
      console.error('[SEARCH-SOURCES] Error fetching existing sources:', fetchError)
    }

    console.log(`[SEARCH-SOURCES] Found ${existingSources?.length || 0} existing sources in database`)

    // Build exclusion list for the AI prompt
    const existingNames = existingSources?.map(s => s.nombre).filter(Boolean) || []
    const excludeListText = existingNames.length > 0 
      ? `\n\nIMPORTANTE - NO sugieras estas fuentes que ya tenemos en la base de datos:\n${existingNames.join('\n')}\n`
      : ''

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
- Sugiere hasta 25 fuentes relevantes (cuantas más mejor, siempre que sean de calidad)
- Prioriza fuentes actuales, activas y verificables
- Incluye URLs reales que existan
- Varía los tipos de fuentes: webs, directorios, ferias, aceleradoras, newsletters, etc.
- Para ferias y eventos, menciona si son anuales y su próxima edición si es conocida
- NO repitas fuentes que ya estén en la lista de exclusión${excludeListText}

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
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
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
    const allSources = parsedResult.sources
      .filter((s: any) => s.nombre && s.url)
      .map((s: any) => ({
        nombre: s.nombre?.trim() || '',
        url: s.url?.trim() || '',
        descripcion: s.descripcion?.trim() || '',
        tipo: s.tipo || 'web',
        pais: s.pais || 'Global',
        sector_foco: s.sector_foco || 'general',
      }))

    // Filter out sources that already exist in the database (double check)
    const existingUrlsNormalized = new Set(
      (existingSources || []).map(s => normalizeUrl(s.url))
    )
    const existingNamesNormalized = new Set(
      (existingSources || []).map(s => normalizeName(s.nombre))
    )

    const newSources: any[] = []
    const existingFoundSources: any[] = []

    for (const source of allSources) {
      const normalizedUrl = normalizeUrl(source.url)
      const normalizedName = normalizeName(source.nombre)
      
      if (existingUrlsNormalized.has(normalizedUrl) || existingNamesNormalized.has(normalizedName)) {
        existingFoundSources.push({ ...source, alreadyExists: true })
      } else {
        newSources.push({ ...source, alreadyExists: false })
      }
    }

    console.log(`[SEARCH-SOURCES] AI suggested ${allSources.length} sources`)
    console.log(`[SEARCH-SOURCES] New sources: ${newSources.length}, Already exist: ${existingFoundSources.length}`)

    // Return both new and existing sources with flag
    const combinedSources = [...newSources, ...existingFoundSources]

    return new Response(
      JSON.stringify({
        success: true,
        sources: combinedSources,
        newCount: newSources.length,
        existingCount: existingFoundSources.length,
        explanation: parsedResult.explanation || `Se encontraron ${newSources.length} fuentes nuevas${existingFoundSources.length > 0 ? ` (${existingFoundSources.length} ya en tu lista)` : ''}.`,
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
