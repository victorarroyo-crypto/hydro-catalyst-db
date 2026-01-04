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
    console.log('Starting bulk sync...')

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
    
    // Tables in order for INSERT (respecting FK dependencies)
    const insertOrder = [
      'taxonomy_tipos', 
      'taxonomy_subcategorias', 
      'taxonomy_sectores', 
      'technologies', 
      'casos_de_estudio',
      'technological_trends',
      'projects', 
      'project_technologies'
    ]
    // Tables in reverse order for DELETE (respecting FK dependencies)
    const deleteOrder = [
      'project_technologies', 
      'projects', 
      'technological_trends',
      'casos_de_estudio',
      'technologies', 
      'taxonomy_subcategorias', 
      'taxonomy_tipos', 
      'taxonomy_sectores'
    ]

    // Initialize results
    for (const table of insertOrder) {
      results[table] = { synced: 0, errors: [] }
    }

    // PHASE 1: Delete all data from external in reverse dependency order
    console.log('PHASE 1: Deleting all existing data from external DB...')
    for (const table of deleteOrder) {
      console.log(`Deleting from ${table}...`)
      
      let deleteError;
      if (table === 'taxonomy_tipos' || table === 'taxonomy_subcategorias') {
        const result = await externalSupabase.from(table).delete().gt('id', 0)
        deleteError = result.error
      } else if (table === 'taxonomy_sectores') {
        const result = await externalSupabase.from(table).delete().neq('id', '')
        deleteError = result.error
      } else {
        const result = await externalSupabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        deleteError = result.error
      }

      if (deleteError) {
        console.error(`Error deleting from ${table}:`, deleteError)
        results[table].errors.push(`Delete failed: ${deleteError.message}`)
      } else {
        console.log(`Deleted all records from ${table}`)
      }
    }

    // PHASE 2: Fetch and insert data in dependency order
    console.log('PHASE 2: Fetching and inserting fresh data...')
    for (const table of insertOrder) {
      console.log(`Syncing table: ${table}`)

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

        // Clean user reference fields for specific tables
        if (table === 'technologies') {
          // Fetch taxonomy lookup tables
          const { data: tipos } = await internalSupabase.from('taxonomy_tipos').select('id, nombre')
          const { data: subcategorias } = await internalSupabase.from('taxonomy_subcategorias').select('id, nombre')
          const { data: sectores } = await internalSupabase.from('taxonomy_sectores').select('id, nombre')
          
          const tiposMap = new Map((tipos || []).map(t => [t.id, t.nombre]))
          const subcategoriasMap = new Map((subcategorias || []).map(s => [s.id, s.nombre]))
          const sectoresMap = new Map((sectores || []).map(s => [s.id, s.nombre]))
          
          console.log(`Loaded taxonomy maps: ${tiposMap.size} tipos, ${subcategoriasMap.size} subcategorias, ${sectoresMap.size} sectores`)
          
          allData = allData.map(record => ({
            ...record,
            // Populate text fields from taxonomy IDs
            "Tipo de tecnología": record.tipo_id ? tiposMap.get(record.tipo_id) || record["Tipo de tecnología"] : record["Tipo de tecnología"],
            "Subcategoría": record.subcategoria_id ? subcategoriasMap.get(record.subcategoria_id) || record["Subcategoría"] : record["Subcategoría"],
            "Sector y subsector": record.sector_id ? sectoresMap.get(record.sector_id) || record["Sector y subsector"] : record["Sector y subsector"],
            // Clean user reference fields (users don't exist in external DB)
            updated_by: null,
            reviewer_id: null,
            review_requested_by: null,
          }))
          console.log(`Enriched ${allData.length} technology records with taxonomy names`)
        }

        // Clean user references for casos_de_estudio table
        if (table === 'casos_de_estudio') {
          allData = allData.map(record => ({
            ...record,
            created_by: null,
            source_technology_id: null, // Don't reference internal tech IDs
          }))
          console.log(`Cleaned ${allData.length} casos_de_estudio records`)
        }

        // Clean user references for technological_trends table
        if (table === 'technological_trends') {
          allData = allData.map(record => ({
            ...record,
            created_by: null,
            source_technology_id: null, // Don't reference internal tech IDs
          }))
          console.log(`Cleaned ${allData.length} technological_trends records`)
        }

        // Clean user references for projects table - remove columns that don't exist in external
        if (table === 'projects') {
          allData = allData.map(record => {
            const { created_by, client_id, responsible_user_id, ...rest } = record
            return rest
          })
          console.log(`Cleaned ${allData.length} project records`)
        }

        // Clean user references for project_technologies table - remove columns that don't exist in external
        if (table === 'project_technologies') {
          allData = allData.map(record => {
            const { added_by, ...rest } = record
            return rest
          })
          console.log(`Cleaned ${allData.length} project_technologies records`)
        }

        // INSERT fresh data in batches
        const insertBatchSize = 100
        for (let i = 0; i < allData.length; i += insertBatchSize) {
          const batch = allData.slice(i, i + insertBatchSize)
          
          const { error: insertError } = await externalSupabase
            .from(table)
            .insert(batch)

          if (insertError) {
            console.error(`Error inserting batch to ${table}:`, insertError)
            results[table].errors.push(`Batch ${i}-${i + batch.length}: ${insertError.message}`)
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