import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fields that might not exist in the external database
// These will be removed before syncing to prevent errors
const FIELDS_TO_EXCLUDE: Record<string, string[]> = {
  technologies: [
    'tipo_id',
    'subcategoria_id', 
    'sector_id',
    'subsector_industrial',
    'quality_score',
    'review_status',
    'review_requested_at',
    'review_requested_by',
    'reviewer_id',
    'updated_by',
    'created_by',
    'approved_by',
    'approved_at',
    'version',
    'reviewed_at',
  ],
  project_technologies: [
    'added_by',
  ],
  scouting_queue: [
    'tipo_id',
    'subcategoria_id',
    'sector_id',
    'subsector_industrial',
    'created_by',
    'reviewed_by',
  ],
  rejected_technologies: [
    'tipo_id',
    'subcategoria_id',
    'sector_id',
    'subsector_industrial',
    'rejected_by',
    'original_data',
  ],
  scouting_sources: [
    'created_by',
  ],
}

// Clean record by removing fields that don't exist in external DB
function cleanRecordForSync(table: string, record: Record<string, unknown>): Record<string, unknown> {
  const fieldsToExclude = FIELDS_TO_EXCLUDE[table] || []
  
  if (fieldsToExclude.length === 0) {
    return record
  }
  
  const cleanedRecord: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(record)) {
    if (!fieldsToExclude.includes(key)) {
      cleanedRecord[key] = value
    }
  }
  
  console.log(`Cleaned record for ${table}, removed fields:`, fieldsToExclude.filter(f => f in record))
  
  return cleanedRecord
}

// Format error for detailed logging
function formatError(error: unknown): { message: string; details: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        ...(error as any).details && { details: (error as any).details },
        ...(error as any).hint && { hint: (error as any).hint },
        ...(error as any).code && { code: (error as any).code },
      }
    }
  }
  
  if (typeof error === 'object' && error !== null) {
    return {
      message: (error as any).message || 'Unknown error',
      details: error
    }
  }
  
  return {
    message: String(error),
    details: null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, table, record, recordId } = body

    console.log(`Syncing to external Supabase: ${action} on ${table}`)
    console.log(`Record ID: ${recordId || record?.id || 'N/A'}`)

    // External Supabase client (destination - user's original Supabase)
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    let result

    switch (action) {
      case 'INSERT': {
        // Clean the record before inserting
        const cleanedRecord = cleanRecordForSync(table, record)
        console.log(`INSERT - Original fields: ${Object.keys(record).length}, Cleaned fields: ${Object.keys(cleanedRecord).length}`)
        
        const { data: insertData, error: insertError } = await externalSupabase
          .from(table)
          .insert(cleanedRecord)
          .select()

        if (insertError) {
          const formatted = formatError(insertError)
          console.error(`INSERT Error on ${table}:`, JSON.stringify(formatted, null, 2))
          console.error(`Failed record keys:`, Object.keys(cleanedRecord))
          throw new Error(`INSERT failed: ${formatted.message} - ${JSON.stringify(formatted.details)}`)
        }
        result = { action: 'INSERT', data: insertData }
        break
      }

      case 'UPDATE': {
        // Clean the record before updating
        const cleanedRecord = cleanRecordForSync(table, record)
        console.log(`UPDATE - Original fields: ${Object.keys(record).length}, Cleaned fields: ${Object.keys(cleanedRecord).length}`)
        
        const { data: updateData, error: updateError } = await externalSupabase
          .from(table)
          .update(cleanedRecord)
          .eq('id', recordId)
          .select()

        if (updateError) {
          const formatted = formatError(updateError)
          console.error(`UPDATE Error on ${table}:`, JSON.stringify(formatted, null, 2))
          console.error(`Failed record keys:`, Object.keys(cleanedRecord))
          throw new Error(`UPDATE failed: ${formatted.message} - ${JSON.stringify(formatted.details)}`)
        }
        result = { action: 'UPDATE', data: updateData }
        break
      }

      case 'DELETE': {
        console.log(`DELETE - Removing record ${recordId} from ${table}`)
        
        const { error: deleteError } = await externalSupabase
          .from(table)
          .delete()
          .eq('id', recordId)

        if (deleteError) {
          const formatted = formatError(deleteError)
          console.error(`DELETE Error on ${table}:`, JSON.stringify(formatted, null, 2))
          throw new Error(`DELETE failed: ${formatted.message} - ${JSON.stringify(formatted.details)}`)
        }
        result = { action: 'DELETE', id: recordId }
        break
      }

      case 'UPSERT': {
        // Clean the record before upserting
        const cleanedRecord = cleanRecordForSync(table, record)
        console.log(`UPSERT - Original fields: ${Object.keys(record).length}, Cleaned fields: ${Object.keys(cleanedRecord).length}`)
        
        const { data: upsertData, error: upsertError } = await externalSupabase
          .from(table)
          .upsert(cleanedRecord, { onConflict: 'id' })
          .select()

        if (upsertError) {
          const formatted = formatError(upsertError)
          console.error(`UPSERT Error on ${table}:`, JSON.stringify(formatted, null, 2))
          console.error(`Failed record keys:`, Object.keys(cleanedRecord))
          throw new Error(`UPSERT failed: ${formatted.message} - ${JSON.stringify(formatted.details)}`)
        }
        result = { action: 'UPSERT', data: upsertData }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    console.log('Sync successful:', JSON.stringify(result, null, 2))

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const formatted = formatError(error)
    console.error('Sync error:', formatted.message)
    console.error('Error details:', JSON.stringify(formatted.details, null, 2))
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: formatted.message,
        details: formatted.details 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
