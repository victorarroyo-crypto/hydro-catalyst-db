import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparisonResult {
  table: string;
  localCount: number;
  externalCount: number;
  difference: number;
  status: 'synced' | 'out_of_sync' | 'error';
  missingInExternal?: string[];
  missingInLocal?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // All synchronized tables - ordered by dependency for clarity
    const defaultTables = [
      'taxonomy_tipos',
      'taxonomy_subcategorias', 
      'taxonomy_sectores',
      'technologies',
      'casos_de_estudio',
      'technological_trends',
      'projects',
      'project_technologies'
    ];
    
    const { tables = defaultTables, detailed = false } = await req.json().catch(() => ({}));

    console.log('Comparing databases for tables:', tables);
    console.log('Detailed mode:', detailed);

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

    const results: ComparisonResult[] = [];

    for (const table of tables) {
      console.log(`\n--- Comparing table: ${table} ---`);

      try {
        // Get local data - handle different ID types
        const { data: localData, error: localError, count: localCount } = await localSupabase
          .from(table)
          .select('id', { count: 'exact' });

        if (localError) {
          console.error(`Error fetching local ${table}:`, localError);
          results.push({
            table,
            localCount: 0,
            externalCount: 0,
            difference: 0,
            status: 'error',
          });
          continue;
        }

        // Get external data
        const { data: externalData, error: externalError, count: externalCount } = await externalSupabase
          .from(table)
          .select('id', { count: 'exact' });

        if (externalError) {
          console.error(`Error fetching external ${table}:`, externalError);
          results.push({
            table,
            localCount: localCount ?? 0,
            externalCount: 0,
            difference: localCount ?? 0,
            status: 'error',
          });
          continue;
        }

        // Convert IDs to strings for consistent comparison (handles uuid, integer, varchar)
        const localIds = new Set((localData || []).map((r: { id: string | number }) => String(r.id)));
        const externalIds = new Set((externalData || []).map((r: { id: string | number }) => String(r.id)));

        // Find differences
        const missingInExternal = [...localIds].filter(id => !externalIds.has(id));
        const missingInLocal = [...externalIds].filter(id => !localIds.has(id));

        const isSynced = missingInExternal.length === 0 && missingInLocal.length === 0;

        const result: ComparisonResult = {
          table,
          localCount: localCount ?? 0,
          externalCount: externalCount ?? 0,
          difference: Math.abs((localCount ?? 0) - (externalCount ?? 0)),
          status: isSynced ? 'synced' : 'out_of_sync',
        };

        // Include detailed info if requested
        if (detailed) {
          if (missingInExternal.length > 0) {
            result.missingInExternal = missingInExternal.slice(0, 20); // Limit to 20
          }
          if (missingInLocal.length > 0) {
            result.missingInLocal = missingInLocal.slice(0, 20); // Limit to 20
          }
        }

        console.log(`Local: ${localCount}, External: ${externalCount}, Status: ${result.status}`);
        if (missingInExternal.length > 0) {
          console.log(`Missing in external: ${missingInExternal.length} records`);
        }
        if (missingInLocal.length > 0) {
          console.log(`Missing in local: ${missingInLocal.length} records`);
        }

        results.push(result);

      } catch (tableError) {
        console.error(`Error comparing ${table}:`, tableError);
        results.push({
          table,
          localCount: 0,
          externalCount: 0,
          difference: 0,
          status: 'error',
        });
      }
    }

    // Calculate summary
    const summary = {
      totalTables: results.length,
      syncedTables: results.filter(r => r.status === 'synced').length,
      outOfSyncTables: results.filter(r => r.status === 'out_of_sync').length,
      errorTables: results.filter(r => r.status === 'error').length,
      timestamp: new Date().toISOString(),
    };

    console.log('\n=== Comparison Summary ===');
    console.log(JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Compare databases error:', error);
    
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
