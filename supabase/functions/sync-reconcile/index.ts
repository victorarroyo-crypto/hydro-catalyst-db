import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v5 as uuidv5 } from 'https://esm.sh/uuid@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UUID namespace OID - same as PostgreSQL's uuid_ns_oid()
const UUID_NS_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8'

// Campos a excluir del payload para technologies
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

// Convert integer ID to UUID using same algorithm as PostgreSQL uuid_generate_v5(uuid_ns_oid(), id::text)
function integerToUuid(id: number): string {
  return uuidv5(id.toString(), UUID_NS_OID)
}

interface ReconcileResult {
  missing_in_external: number
  orphaned_in_external: number
  queued_for_sync: number
  queued_for_delete: number
  total_lovable: number
  total_external: number
  errors: string[]
}

interface ReconcileTableOptions {
  tableName: string
  idField: string
  idIsInteger: boolean
  cleanPayloadFn?: (record: Record<string, unknown>) => Record<string, unknown>
}

async function reconcileTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lovable: SupabaseClient<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  external: SupabaseClient<any, any, any>,
  options: ReconcileTableOptions
): Promise<ReconcileResult> {
  const { tableName, idField, idIsInteger, cleanPayloadFn } = options
  
  const result: ReconcileResult = {
    missing_in_external: 0,
    orphaned_in_external: 0,
    queued_for_sync: 0,
    queued_for_delete: 0,
    total_lovable: 0,
    total_external: 0,
    errors: []
  }

  try {
    console.log(`[sync-reconcile] Fetching ${tableName} IDs from Lovable...`)
    const { data: lovableRecords, error: lovableError } = await lovable
      .from(tableName)
      .select(idField)
    
    if (lovableError) {
      result.errors.push(`Error fetching Lovable ${tableName}: ${lovableError.message}`)
      return result
    }

    console.log(`[sync-reconcile] Fetching ${tableName} IDs from External...`)
    const { data: externalRecords, error: externalError } = await external
      .from(tableName)
      .select(idField)
    
    if (externalError) {
      result.errors.push(`Error fetching External ${tableName}: ${externalError.message}`)
      return result
    }

    // Convert to string for comparison
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lovableIds = new Set((lovableRecords || []).map((r: any) => String(r[idField])))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const externalIds = new Set((externalRecords || []).map((r: any) => String(r[idField])))

    result.total_lovable = lovableIds.size
    result.total_external = externalIds.size

    console.log(`[sync-reconcile] ${tableName}: Lovable=${lovableIds.size}, External=${externalIds.size}`)

    // Find discrepancies
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

    result.missing_in_external = missingInExternal.length
    result.orphaned_in_external = orphanedInExternal.length

    console.log(`[sync-reconcile] ${tableName}: Missing=${missingInExternal.length}, Orphaned=${orphanedInExternal.length}`)

    // Queue missing records for RECONCILE_INSERT
    if (missingInExternal.length > 0) {
      // Batch fetch full records (convert to proper type if integer)
      const idsToFetch = idIsInteger 
        ? missingInExternal.map(id => parseInt(id)) 
        : missingInExternal

      const { data: fullRecords, error: fullError } = await lovable
        .from(tableName)
        .select('*')
        .in(idField, idsToFetch)

      if (fullError) {
        result.errors.push(`Error fetching full ${tableName} records: ${fullError.message}`)
      } else if (fullRecords) {
        for (const record of fullRecords) {
          const originalId = record[idField]
          const recordId = idIsInteger ? integerToUuid(originalId as number) : originalId as string
          const payload = cleanPayloadFn ? cleanPayloadFn(record) : record
          
          const { error: insertError } = await lovable
            .from('sync_queue')
            .insert({
              table_name: tableName,
              operation: 'RECONCILE_INSERT',
              record_id: recordId,
              payload: payload
            })

          if (insertError) {
            result.errors.push(`Error queuing RECONCILE_INSERT for ${tableName}/${originalId}: ${insertError.message}`)
          } else {
            result.queued_for_sync++
          }
        }
      }
    }

    // Queue orphaned records for RECONCILE_DELETE
    for (const id of orphanedInExternal) {
      const originalId = idIsInteger ? parseInt(id) : id
      const recordId = idIsInteger ? integerToUuid(parseInt(id)) : id
      
      const { error: insertError } = await lovable
        .from('sync_queue')
        .insert({
          table_name: tableName,
          operation: 'RECONCILE_DELETE',
          record_id: recordId,
          payload: { id: originalId, _reason: 'orphaned' }
        })

      if (insertError) {
        result.errors.push(`Error queuing RECONCILE_DELETE for ${tableName}/${id}: ${insertError.message}`)
      } else {
        result.queued_for_delete++
      }
    }
  } catch (error) {
    result.errors.push(`Unexpected error in ${tableName}: ${error instanceof Error ? error.message : String(error)}`)
  }

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('[sync-reconcile] Starting reconciliation for all tables')

  try {
    // Supabase clients
    const lovableUrl = Deno.env.get('SUPABASE_URL')!
    const lovableKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')!

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const lovable = createClient(lovableUrl, lovableKey)
    const external = createClient(externalUrl, externalKey)

    // Reconcile technologies (UUID id)
    const technologiesResult = await reconcileTable(lovable, external, {
      tableName: 'technologies',
      idField: 'id',
      idIsInteger: false,
      cleanPayloadFn: cleanPayload
    })

    // Reconcile taxonomy_subcategorias (INTEGER id)
    const subcategoriasResult = await reconcileTable(lovable, external, {
      tableName: 'taxonomy_subcategorias',
      idField: 'id',
      idIsInteger: true
      // No cleanPayloadFn needed - send full record
    })

    const duration = Date.now() - startTime
    console.log(`[sync-reconcile] Completed in ${duration}ms`)

    return new Response(JSON.stringify({
      success: true,
      technologies: technologiesResult,
      taxonomy_subcategorias: subcategoriasResult,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[sync-reconcile] Fatal error:', errorMessage)
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      duration_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
