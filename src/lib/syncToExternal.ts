/**
 * Sync utilities for external systems
 * 
 * Since we now use externalSupabase (Railway) as the primary database,
 * we only need to sync to Railway for embeddings - the main DB operations
 * are already happening on externalSupabase directly.
 */

const RAILWAY_SYNC_URL = 'https://watertech-scouting-production.up.railway.app/api/technologies/sync';

// Sync to Railway for technologies (embeddings)
const syncToRailway = async (id: string, action: 'create' | 'update' | 'delete', data?: Record<string, unknown>) => {
  try {
    const response = await fetch(RAILWAY_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, data })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Railway sync failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Successfully synced to Railway:', result);
    return result;
  } catch (error) {
    console.error('Failed to sync to Railway:', error);
    // Don't throw - Railway sync is secondary, don't block main operations
    return null;
  }
};

// Technology helpers - only sync to Railway for embeddings
// Main DB operations now happen directly on externalSupabase
export const syncTechnologyInsert = async (technology: Record<string, unknown>) => {
  // Sync to Railway for embeddings
  if (technology.id) {
    return await syncToRailway(technology.id as string, 'create', technology);
  }
  return null;
};

export const syncTechnologyUpdate = async (id: string, changes: Record<string, unknown>) => {
  // Sync to Railway for embeddings
  return await syncToRailway(id, 'update', changes);
};

export const syncTechnologyDelete = async (id: string) => {
  // Sync to Railway for embeddings
  return await syncToRailway(id, 'delete');
};

export const syncTechnologyUpsert = async (technology: Record<string, unknown>) => {
  // Sync to Railway for embeddings
  if (technology.id) {
    return await syncToRailway(technology.id as string, 'update', technology);
  }
  return null;
};

// Taxonomy and other sync functions are no longer needed since we write directly to externalSupabase
// These are kept as no-ops for backwards compatibility
export const syncTipoInsert = async (_tipo: Record<string, unknown>) => null;
export const syncTipoUpdate = async (_id: number, _changes: Record<string, unknown>) => null;
export const syncTipoDelete = async (_id: number) => null;

export const syncSubcategoriaInsert = async (_subcategoria: Record<string, unknown>) => null;
export const syncSubcategoriaUpdate = async (_id: number, _changes: Record<string, unknown>) => null;
export const syncSubcategoriaDelete = async (_id: number) => null;

export const syncSectorInsert = async (_sector: Record<string, unknown>) => null;
export const syncSectorUpdate = async (_id: string, _changes: Record<string, unknown>) => null;
export const syncSectorDelete = async (_id: string) => null;

export const syncTrendInsert = async (_trend: Record<string, unknown>) => null;
export const syncTrendDelete = async (_id: string) => null;

export const syncCaseStudyInsert = async (_caseStudy: Record<string, unknown>) => null;
export const syncCaseStudyDelete = async (_id: string) => null;

export const syncProjectInsert = async (_project: Record<string, unknown>) => null;
export const syncProjectUpdate = async (_id: string, _changes: Record<string, unknown>) => null;
export const syncProjectDelete = async (_id: string) => null;

export const syncProjectTechnologyInsert = async (_projectTech: Record<string, unknown>) => null;
export const syncProjectTechnologyDelete = async (_id: string) => null;
