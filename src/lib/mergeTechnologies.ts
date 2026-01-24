/**
 * Technology Merge Utilities
 * 
 * Functions for merging duplicate technologies into a single master record.
 * Prioritizes non-empty values and longer/more complete content.
 */
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { QualityIssue } from '@/hooks/useDataQualityStats';

export interface MergeResult {
  success: boolean;
  mergedFields: string[];
  deletedIds: string[];
  error?: string;
}

// Fields that can be merged (excluding system fields)
const MERGEABLE_FIELDS = [
  'proveedor',
  'pais',
  'web',
  'email',
  'descripcion',
  'ventaja',
  'innovacion',
  'aplicacion',
  'casos_referencia',
  'comentarios',
  'paises_actua',
  'trl',
  'tipo',
  'sector',
  'categorias',
  'tipos',
  'subcategorias',
  'tipo_id',
  'subcategoria_id',
  'sector_id',
  'subsector_industrial',
] as const;

type MergeableField = typeof MERGEABLE_FIELDS[number];

/**
 * Select the best value for a field from multiple candidates
 * Priority: non-empty > longer text > first non-null
 */
function selectBestValue(
  masterValue: unknown,
  candidateValues: unknown[],
  fieldName: string
): unknown {
  // If master has a value, keep it unless candidates have better
  const allValues = [masterValue, ...candidateValues].filter(v => 
    v !== null && v !== undefined && v !== ''
  );

  if (allValues.length === 0) return masterValue;
  if (allValues.length === 1) return allValues[0];

  // For text fields, prefer longer content
  if (typeof allValues[0] === 'string') {
    return allValues.reduce((best, current) => {
      const bestLen = String(best).length;
      const currentLen = String(current).length;
      return currentLen > bestLen ? current : best;
    });
  }

  // For arrays, prefer longer arrays or merge them
  if (Array.isArray(allValues[0])) {
    const merged = new Set<string>();
    allValues.forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(item => merged.add(String(item)));
      }
    });
    return Array.from(merged);
  }

  // For numbers (like TRL), prefer non-null
  if (typeof allValues[0] === 'number') {
    return allValues.find(v => typeof v === 'number' && !isNaN(v as number)) ?? masterValue;
  }

  // Default: keep master value if it exists, otherwise first candidate
  return masterValue ?? allValues[0];
}

/**
 * Compute merged data from master and duplicates
 */
export function computeMergedData(
  master: QualityIssue,
  duplicates: QualityIssue[]
): { mergedData: Partial<Record<MergeableField, unknown>>; fieldsUpdated: string[] } {
  const mergedData: Partial<Record<MergeableField, unknown>> = {};
  const fieldsUpdated: string[] = [];

  for (const field of MERGEABLE_FIELDS) {
    const masterValue = master[field as keyof QualityIssue];
    const candidateValues = duplicates.map(d => d[field as keyof QualityIssue]);
    
    const bestValue = selectBestValue(masterValue, candidateValues, field);
    
    // Only include if different from master
    if (bestValue !== masterValue) {
      mergedData[field] = bestValue;
      fieldsUpdated.push(field);
    }
  }

  return { mergedData, fieldsUpdated };
}

/**
 * Execute the merge operation:
 * 1. Update master with merged data
 * 2. Delete duplicate records
 */
export async function executeMerge(
  masterId: string,
  duplicateIds: string[],
  mergedData: Partial<Record<MergeableField, unknown>>
): Promise<MergeResult> {
  try {
    // 1. Update master technology with merged data if there are changes
    if (Object.keys(mergedData).length > 0) {
      const { error: updateError } = await externalSupabase
        .from('technologies')
        .update({
          ...mergedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', masterId);

      if (updateError) {
        console.error('Error updating master technology:', updateError);
        return {
          success: false,
          mergedFields: [],
          deletedIds: [],
          error: `Error actualizando tecnología maestra: ${updateError.message}`,
        };
      }
    }

    // 2. Delete duplicate technologies
    const { error: deleteError } = await externalSupabase
      .from('technologies')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      return {
        success: false,
        mergedFields: Object.keys(mergedData),
        deletedIds: [],
        error: `Error eliminando duplicados: ${deleteError.message}`,
      };
    }

    return {
      success: true,
      mergedFields: Object.keys(mergedData),
      deletedIds: duplicateIds,
    };
  } catch (error) {
    console.error('Merge execution error:', error);
    return {
      success: false,
      mergedFields: [],
      deletedIds: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Delete a single technology
 */
export async function deleteTechnology(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await externalSupabase
      .from('technologies')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Mark a group as not duplicates (store exclusion)
 */
export async function markAsNotDuplicate(
  groupKey: string,
  technologyIds: string[],
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store in local storage for now (until we have the DB table)
    const exclusions = JSON.parse(localStorage.getItem('duplicate_exclusions') || '[]');
    exclusions.push({
      group_key: groupKey,
      technology_ids: technologyIds,
      excluded_by: userId,
      excluded_at: new Date().toISOString(),
    });
    localStorage.setItem('duplicate_exclusions', JSON.stringify(exclusions));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Get excluded duplicate group keys
 */
export function getExcludedGroups(): Set<string> {
  try {
    const exclusions = JSON.parse(localStorage.getItem('duplicate_exclusions') || '[]');
    return new Set(exclusions.map((e: { group_key: string }) => e.group_key));
  } catch {
    return new Set();
  }
}
