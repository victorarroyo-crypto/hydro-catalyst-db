import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Documento con datos binarios corruptos (PDF no parseado correctamente)
const CORRUPT_DOCUMENT_IDS = ['2874fa5f-491c-4845-ba0a-4f872ebd7462']

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse body o usar defaults
    let document_id: string | undefined
    let exclude_corrupt = true
    let batch_size = 100

    try {
      const body = await req.json()
      document_id = body.document_id
      exclude_corrupt = body.exclude_corrupt ?? true
      batch_size = body.batch_size ?? 100
    } catch {
      // Si no hay body, usar defaults
    }

    console.log('=== sync-knowledge-chunks started ===')
    console.log(`Options: document_id=${document_id}, exclude_corrupt=${exclude_corrupt}, batch_size=${batch_size}`)

    // Cliente Lovable (origen)
    const lovable = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Cliente Externa (Railway - destino)
    const externa = createClient(
      Deno.env.get('EXTERNAL_SUPABASE_URL')!,
      Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')!
    )

    // Primero contar total de chunks para manejar paginación
    let countQuery = lovable.from('knowledge_chunks').select('id', { count: 'exact', head: true })
    
    if (document_id) {
      countQuery = countQuery.eq('document_id', document_id)
    }
    
    if (exclude_corrupt) {
      for (const corruptId of CORRUPT_DOCUMENT_IDS) {
        countQuery = countQuery.neq('document_id', corruptId)
      }
    }

    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) throw countError
    
    console.log(`Total chunks a sincronizar: ${totalCount}`)

    // Leer chunks con paginación (Supabase limita a 1000 por query)
    const allChunks: any[] = []
    const pageSize = 1000
    let offset = 0

    while (offset < (totalCount || 0)) {
      let query = lovable.from('knowledge_chunks')
        .select('id, document_id, content, chunk_index, tokens')
        .range(offset, offset + pageSize - 1)
        .order('document_id')
        .order('chunk_index')

      if (document_id) {
        query = query.eq('document_id', document_id)
      }

      if (exclude_corrupt) {
        for (const corruptId of CORRUPT_DOCUMENT_IDS) {
          query = query.neq('document_id', corruptId)
        }
      }

      const { data: pageChunks, error: readError } = await query

      if (readError) throw readError

      allChunks.push(...(pageChunks || []))
      offset += pageSize
      
      console.log(`Leídos ${allChunks.length}/${totalCount} chunks`)
    }

    console.log(`Chunks totales leídos: ${allChunks.length}`)

    // Insertar en lotes en BD Externa
    let synced = 0
    const errors: string[] = []

    for (let i = 0; i < allChunks.length; i += batch_size) {
      const batch = allChunks.slice(i, i + batch_size)

      const inserts = batch.map(c => ({
        lovable_id: c.id,
        document_id: c.document_id,
        content: c.content,
        chunk_index: c.chunk_index,
        tokens: c.tokens
      }))

      const { error: insertError } = await externa
        .from('kb_chunks')
        .upsert(inserts, { onConflict: 'lovable_id' })

      if (insertError) {
        const errorMsg = `Batch ${Math.floor(i/batch_size)+1}: ${insertError.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      } else {
        synced += batch.length
        console.log(`Sincronizados ${synced}/${allChunks.length} chunks`)
      }
    }

    // Contar documentos únicos procesados
    const uniqueDocs = new Set(allChunks.map(c => c.document_id)).size

    const response = {
      success: errors.length === 0,
      chunks_synced: synced,
      chunks_total: allChunks.length,
      documents_processed: uniqueDocs,
      excluded_corrupt: exclude_corrupt ? CORRUPT_DOCUMENT_IDS.length : 0,
      errors
    }

    console.log('=== sync-knowledge-chunks completed ===')
    console.log(JSON.stringify(response, null, 2))

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('sync-knowledge-chunks error:', message)

    return new Response(JSON.stringify({
      success: false,
      error: message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
