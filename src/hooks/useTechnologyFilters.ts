import { useState, useEffect } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { TechnologyFilters } from '@/types/database';

export interface FilterOptionWithCount {
  value: string;
  count: number;
}

// Keep interfaces for compatibility, but these won't be populated from external DB
export interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface TaxonomySubcategoria {
  id: number;
  tipo_id: number;
  codigo: string;
  nombre: string;
}

export interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface FilterOptions {
  tiposTecnologia: FilterOptionWithCount[];
  subcategorias: FilterOptionWithCount[];
  paises: FilterOptionWithCount[];
  sectores: FilterOptionWithCount[];
  estados: FilterOptionWithCount[];
}

export interface TaxonomyFilters {
  tipoId: number | null;
  subcategoriaId: number | null;
  sectorId: string | null;
}

/**
 * useTechnologyFilters - Simplified version
 * 
 * No longer queries taxonomy tables (taxonomy_tipos, taxonomy_subcategorias, taxonomy_sectores)
 * from the external DB as they don't exist.
 * Filter options are derived from the technologies table text fields.
 */
export function useTechnologyFilters() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    tiposTecnologia: [],
    subcategorias: [],
    paises: [],
    sectores: [],
    estados: [],
  });
  const [loading, setLoading] = useState(true);

  // DISABLED: External DB doesn't have these tables
  // Return empty arrays for taxonomy data
  const taxonomyTipos: TaxonomyTipo[] = [];
  const taxonomySubcategorias: TaxonomySubcategoria[] = [];
  const taxonomySectores: TaxonomySector[] = [];

  useEffect(() => {
    const fetchFilterOptions = async () => {
      // Fetch all technologies for counting
      const { data: allTech } = await externalSupabase
        .from('technologies')
        .select('"Tipo de tecnología", "Subcategoría", "País de origen", "Sector y subsector", status');

      if (!allTech) {
        setLoading(false);
        return;
      }

      // Count occurrences for each filter
      const countByField = (field: string): FilterOptionWithCount[] => {
        const counts: Record<string, number> = {};
        allTech.forEach((item: any) => {
          const value = item[field];
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });
        return Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value));
      };

      setFilterOptions({
        tiposTecnologia: countByField('Tipo de tecnología'),
        subcategorias: countByField('Subcategoría'),
        paises: countByField('País de origen'),
        sectores: countByField('Sector y subsector'),
        estados: countByField('status'),
      });
      setLoading(false);
    };

    fetchFilterOptions();
  }, []);

  const defaultFilters: TechnologyFilters = {
    search: '',
    tipoTecnologia: '',
    subcategoria: '',
    trlMin: 1,
    trlMax: 9,
    pais: '',
    sector: '',
    status: '',
  };

  const defaultTaxonomyFilters: TaxonomyFilters = {
    tipoId: null,
    subcategoriaId: null,
    sectorId: null,
  };

  return { 
    filterOptions, 
    loading, 
    defaultFilters,
    defaultTaxonomyFilters,
    taxonomyTipos,
    taxonomySubcategorias,
    taxonomySectores,
  };
}