import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Campos a excluir del payload (igual que el trigger)
const EXCLUDED_FIELDS = [
  'tipo_id', 'subcategoria_id', 'sector_id', 'subsector_industrial',
  'quality_score', 'review_status', 'review_requested_at',
  'review_requested_by', 'reviewed_at', 'reviewer_id'
]

function cleanPayload(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...record }
  for (const field of EXCLUDED_FIELDS) {
    delete cleaned[field]
  }
  return cleaned
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('[sync-reconcile] Starting reconciliation')

  try {
    // Clientes de Supabase
    const lovableUrl = Deno.env.get('SUPABASE_URL')!
    const lovableKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')!

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const lovable = createClient(lovableUrl, lovableKey)
    const external = createClient(externalUrl, externalKey)

    // 1. Obtener IDs de Lovable
    console.log('[sync-reconcile] Fetching IDs from Lovable...')
    const { data: lovableRecords, error: lovableError } = await lovable
      .from('technologies')
      .select('id')
    
    if (lovableError) {
      throw new Error(`Error fetching Lovable IDs: ${lovableError.message}`)
    }

    // 2. Obtener IDs de Externa
    console.log('[sync-reconcile] Fetching IDs from External...')
    const { data: externalRecords, error: externalError } = await external
      .from('technologies')
      .select('id')
    
    if (externalError) {
      throw new Error(`Error fetching External IDs: ${externalError.message}`)
    }

    const lovableIds = new Set((lovableRecords || []).map(r => r.id))
    const externalIds = new Set((externalRecords || []).map(r => r.id))

    console.log(`[sync-reconcile] Lovable: ${lovableIds.size} records, External: ${externalIds.size} records`)

    // 3. Encontrar diferencias
    const missingInExternal: string[] = []
    const orphanedInExternal: string[] = []

    for (const id of lovableIds) {
      if (!externalIds.has(id)) {
        missingInExternal.push(id)
      }
    }

    for (const id of externalIds) {
      if (!lovableIds.has(id)) {
        orphanedInExternal.push(id)
      }
    }

    console.log(`[sync-reconcile] Missing in external: ${missingInExternal.length}, Orphaned: ${orphanedInExternal.length}`)

    let queuedForSync = 0
    let queuedForDelete = 0

    // 4. Encolar RECONCILE_INSERT para los que faltan en externa
    if (missingInExternal.length > 0) {
      // Obtener registros completos
      const { data: fullRecords, error: fullError } = await lovable
        .from('technologies')
        .select('*')
        .in('id', missingInExternal)

      if (fullError) {
        console.error('[sync-reconcile] Error fetching full records:', fullError.message)
      } else if (fullRecords) {
        for (const record of fullRecords) {
          const cleanedPayload = cleanPayload(record)
          
          const { error: insertError } = await lovable
            .from('sync_queue')
            .insert({
              table_name: 'technologies',
              operation: 'RECONCILE_INSERT',
              record_id: record.id,
              payload: cleanedPayload
            })

          if (insertError) {
            console.error(`[sync-reconcile] Error queuing RECONCILE_INSERT for ${record.id}:`, insertError.message)
          } else {
            queuedForSync++
          }
        }
      }
    }

    // 5. Encolar RECONCILE_DELETE para los huérfanos en externa
    for (const id of orphanedInExternal) {
      const { error: insertError } = await lovable
        .from('sync_queue')
        .insert({
          table_name: 'technologies',
          operation: 'RECONCILE_DELETE',
          record_id: id,
          payload: { id, _reason: 'orphaned' }
        })

      if (insertError) {
        console.error(`[sync-reconcile] Error queuing RECONCILE_DELETE for ${id}:`, insertError.message)
      } else {
        queuedForDelete++
      }
    }

    const duration = Date.now() - startTime
    console.log(`[sync-reconcile] Completed in ${duration}ms`)

    return new Response(JSON.stringify({
      success: true,
      missing_in_external: missingInExternal.length,
      orphaned_in_external: orphanedInExternal.length,
      queued_for_sync: queuedForSync,
      queued_for_delete: queuedForDelete,
      total_lovable: lovableIds.size,
      total_external: externalIds.size,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[sync-reconcile] Fatal error:', errorMessage)
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
