import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let batch_size = 50
    let limit = 0

    try {
      const body = await req.json()
      batch_size = body.batch_size ?? 50
      limit = body.limit ?? 0
    } catch {
      // Si no hay body, usar defaults
    }

    console.log('=== generate-chunk-embeddings started ===')
    console.log(`Options: batch_size=${batch_size}, limit=${limit}`)
    
    const externa = createClient(
      Deno.env.get('EXTERNAL_SUPABASE_URL')!,
      Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')!
    )
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

    // Leer chunks sin embedding
    let query = externa
      .from('knowledge_chunks')
      .select('id, content')
      .is('embedding', null)
      .order('created_at')
    
    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data: chunks, error: readError } = await query
    if (readError) throw readError

    console.log(`Chunks sin embedding: ${chunks?.length || 0}`)

    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No hay chunks pendientes de embedding',
        chunks_processed: 0,
        chunks_total: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let processed = 0
    const errors: string[] = []

    // Procesar en lotes
    for (let i = 0; i < chunks.length; i += batch_size) {
      const batch = chunks.slice(i, i + batch_size)
      
      // Limitar contenido a ~8000 caracteres para evitar exceder tokens
      const texts = batch.map(c => c.content.substring(0, 8000))
      
      console.log(`Procesando batch ${Math.floor(i/batch_size)+1}: ${batch.length} chunks`)

      // Generar embeddings con OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts
        })
      })

      if (!embeddingResponse.ok) {
        const errText = await embeddingResponse.text()
        const errorMsg = `OpenAI error batch ${Math.floor(i/batch_size)+1}: ${errText}`
        console.error(errorMsg)
        errors.push(errorMsg)
        continue
      }

      const embeddingData = await embeddingResponse.json()
      
      // Actualizar cada chunk con su embedding
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = embeddingData.data[j]?.embedding

        if (!embedding) {
          errors.push(`No embedding for chunk ${chunk.id}`)
          continue
        }

        const { error: updateError } = await externa
          .from('knowledge_chunks')
          .update({ 
            embedding: embedding,
            embedding_updated_at: new Date().toISOString()
          })
          .eq('id', chunk.id)

        if (updateError) {
          errors.push(`Update chunk ${chunk.id}: ${updateError.message}`)
        } else {
          processed++
        }
      }

      console.log(`Procesados ${processed}/${chunks.length} chunks`)
      
      // Pausa entre batches para evitar rate limits de OpenAI
      if (i + batch_size < chunks.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    const response = {
      success: errors.length === 0,
      chunks_processed: processed,
      chunks_total: chunks.length,
      chunks_pending: chunks.length - processed,
      errors: errors.slice(0, 10) // Solo primeros 10 errores
    }

    console.log('=== generate-chunk-embeddings completed ===')
    console.log(JSON.stringify(response, null, 2))

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('generate-chunk-embeddings error:', message)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
