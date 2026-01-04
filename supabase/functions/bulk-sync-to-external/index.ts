import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { tables = ['taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores', 'technologies'] } = body

    console.log('Starting bulk sync for tables:', tables)

    // Internal Supabase client (source - Lovable Cloud)
    const internalUrl = Deno.env.get('SUPABASE_URL')
    const internalKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!internalUrl || !internalKey) {
      throw new Error('Internal Supabase credentials not configured')
    }

    const internalSupabase = createClient(internalUrl, internalKey)

    // External Supabase client (destination - user's Supabase)
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    const results: Record<string, { synced: number; errors: string[] }> = {}

    for (const table of tables) {
      console.log(`Syncing table: ${table}`)
      results[table] = { synced: 0, errors: [] }

      try {
        // Fetch all data from internal
        let allData: any[] = []
        let from = 0
        const batchSize = 1000

        while (true) {
          const { data, error } = await internalSupabase
            .from(table)
            .select('*')
            .range(from, from + batchSize - 1)

          if (error) throw error
          if (!data || data.length === 0) break

          allData.push(...data)
          from += batchSize
          if (data.length < batchSize) break
        }

        console.log(`Fetched ${allData.length} records from ${table}`)

        if (allData.length === 0) continue

        // Clean user reference fields for technologies table (users don't exist in external DB)
        if (table === 'technologies') {
          allData = allData.map(record => ({
            ...record,
            updated_by: null,
            reviewer_id: null,
            review_requested_by: null,
          }))
          console.log(`Cleaned user reference fields for ${allData.length} technology records`)
        }

        // Upsert to external in batches
        const upsertBatchSize = 100
        for (let i = 0; i < allData.length; i += upsertBatchSize) {
          const batch = allData.slice(i, i + upsertBatchSize)
          
          const { error: upsertError } = await externalSupabase
            .from(table)
            .upsert(batch, { onConflict: 'id' })

          if (upsertError) {
            console.error(`Error upserting batch to ${table}:`, upsertError)
            results[table].errors.push(`Batch ${i}-${i + batch.length}: ${upsertError.message}`)
          } else {
            results[table].synced += batch.length
          }
        }

        console.log(`Synced ${results[table].synced} records to ${table}`)

      } catch (tableError: any) {
        console.error(`Error syncing table ${table}:`, tableError)
        results[table].errors.push(tableError.message)
      }
    }

    const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0)
    const hasErrors = Object.values(results).some(r => r.errors.length > 0)

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        message: `Synced ${totalSynced} total records`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Bulk sync error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
