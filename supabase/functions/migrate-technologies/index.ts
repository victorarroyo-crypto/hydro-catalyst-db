import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting migration from external Supabase...')

    // External Supabase client (source)
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    // Internal Supabase client (destination)
    const internalUrl = Deno.env.get('SUPABASE_URL')
    const internalKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!internalUrl || !internalKey) {
      throw new Error('Internal Supabase credentials not configured')
    }

    const internalSupabase = createClient(internalUrl, internalKey)

    // Parse request body for configuration
    const body = await req.json().catch(() => ({}))
    const sourceTable = body.sourceTable || 'technologies'
    const batchSize = body.batchSize || 500
    const offset = body.offset || 0

    console.log(`Fetching from table: ${sourceTable}, offset: ${offset}, batchSize: ${batchSize}`)

    // Fetch data from external Supabase
    const { data: externalData, error: fetchError, count } = await externalSupabase
      .from(sourceTable)
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      throw new Error(`Failed to fetch from external DB: ${fetchError.message}`)
    }

    if (!externalData || externalData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No more data to migrate',
          migrated: 0,
          totalCount: count,
          offset
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetched ${externalData.length} records from external DB`)

    // Map the data to match our schema
    const mappedData = externalData.map((row: any) => ({
      "Nombre de la tecnología": row["Nombre de la tecnología"] || row.nombre || row.name || 'Sin nombre',
      "Proveedor / Empresa": row["Proveedor / Empresa"] || row.proveedor || row.company || null,
      "País de origen": row["País de origen"] || row.pais || row.country || null,
      "Web de la empresa": row["Web de la empresa"] || row.web || row.website || null,
      "Email de contacto": row["Email de contacto"] || row.email || null,
      "Tipo de tecnología": row["Tipo de tecnología"] || row.tipo || row.type || 'Sin clasificar',
      "Subcategoría": row["Subcategoría"] || row.subcategoria || null,
      "Sector y subsector": row["Sector y subsector"] || row.sector || null,
      "Aplicación principal": row["Aplicación principal"] || row.aplicacion || null,
      "Descripción técnica breve": row["Descripción técnica breve"] || row.descripcion || null,
      "Ventaja competitiva clave": row["Ventaja competitiva clave"] || row.ventaja || null,
      "Porque es innovadora": row["Porque es innovadora"] || row.innovacion || null,
      "Casos de referencia": row["Casos de referencia"] || row.casos || null,
      "Paises donde actua": row["Paises donde actua"] || row.paises || null,
      "Comentarios del analista": row["Comentarios del analista"] || row.comentarios || null,
      "Fecha de scouting": row["Fecha de scouting"] || row.fecha_scouting || null,
      "Estado del seguimiento": row["Estado del seguimiento"] || row.estado || null,
      "Grado de madurez (TRL)": row["Grado de madurez (TRL)"] || row.trl || null,
      status: row.status || 'active',
      quality_score: row.quality_score || 0,
    }))

    console.log('Inserting data into local database...')

    // Insert into local Supabase in smaller batches
    const insertBatchSize = 100
    let inserted = 0
    
    for (let i = 0; i < mappedData.length; i += insertBatchSize) {
      const batch = mappedData.slice(i, i + insertBatchSize)
      const { error: insertError } = await internalSupabase
        .from('technologies')
        .insert(batch)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(`Failed to insert batch at ${i}: ${insertError.message}`)
      }
      
      inserted += batch.length
      console.log(`Inserted ${inserted}/${mappedData.length} records`)
    }

    const hasMore = (offset + batchSize) < (count || 0)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Migrated ${inserted} technologies`,
        migrated: inserted,
        totalCount: count,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + batchSize : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Migration error:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
