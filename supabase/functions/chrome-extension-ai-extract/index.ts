import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { pageContent, pageUrl, pageTitle } = body

    if (!pageContent || pageContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'No hay suficiente contenido en la página para analizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Analyzing page:', pageUrl, 'Content length:', pageContent.length)

    // Truncate content if too long (keep first 8000 chars for context)
    const truncatedContent = pageContent.length > 8000 
      ? pageContent.substring(0, 8000) + '...[contenido truncado]'
      : pageContent

    const systemPrompt = `Eres un experto analista de tecnologías del sector industrial, agrícola y medioambiental. 
Tu tarea es extraer información sobre tecnologías innovadoras de páginas web.

Analiza el contenido de la página y extrae la siguiente información si está disponible:
- Nombre de la tecnología o producto principal
- Empresa o proveedor que lo ofrece
- Descripción técnica breve (máximo 200 palabras)
- País de origen de la empresa

IMPORTANTE:
- Si la página no contiene información sobre una tecnología específica, responde con un JSON vacío
- Solo extrae información que esté claramente presente en el contenido
- Si no encuentras algún campo, déjalo como null
- Responde SOLO con JSON válido, sin texto adicional`

    const userPrompt = `Analiza esta página web y extrae información sobre la tecnología:

URL: ${pageUrl}
Título: ${pageTitle}

Contenido de la página:
${truncatedContent}

Responde con un JSON con esta estructura exacta:
{
  "technology_name": "nombre de la tecnología o null",
  "provider": "nombre de la empresa o null",
  "description": "descripción técnica breve o null",
  "country": "país de origen o null",
  "is_technology_page": true/false
}`

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI gateway error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Límite de solicitudes excedido, intenta más tarde' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Error al analizar con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices?.[0]?.message?.content

    if (!content) {
      console.error('No content in AI response')
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo obtener respuesta de la IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON response from AI
    let extractedData
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()
      
      extractedData = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return new Response(
        JSON.stringify({ success: false, error: 'Error al procesar respuesta de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Extracted data:', extractedData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          technology_name: extractedData.technology_name || null,
          provider: extractedData.provider || null,
          description: extractedData.description || null,
          country: extractedData.country || null,
          is_technology_page: extractedData.is_technology_page ?? false
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('AI extraction error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
