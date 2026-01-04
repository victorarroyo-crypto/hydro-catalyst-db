import { supabase } from '@/integrations/supabase/client';

type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
type SyncTable = 'technologies' | 'technological_trends' | 'taxonomy_tipos' | 'taxonomy_subcategorias' | 'taxonomy_sectores' | 'project_technologies' | 'projects';

interface SyncOptions {
  table: SyncTable;
  action: SyncAction;
  record?: Record<string, unknown>;
  recordId?: string | number;
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

// Technology helpers
export const syncTechnologyInsert = (technology: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'INSERT', record: technology });

export const syncTechnologyUpdate = (id: string, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'UPDATE', record: changes, recordId: id });

export const syncTechnologyDelete = (id: string) => 
  syncToExternalSupabase({ table: 'technologies', action: 'DELETE', recordId: id });

export const syncTechnologyUpsert = (technology: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technologies', action: 'UPSERT', record: technology });

// Taxonomy Tipos helpers
export const syncTipoInsert = (tipo: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_tipos', action: 'INSERT', record: tipo });

export const syncTipoUpdate = (id: number, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_tipos', action: 'UPDATE', record: changes, recordId: id });

export const syncTipoDelete = (id: number) => 
  syncToExternalSupabase({ table: 'taxonomy_tipos', action: 'DELETE', recordId: id });

// Taxonomy Subcategorías helpers
export const syncSubcategoriaInsert = (subcategoria: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_subcategorias', action: 'INSERT', record: subcategoria });

export const syncSubcategoriaUpdate = (id: number, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_subcategorias', action: 'UPDATE', record: changes, recordId: id });

export const syncSubcategoriaDelete = (id: number) => 
  syncToExternalSupabase({ table: 'taxonomy_subcategorias', action: 'DELETE', recordId: id });

// Taxonomy Sectores helpers
export const syncSectorInsert = (sector: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_sectores', action: 'INSERT', record: sector });

export const syncSectorUpdate = (id: string, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'taxonomy_sectores', action: 'UPDATE', record: changes, recordId: id });

export const syncSectorDelete = (id: string) => 
  syncToExternalSupabase({ table: 'taxonomy_sectores', action: 'DELETE', recordId: id });

// Technological Trends helpers
export const syncTrendInsert = (trend: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'technological_trends', action: 'INSERT', record: trend });

export const syncTrendDelete = (id: string) => 
  syncToExternalSupabase({ table: 'technological_trends', action: 'DELETE', recordId: id });

// Project helpers
export const syncProjectInsert = (project: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'projects', action: 'INSERT', record: project });

export const syncProjectUpdate = (id: string, changes: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'projects', action: 'UPDATE', record: changes, recordId: id });

export const syncProjectDelete = (id: string) => 
  syncToExternalSupabase({ table: 'projects', action: 'DELETE', recordId: id });

// Project Technologies helpers
export const syncProjectTechnologyInsert = (projectTech: Record<string, unknown>) => 
  syncToExternalSupabase({ table: 'project_technologies', action: 'INSERT', record: projectTech });

export const syncProjectTechnologyDelete = (id: string) => 
  syncToExternalSupabase({ table: 'project_technologies', action: 'DELETE', recordId: id });
