import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TechnologyFilters } from '@/types/database';

export interface FilterOptionWithCount {
  value: string;
  count: number;
}

export interface FilterOptions {
  tiposTecnologia: FilterOptionWithCount[];
  subcategorias: FilterOptionWithCount[];
  paises: FilterOptionWithCount[];
  sectores: FilterOptionWithCount[];
  estados: FilterOptionWithCount[];
}

export function useTechnologyFilters() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    tiposTecnologia: [],
    subcategorias: [],
    paises: [],
    sectores: [],
    estados: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      // Fetch all technologies for counting
      const { data: allTech } = await supabase
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

  return { filterOptions, loading, defaultFilters };
}
