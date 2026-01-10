import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry fetch with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  timeoutMs = 55000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[KB-PROCESS] Fetch attempt ${attempt + 1}/${maxRetries}`);
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error (5xx) - retry with backoff
      if (response.status >= 500) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[KB-PROCESS] Server error ${response.status}, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[KB-PROCESS] Request timed out');
        throw new Error('Request timed out after 55 seconds');
      }
      
      // Network error - retry with backoff
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[KB-PROCESS] Network error, retrying in ${delay}ms: ${error}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
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

    // Get Railway config from secrets BEFORE changing status
    const railwayUrl = Deno.env.get('RAILWAY_API_URL')
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET')

    if (!railwayUrl || !syncSecret) {
      console.error(`[KB-PROCESS] Railway config missing - URL: ${!!railwayUrl}, Secret: ${!!syncSecret}`)
      
      return new Response(
        JSON.stringify({ error: 'Railway configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate signed URL (valid for 1 hour) - bucket is not public
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('knowledge-documents')
      .createSignedUrl(document.file_path, 3600) // 3600 seconds = 1 hour

    if (signedError || !signedUrlData?.signedUrl) {
      console.error(`[KB-PROCESS] Error creating signed URL:`, signedError)
      console.error(`[KB-PROCESS] File path attempted: ${document.file_path}`)
      
      const errorMessage = signedError?.message?.includes('Object not found')
        ? `Archivo no encontrado en storage: ${document.file_path}. El documento debe ser subido de nuevo.`
        : `Error creating signed URL: ${signedError?.message}`
      
      await supabase
        .from('knowledge_documents')
        .update({ 
          status: 'failed', 
          description: errorMessage,
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId)
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          file_path: document.file_path,
          suggestion: 'El archivo PDF no existe en el storage. Elimina este registro y sube el documento de nuevo.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Now update status to processing since we verified everything is ready
    const { error: updateError } = await supabase
      .from('knowledge_documents')
      .update({ status: 'processing', chunk_count: 0, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    if (updateError) {
      console.error(`[KB-PROCESS] Error updating status:`, updateError)
    }

    const file_url = signedUrlData.signedUrl
    console.log(`[KB-PROCESS] Signed URL created for ${document.name}`)

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

    try {
      // Send to Railway for PyMuPDF processing with retry and timeout
      const response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Secret': syncSecret,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text()
      console.log(`[KB-PROCESS] Railway response: ${response.status} - ${responseText}`)

      if (!response.ok) {
        console.error(`[KB-PROCESS] Railway error: ${response.status}`)
        
        // Mark document as failed
        await supabase
          .from('knowledge_documents')
          .update({ 
            status: 'failed', 
            description: `Railway error: ${response.status} - ${responseText.substring(0, 200)}`,
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
    } catch (fetchError) {
      console.error('[KB-PROCESS] Fetch error:', fetchError)
      
      // Mark document as failed due to timeout/network error
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown network error'
      await supabase
        .from('knowledge_documents')
        .update({ 
          status: 'failed', 
          description: `Error de conexión: ${errorMsg}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId)
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('[KB-PROCESS] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
