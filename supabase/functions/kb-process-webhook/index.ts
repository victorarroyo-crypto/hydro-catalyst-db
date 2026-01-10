import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate secret
    const secret = req.headers.get('X-Sync-Secret')
    const expectedSecret = Deno.env.get('RAILWAY_SYNC_SECRET')
    
    if (!secret || secret !== expectedSecret) {
      console.error('[KB-WEBHOOK] Unauthorized request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    const { 
      document_id, 
      status,
      chunk_count,
      chunks_created,  // Railway puede enviar este campo
      description,
      error_message,
      chunks  // Railway puede enviar los chunks aquí
    } = payload

    // Usar chunks_created si existe, chunk_count como fallback
    const finalChunkCount = chunks_created ?? chunk_count

    console.log(`[KB-WEBHOOK] Received callback for document: ${document_id}, status: ${status}`)
    console.log(`[KB-WEBHOOK] chunk_count: ${chunk_count}, chunks_created: ${chunks_created}, finalChunkCount: ${finalChunkCount}`)
    console.log(`[KB-WEBHOOK] chunks array length: ${chunks?.length ?? 'not provided'}`)
    console.log(`[KB-WEBHOOK] Full payload:`, JSON.stringify(payload))

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Si Railway envía los chunks, insertarlos en knowledge_chunks
    let insertedChunksCount = 0
    if (chunks && Array.isArray(chunks) && chunks.length > 0) {
      console.log(`[KB-WEBHOOK] Inserting ${chunks.length} chunks for document ${document_id}`)
      
      // Primero eliminar chunks existentes para este documento (por si es reprocesamiento)
      const { error: deleteError } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', document_id)
      
      if (deleteError) {
        console.error('[KB-WEBHOOK] Error deleting old chunks:', deleteError)
      }
      
      const chunksToInsert = chunks.map((chunk: { content?: string; text?: string; chunk_index?: number; tokens?: number }, index: number) => ({
        document_id: document_id,
        content: chunk.content || chunk.text || '',
        chunk_index: chunk.chunk_index ?? index,
        tokens: chunk.tokens || null
      }))
      
      const { error: insertError, data: insertedData } = await supabase
        .from('knowledge_chunks')
        .insert(chunksToInsert)
        .select('id')
      
      if (insertError) {
        console.error('[KB-WEBHOOK] Error inserting chunks:', insertError)
      } else {
        insertedChunksCount = insertedData?.length || chunksToInsert.length
        console.log(`[KB-WEBHOOK] Successfully inserted ${insertedChunksCount} chunks`)
      }
    }

    // Update document in Lovable
    const updateData: Record<string, unknown> = {
      status: status || 'processed',
      updated_at: new Date().toISOString(),
    }

    // Usar el conteo real de chunks insertados si se insertaron, sino usar el valor del payload
    if (insertedChunksCount > 0) {
      updateData.chunk_count = insertedChunksCount
    } else if (finalChunkCount !== undefined) {
      updateData.chunk_count = finalChunkCount
    }

    // If status is 'failed' and there's an error_message, store it in description
    if (status === 'failed' && error_message) {
      updateData.description = `Error: ${error_message}`
      console.log(`[KB-WEBHOOK] Storing error message: ${error_message}`)
    } else if (description) {
      // Only update description if provided and not a failure
      updateData.description = description
    }

    console.log(`[KB-WEBHOOK] Updating document ${document_id} with:`, JSON.stringify(updateData))

    const { error: updateError } = await supabase
      .from('knowledge_documents')
      .update(updateData)
      .eq('id', document_id)

    if (updateError) {
      console.error('[KB-WEBHOOK] Error updating document:', updateError)
      throw updateError
    }

    console.log(`[KB-WEBHOOK] Document ${document_id} updated successfully with status: ${status}, chunks: ${updateData.chunk_count}`)

    return new Response(
      JSON.stringify({ success: true, document_id, status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[KB-WEBHOOK] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
