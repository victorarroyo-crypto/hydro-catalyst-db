import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { documentId, forceReprocess } = await req.json()
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[KB-PROCESS] Document: ${documentId}, force: ${forceReprocess}`)

    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error(`[KB-PROCESS] Document not found:`, docError)
      return new Response(
        JSON.stringify({ error: 'Document not found', details: docError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[KB-PROCESS] Found document: ${document.name}, status: ${document.status}`)

    // Delete existing chunks if force reprocess
    if (forceReprocess) {
      console.log(`[KB-PROCESS] Deleting existing chunks for document ${documentId}`)
      const { error: deleteError } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', documentId)
      
      if (deleteError) {
        console.error(`[KB-PROCESS] Error deleting chunks:`, deleteError)
      } else {
        console.log(`[KB-PROCESS] Chunks deleted successfully`)
      }
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('knowledge_documents')
      .update({ status: 'processing', chunk_count: 0, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    if (updateError) {
      console.error(`[KB-PROCESS] Error updating status:`, updateError)
    }

    // Build public URL for the file
    const file_url = `${supabaseUrl}/storage/v1/object/public/knowledge-documents/${document.file_path}`
    console.log(`[KB-PROCESS] File URL: ${file_url}`)

    // Get Railway config from secrets
    const railwayUrl = Deno.env.get('RAILWAY_API_URL')
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET')

    if (!railwayUrl || !syncSecret) {
      console.error(`[KB-PROCESS] Railway config missing - URL: ${!!railwayUrl}, Secret: ${!!syncSecret}`)
      
      // Mark as error
      await supabase
        .from('knowledge_documents')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', documentId)
      
      return new Response(
        JSON.stringify({ error: 'Railway configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const endpoint = `${railwayUrl}/api/kb/process-pdf`
    console.log(`[KB-PROCESS] Sending to Railway: ${endpoint}`)

    const payload = {
      document_id: documentId,
      file_url,
      lovable_id: documentId,
      file_name: document.name,
      category: document.category || null,
      sector: document.sector || null,
    }
    console.log(`[KB-PROCESS] Payload:`, JSON.stringify(payload))

    // Send to Railway for PyMuPDF processing
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': syncSecret,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log(`[KB-PROCESS] Railway response: ${response.status} - ${responseText}`)

    if (!response.ok) {
      console.error(`[KB-PROCESS] Railway error: ${response.status}`)
      
      // Mark document as error
      await supabase
        .from('knowledge_documents')
        .update({ 
          status: 'error', 
          description: `Railway error: ${response.status}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId)
      
      return new Response(
        JSON.stringify({ error: `Railway error: ${response.status}`, details: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result = {}
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { raw: responseText }
    }

    console.log(`[KB-PROCESS] Success - Document sent to Railway for processing`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document sent to Railway for PyMuPDF processing',
        document_id: documentId,
        file_url,
        railway_response: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[KB-PROCESS] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
