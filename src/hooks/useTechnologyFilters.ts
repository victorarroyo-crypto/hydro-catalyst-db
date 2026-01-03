import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TechnologyFilters } from '@/types/database';

export interface FilterOptions {
  tiposTecnologia: string[];
  subcategorias: string[];
  paises: string[];
  sectores: string[];
  estados: string[];
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
      const [tipos, subcats, paises, sectores, estados] = await Promise.all([
        supabase.from('technologies').select('"Tipo de tecnología"').not('"Tipo de tecnología"', 'is', null),
        supabase.from('technologies').select('"Subcategoría"').not('"Subcategoría"', 'is', null),
        supabase.from('technologies').select('"País de origen"').not('"País de origen"', 'is', null),
        supabase.from('technologies').select('"Sector y subsector"').not('"Sector y subsector"', 'is', null),
        supabase.from('technologies').select('status').not('status', 'is', null),
      ]);

      const unique = (arr: any[], key: string) => {
        const values = arr?.map((item) => item[key]).filter(Boolean) || [];
        return [...new Set(values)].sort();
      };

      setFilterOptions({
        tiposTecnologia: unique(tipos.data || [], 'Tipo de tecnología'),
        subcategorias: unique(subcats.data || [], 'Subcategoría'),
        paises: unique(paises.data || [], 'País de origen'),
        sectores: unique(sectores.data || [], 'Sector y subsector'),
        estados: unique(estados.data || [], 'status'),
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
