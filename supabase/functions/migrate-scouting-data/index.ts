import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping from external Supabase fields to local Lovable Cloud fields
// External table has different structure, so we map what we can
const EXTERNAL_TO_LOCAL_MAPPING: Record<string, string> = {
  'id': 'id',
  'nombre': 'Nombre de la tecnología',
  'proveedor': 'Proveedor / Empresa',
  'pais': 'País de origen',
  'web': 'Web de la empresa',
  'email': 'Email de contacto',
  'descripcion': 'Descripción técnica breve',
  'tipo_sugerido': 'Tipo de tecnología',
  'subcategoria': 'Subcategoría',
  'subcategoria_sugerida': 'Subcategoría', // fallback
  'trl_estimado': 'Grado de madurez (TRL)',
  'ventaja_competitiva': 'Ventaja competitiva clave',
  'aplicacion_principal': 'Aplicación principal',
  'innovacion': 'Porque es innovadora',
  'casos_referencia': 'Casos de referencia',
  'paises_actua': 'Paises donde actua',
  'comentarios_analista': 'Comentarios del analista',
  'sector': 'Sector y subsector',
  'subsector': 'subsector_industrial',
  'source_url': 'source_url',
  'status': 'queue_status',
  'review_notes': 'notes',
  'created_at': 'created_at',
  'updated_at': 'updated_at',
};

// Fields that exist in external but NOT in local - these will be excluded
const FIELDS_TO_EXCLUDE = [
  'relevance_score',
  'relevance_reason', 
  'reviewed_by',
  'reviewed_at',
  'converted_technology_id',
  'scouting_job_id',
  'approved_by',
  'approved_at',
];

// Status mapping from external to local
const STATUS_MAPPING: Record<string, string> = {
  'pending': 'pending',
  'reviewing': 'reviewing',
  'approved': 'approved',
  'rejected': 'rejected',
  'new': 'pending',
  'in_review': 'reviewing',
};

// Transform record from external format to local format
function transformToLocal(record: Record<string, unknown>): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(record)) {
    // Skip excluded fields
    if (FIELDS_TO_EXCLUDE.includes(key)) {
      continue;
    }
    
    // Check if this field needs mapping
    const mappedKey = EXTERNAL_TO_LOCAL_MAPPING[key];
    
    if (mappedKey) {
      // Special handling for status
      if (key === 'status' && typeof value === 'string') {
        transformed[mappedKey] = STATUS_MAPPING[value] || 'pending';
      } else {
        transformed[mappedKey] = value;
      }
    }
    // If no mapping exists and not excluded, skip the field
  }
  
  // Ensure required fields have defaults
  if (!transformed['Nombre de la tecnología']) {
    transformed['Nombre de la tecnología'] = 'Sin nombre';
  }
  if (!transformed['Tipo de tecnología']) {
    transformed['Tipo de tecnología'] = 'Sin clasificar';
  }
  
  return transformed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { direction = 'external_to_local', table = 'scouting_queue', limit = 100 } = await req.json().catch(() => ({}));

    console.log(`Migrating ${table} - Direction: ${direction}, Limit: ${limit}`);

    // Initialize local Supabase client
    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize external Supabase client
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Only support external_to_local for scouting_queue due to schema differences
    if (direction !== 'external_to_local') {
      throw new Error('Only external_to_local direction is supported for scouting_queue');
    }

    // Fetch all records from external
    const { data: sourceData, error: sourceError } = await externalSupabase
      .from(table)
      .select('*')
      .limit(limit);

    if (sourceError) {
      throw new Error(`Error fetching from external: ${sourceError.message}`);
    }

    if (!sourceData || sourceData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No records to migrate',
          migrated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${sourceData.length} records in external`);
    console.log(`Sample source record keys:`, Object.keys(sourceData[0]));

    // Get existing IDs in local to avoid duplicates
    const sourceIds = sourceData.map((r: any) => r.id);
    const { data: existingData } = await localSupabase
      .from(table)
      .select('id')
      .in('id', sourceIds);

    const existingIds = new Set((existingData || []).map((r: any) => r.id));
    const recordsToMigrate = sourceData.filter((r: any) => !existingIds.has(r.id));

    console.log(`Records to migrate (excluding existing): ${recordsToMigrate.length}`);

    if (recordsToMigrate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All records already exist in local',
          migrated: 0,
          skipped: sourceData.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform records
    const transformedRecords = recordsToMigrate.map(transformToLocal);
    console.log(`Sample transformed record:`, JSON.stringify(transformedRecords[0], null, 2));

    // Insert records into local
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      const { data: insertedData, error: insertError } = await localSupabase
        .from(table)
        .insert(batch)
        .select();

      if (insertError) {
        console.error(`Batch insert error:`, insertError);
        results.failed += batch.length;
        results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        results.success += (insertedData || []).length;
        console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${(insertedData || []).length} records`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed`,
        migrated: results.success,
        failed: results.failed,
        skipped: existingIds.size,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
