import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}

/**
 * Webhook to receive document processing status updates from Railway.
 * 
 * Expected payload from Railway:
 * {
 *   document_id: string,       // ID of the document in cost_consulting_documents
 *   project_id: string,        // Project ID for reference
 *   status: 'completed' | 'failed' | 'processing',
 *   error_message?: string,    // Only when status = 'failed'
 *   extracted_data?: object,   // Only when status = 'completed'
 *   entities_created?: {       // Summary of what was extracted
 *     contracts: number,
 *     invoices: number
 *   }
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate secret
    const secret = req.headers.get('X-Sync-Secret')
    const expectedSecret = Deno.env.get('RAILWAY_SYNC_SECRET')
    
    if (!secret || secret !== expectedSecret) {
      console.error('[COST-DOC-WEBHOOK] Unauthorized request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    const { 
      document_id, 
      project_id,
      status,
      error_message,
      extracted_data,
      entities_created
    } = payload

    console.log(`[COST-DOC-WEBHOOK] Received callback for document: ${document_id}, status: ${status}`)
    console.log(`[COST-DOC-WEBHOOK] Full payload:`, JSON.stringify(payload))

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to external database where cost consulting data lives
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')
    
    if (!externalUrl || !externalKey) {
      console.error('[COST-DOC-WEBHOOK] External database not configured')
      return new Response(
        JSON.stringify({ error: 'External database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(externalUrl, externalKey)

    // Build update payload based on status
    const updateData: Record<string, unknown> = {
      extraction_status: status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'failed' && error_message) {
      updateData.extraction_error = error_message
      console.log(`[COST-DOC-WEBHOOK] Document failed: ${error_message}`)
    }

    if (status === 'completed') {
      // Clear any previous error
      updateData.extraction_error = null
      
      if (extracted_data) {
        updateData.extracted_data = extracted_data
      }
      
      if (entities_created) {
        updateData.entities_created = entities_created
        console.log(`[COST-DOC-WEBHOOK] Entities created: ${JSON.stringify(entities_created)}`)
      }
    }

    console.log(`[COST-DOC-WEBHOOK] Updating document ${document_id} with:`, JSON.stringify(updateData))

    // Update the document in cost_consulting_documents table
    const { error: updateError } = await supabase
      .from('cost_consulting_documents')
      .update(updateData)
      .eq('id', document_id)

    if (updateError) {
      console.error('[COST-DOC-WEBHOOK] Error updating document:', updateError)
      throw updateError
    }

    console.log(`[COST-DOC-WEBHOOK] Document ${document_id} updated successfully with status: ${status}`)

    // If project_id provided, we could also update project-level stats here
    if (project_id && status === 'failed') {
      // Optionally increment failed document count or trigger notification
      console.log(`[COST-DOC-WEBHOOK] Project ${project_id} has a failed document`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_id, 
        status,
        message: `Document status updated to ${status}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[COST-DOC-WEBHOOK] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
