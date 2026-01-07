import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  table: string;
  action: 'sync_missing' | 'update_modified' | 'sync_all';
  recordIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table, action, recordIds }: SyncRequest = await req.json();

    console.log(`Sync request - Table: ${table}, Action: ${action}`);

    // Initialize local Supabase client (master)
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

    let recordsAffected = 0;
    let message = '';

    if (action === 'sync_missing' || action === 'sync_all') {
      // Get all IDs from both databases
      const { data: localData, error: localError } = await localSupabase
        .from(table)
        .select('id');

      if (localError) {
        throw new Error(`Error fetching local data: ${localError.message}`);
      }

      const { data: externalData, error: externalError } = await externalSupabase
        .from(table)
        .select('id');

      if (externalError) {
        throw new Error(`Error fetching external data: ${externalError.message}`);
      }

      // Find records missing in external
      const localIds = new Set((localData || []).map((r: { id: string | number }) => String(r.id)));
      const externalIds = new Set((externalData || []).map((r: { id: string | number }) => String(r.id)));
      const missingInExternal = [...localIds].filter(id => !externalIds.has(id));

      console.log(`Found ${missingInExternal.length} records missing in external`);

      if (missingInExternal.length > 0) {
        // Fetch full records from local
        const { data: recordsToSync, error: fetchError } = await localSupabase
          .from(table)
          .select('*')
          .in('id', missingInExternal);

        if (fetchError) {
          throw new Error(`Error fetching records to sync: ${fetchError.message}`);
        }

        if (recordsToSync && recordsToSync.length > 0) {
          // Clean records - remove any fields that might cause issues
          const cleanedRecords = recordsToSync.map(record => {
            const cleaned = { ...record };
            // Remove any server-generated fields that should be regenerated
            delete cleaned.created_at;
            delete cleaned.updated_at;
            return cleaned;
          });

          // Insert into external in batches of 100
          const batchSize = 100;
          for (let i = 0; i < cleanedRecords.length; i += batchSize) {
            const batch = cleanedRecords.slice(i, i + batchSize);
            
            // Use upsert to handle potential conflicts
            const { error: insertError } = await externalSupabase
              .from(table)
              .upsert(batch, { onConflict: 'id' });

            if (insertError) {
              console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
              throw new Error(`Error syncing records: ${insertError.message}`);
            }

            recordsAffected += batch.length;
            console.log(`Synced batch ${i / batchSize + 1}, total: ${recordsAffected}`);
          }

          message = `Sincronizados ${recordsAffected} registros de ${table} a la BD externa`;
        }
      } else {
        message = `No hay registros pendientes de sincronizar en ${table}`;
      }
    }

    if (action === 'update_modified') {
      // This would compare records with same ID but different data
      // For now, we'll re-sync all existing records
      
      const idsToUpdate = recordIds || [];
      
      if (idsToUpdate.length > 0) {
        const { data: recordsToUpdate, error: fetchError } = await localSupabase
          .from(table)
          .select('*')
          .in('id', idsToUpdate);

        if (fetchError) {
          throw new Error(`Error fetching records to update: ${fetchError.message}`);
        }

        if (recordsToUpdate && recordsToUpdate.length > 0) {
          for (const record of recordsToUpdate) {
            const { error: updateError } = await externalSupabase
              .from(table)
              .upsert(record, { onConflict: 'id' });

            if (updateError) {
              console.error(`Error updating record ${record.id}:`, updateError);
            } else {
              recordsAffected++;
            }
          }

          message = `Actualizados ${recordsAffected} registros en ${table}`;
        }
      } else {
        message = `No se especificaron registros para actualizar`;
      }
    }

    console.log(`Sync completed: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsAffected,
        message,
        table,
        action,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync databases error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        recordsAffected: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
