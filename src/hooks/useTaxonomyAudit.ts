import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

export interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface TaxonomySubcategoria {
  id: number;
  codigo: string;
  nombre: string;
  tipo_id: number | null;
}

export interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface UnclassifiedTechnology {
  id: string;
  nombre: string;
  tipo_texto: string;
  subcategoria_texto: string | null;
  sector_texto: string | null;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  missing: ('tipo' | 'subcategoria' | 'sector')[];
}

export interface MisclassifiedTechnology {
  id: string;
  nombre: string;
  tipo_texto: string;
  subcategoria_texto: string | null;
  tipo_id: number | null;
  subcategoria_id: number | null;
  tipo_codigo: string | null;
  subcategoria_codigo: string | null;
  issue: string;
}

export interface FrequentUnmapped {
  value: string;
  count: number;
  field: 'subcategoria' | 'tipo' | 'sector';
}

export function useTaxonomyAudit() {
  // Fetch all tipos
  const { data: tipos = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('taxonomy_tipos')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  // Fetch all subcategorias
  const { data: subcategorias = [], isLoading: loadingSubcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('taxonomy_subcategorias')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

  // Fetch all sectores
  const { data: sectores = [], isLoading: loadingSectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('taxonomy_sectores')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  // Fetch unclassified technologies (missing tipo_id, subcategoria_id, or sector_id)
  const { data: unclassified = [], isLoading: loadingUnclassified, refetch: refetchUnclassified } = useQuery({
    queryKey: ['taxonomy-unclassified'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Subcategoría", "Sector y subsector", tipo_id, subcategoria_id, sector_id')
        .or('tipo_id.is.null,subcategoria_id.is.null,sector_id.is.null')
        .order('"Nombre de la tecnología"');
      
      if (error) throw error;
      
      return (data || []).map(t => {
        const missing: ('tipo' | 'subcategoria' | 'sector')[] = [];
        if (!t.tipo_id) missing.push('tipo');
        if (!t.subcategoria_id) missing.push('subcategoria');
        if (!t.sector_id) missing.push('sector');
        
        return {
          id: t.id,
          nombre: t['Nombre de la tecnología'],
          tipo_texto: t['Tipo de tecnología'],
          subcategoria_texto: t['Subcategoría'],
          sector_texto: t['Sector y subsector'],
          tipo_id: t.tipo_id,
          subcategoria_id: t.subcategoria_id,
          sector_id: t.sector_id,
          missing,
        } as UnclassifiedTechnology;
      });
    },
  });

  // Fetch frequent unmapped subcategorias
  const { data: frequentUnmapped = [], isLoading: loadingFrequent } = useQuery({
    queryKey: ['taxonomy-frequent-unmapped'],
    queryFn: async () => {
      // Get technologies with text subcategoria but no subcategoria_id
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('"Subcategoría"')
        .is('subcategoria_id', null)
        .not('"Subcategoría"', 'is', null);
      
      if (error) throw error;
      
      // Count frequencies
      const counts: Record<string, number> = {};
      (data || []).forEach(t => {
        const sub = t['Subcategoría']?.trim();
        if (sub) {
          counts[sub] = (counts[sub] || 0) + 1;
        }
      });
      
      // Sort by frequency
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count, field: 'subcategoria' as const }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
    },
  });

  // Statistics
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['taxonomy-stats'],
    queryFn: async () => {
      const { count: totalTech } = await externalSupabase
        .from('technologies')
        .select('*', { count: 'exact', head: true });

      const { count: withTipo } = await externalSupabase
        .from('technologies')
        .select('*', { count: 'exact', head: true })
        .not('tipo_id', 'is', null);

      const { count: withSubcategoria } = await externalSupabase
        .from('technologies')
        .select('*', { count: 'exact', head: true })
        .not('subcategoria_id', 'is', null);

      const { count: withSector } = await externalSupabase
        .from('technologies')
        .select('*', { count: 'exact', head: true })
        .not('sector_id', 'is', null);

      const { count: fullyClassified } = await externalSupabase
        .from('technologies')
        .select('*', { count: 'exact', head: true })
        .not('tipo_id', 'is', null)
        .not('subcategoria_id', 'is', null)
        .not('sector_id', 'is', null);

      return {
        total: totalTech || 0,
        withTipo: withTipo || 0,
        withSubcategoria: withSubcategoria || 0,
        withSector: withSector || 0,
        fullyClassified: fullyClassified || 0,
        missingTipo: (totalTech || 0) - (withTipo || 0),
        missingSubcategoria: (totalTech || 0) - (withSubcategoria || 0),
        missingSector: (totalTech || 0) - (withSector || 0),
      };
    },
  });

  // Assign taxonomy IDs to a technology
  const assignTaxonomy = async (
    techId: string,
    updates: { tipo_id?: number; subcategoria_id?: number; sector_id?: string }
  ) => {
    const { error } = await externalSupabase
      .from('technologies')
      .update(updates)
      .eq('id', techId);
    
    if (error) throw error;
    await refetchUnclassified();
  };

  // Bulk assign subcategoria_id based on text matching
  const bulkAssignSubcategoria = async (textMatch: string, subcategoriaId: number) => {
    const { error } = await externalSupabase
      .from('technologies')
      .update({ subcategoria_id: subcategoriaId })
      .ilike('"Subcategoría"', textMatch)
      .is('subcategoria_id', null);
    
    if (error) throw error;
    await refetchUnclassified();
  };

  return {
    tipos,
    subcategorias,
    sectores,
    unclassified,
    frequentUnmapped,
    stats,
    isLoading: loadingTipos || loadingSubcategorias || loadingSectores || loadingUnclassified || loadingFrequent || loadingStats,
    assignTaxonomy,
    bulkAssignSubcategoria,
    refetchUnclassified,
  };
}