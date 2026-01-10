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

    const { 
      document_id, 
      status,
      chunk_count,
      description,
      error_message 
    } = await req.json()

    console.log(`[KB-WEBHOOK] Received callback for document: ${document_id}, status: ${status}`)

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update document in Lovable
    const updateData: Record<string, unknown> = {
      status: status || 'processed',
      updated_at: new Date().toISOString(),
    }

    if (chunk_count !== undefined) {
      updateData.chunk_count = chunk_count
    }

    if (description) {
      updateData.description = description
    }

    const { error: updateError } = await supabase
      .from('knowledge_documents')
      .update(updateData)
      .eq('id', document_id)

    if (updateError) {
      console.error('[KB-WEBHOOK] Error updating document:', updateError)
      throw updateError
    }

    console.log(`[KB-WEBHOOK] Document ${document_id} updated successfully`)

    return new Response(
      JSON.stringify({ success: true, document_id }),
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
