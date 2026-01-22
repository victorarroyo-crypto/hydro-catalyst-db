import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeo de campos: Español (BD externa) → snake_case (BD local nueva)
const FIELD_MAPPING: Record<string, string> = {
  'id': 'id',
  'Nombre de la tecnología': 'nombre',
  'Descripción técnica breve': 'descripcion',
  'Proveedor / Empresa': 'proveedor',
  'País de origen': 'pais',
  'Web de la empresa': 'web',
  'Email de contacto': 'email',
  'Tipo de tecnología': 'tipo',
  'Sector y subsector': 'sector',
  'Aplicación principal': 'aplicacion',
  'Ventaja competitiva clave': 'ventaja',
  'Porque es innovadora': 'innovacion',
  'Casos de referencia': 'casos_referencia',
  'Paises donde actua': 'paises_actua',
  'Comentarios del analista': 'comentarios',
  'Fecha de scouting': 'fecha_scouting',
  'Estado del seguimiento': 'estado_seguimiento',
  'Grado de madurez (TRL)': 'trl',
  'quality_score': 'quality_score',
  'status': 'status',
  'review_status': 'review_status',
  'reviewer_id': 'reviewer_id',
  'review_requested_at': 'review_requested_at',
  'review_requested_by': 'review_requested_by',
  'created_at': 'created_at',
  'created_by': 'created_by',
  'updated_at': 'updated_at',
  'updated_by': 'updated_by',
  'tipo_id': 'tipo_id',
  'subcategoria_id': 'subcategoria_id',
  'sector_id': 'sector_id',
  'subsector_industrial': 'subsector_industrial',
  'Subcategoría': 'tipo', // Fallback - subcategory text goes to tipo if needed
}

function mapRecord(externalRecord: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  
  // Map known fields
  for (const [externalKey, localKey] of Object.entries(FIELD_MAPPING)) {
    if (externalRecord[externalKey] !== undefined) {
      mapped[localKey] = externalRecord[externalKey]
    }
  }
  
  // Ensure required defaults
  if (!mapped.nombre) {
    mapped.nombre = externalRecord['nombre'] || externalRecord['name'] || 'Sin nombre'
  }
  if (!mapped.status) {
    mapped.status = 'active'
  }
  if (!mapped.review_status) {
    mapped.review_status = 'pending'
  }
  
  // Handle TRL field variations
  if (!mapped.trl && externalRecord['trl']) {
    mapped.trl = externalRecord['trl']
  }
  
  // Preserve original ID for data integrity
  if (externalRecord['id']) {
    mapped.id = externalRecord['id']
  }
  
  return mapped
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting migration FROM external DB TO local...')

    // External Supabase (SOURCE - ktzhrlcvluaptixngrsh)
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    // Local Supabase (DESTINATION - bdmpshiqspkxcisnnlyr)
    const localUrl = Deno.env.get('SUPABASE_URL')
    const localKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!localUrl || !localKey) {
      throw new Error('Local Supabase credentials not configured')
    }

    const localSupabase = createClient(localUrl, localKey)

    // Parse request options
    const body = await req.json().catch(() => ({}))
    const batchSize = body.batchSize || 500
    const offset = body.offset || 0
    const dryRun = body.dryRun || false

    console.log(`📊 Config: batchSize=${batchSize}, offset=${offset}, dryRun=${dryRun}`)

    // Fetch from external DB
    const { data: externalData, error: fetchError, count } = await externalSupabase
      .from('technologies')
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1)

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      throw new Error(`Failed to fetch from external DB: ${fetchError.message}`)
    }

    if (!externalData || externalData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No more data to migrate',
          migrated: 0,
          totalCount: count,
          offset,
          hasMore: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📥 Fetched ${externalData.length} records from external DB (total: ${count})`)

    // Map records to new schema
    const mappedData = externalData.map((record: Record<string, unknown>) => mapRecord(record))

    console.log('🔄 Sample mapped record:', JSON.stringify(mappedData[0], null, 2))

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Dry run - no data inserted',
          wouldMigrate: mappedData.length,
          sampleRecord: mappedData[0],
          totalCount: count,
          offset,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert in smaller batches to avoid timeouts
    const insertBatchSize = 100
    let inserted = 0
    const errors: Array<{ batch: number; error: string }> = []

    for (let i = 0; i < mappedData.length; i += insertBatchSize) {
      const batch = mappedData.slice(i, i + insertBatchSize)
      
      const { error: insertError } = await localSupabase
        .from('technologies')
        .upsert(batch, { onConflict: 'id' })

      if (insertError) {
        console.error(`❌ Insert error at batch ${i}:`, insertError)
        errors.push({ batch: i, error: insertError.message })
      } else {
        inserted += batch.length
        console.log(`✅ Inserted batch ${i}-${i + batch.length} (${inserted}/${mappedData.length})`)
      }
    }

    const hasMore = (offset + batchSize) < (count || 0)

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Migrated ${inserted} technologies`,
        migrated: inserted,
        errors: errors.length > 0 ? errors : undefined,
        totalCount: count,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + batchSize : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('💥 Migration error:', errorMessage)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
