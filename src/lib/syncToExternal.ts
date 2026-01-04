import { supabase } from '@/integrations/supabase/client';

type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
type SyncTable = 'technologies' | 'technological_trends' | 'taxonomy_tipos' | 'taxonomy_subcategorias' | 'taxonomy_sectores';

interface SyncOptions {
  table: SyncTable;
  action: SyncAction;
  record?: Record<string, unknown>;
  recordId?: string;
}

export const syncToExternalSupabase = async ({ table, action, record, recordId }: SyncOptions) => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-to-external', {
      body: {
        table,
        action,
        record,
        recordId,
      },
    });

    if (error) {
      console.error('Error syncing to external Supabase:', error);
      throw error;
    }

    console.log('Successfully synced to external Supabase:', data);
    return data;
  } catch (error) {
    console.error('Failed to sync to external Supabase:', error);
    throw error;
  }
};

// Helper functions for common operations
export const syncTechnologyInsert = (technology: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'INSERT', record: technology });

export const syncTechnologyUpdate = (id: string, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'UPDATE', record: changes, recordId: id });

export const syncTechnologyDelete = (id: string) => 
  syncToExternalSupabase({ table: 'technologies', action: 'DELETE', recordId: id });

export const syncTechnologyUpsert = (technology: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'UPSERT', record: technology });
