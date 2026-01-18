import { useQuery } from '@tanstack/react-query';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

export interface TaxonomyData {
  version: string;
  counts: {
    categorias: number;
    tipos: number;
    subcategorias: number;
  };
  taxonomy: Record<string, CategoryData>;
}

export interface CategoryData {
  nombre: string;
  descripcion?: string;
  tipos: Record<string, string[]>;
}

export interface TaxonomySelections {
  categorias: string[];      // códigos: ["TAP", "TAI"]
  tipos: string[];           // nombres: ["Filtración", "Desinfección"]
  subcategorias: string[];   // nombres: ["Ósmosis inversa", "UV"]
}

export const useTaxonomy3Levels = () => {
  const { data: taxonomyData, isLoading, error } = useQuery<TaxonomyData>({
    queryKey: ['taxonomy-3-levels'],
    queryFn: async () => {
      const response = await fetch(`${RAILWAY_URL}/api/taxonomy`);
      if (!response.ok) {
        throw new Error(`Error fetching taxonomy: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });

  // Derived data helpers
  const getAllCategorias = (): { codigo: string; nombre: string; descripcion?: string }[] => {
    if (!taxonomyData?.taxonomy) return [];
    return Object.entries(taxonomyData.taxonomy).map(([codigo, data]) => ({
      codigo,
      nombre: data.nombre,
      descripcion: data.descripcion,
    }));
  };

  const getTiposForCategorias = (selectedCategorias: string[]): string[] => {
    if (!taxonomyData?.taxonomy || selectedCategorias.length === 0) return [];
    
    const tipos = new Set<string>();
    selectedCategorias.forEach(codigo => {
      const categoria = taxonomyData.taxonomy[codigo];
      if (categoria?.tipos) {
        Object.keys(categoria.tipos).forEach(tipo => tipos.add(tipo));
      }
    });
    return Array.from(tipos).sort();
  };

  const getSubcategoriasForTipos = (selectedCategorias: string[], selectedTipos: string[]): string[] => {
    if (!taxonomyData?.taxonomy || selectedCategorias.length === 0 || selectedTipos.length === 0) return [];
    
    const subcategorias = new Set<string>();
    selectedCategorias.forEach(codigo => {
      const categoria = taxonomyData.taxonomy[codigo];
      if (categoria?.tipos) {
        selectedTipos.forEach(tipo => {
          const subs = categoria.tipos[tipo];
          if (subs) {
            subs.forEach(sub => subcategorias.add(sub));
          }
        });
      }
    });
    return Array.from(subcategorias).sort();
  };

  return {
    taxonomyData,
    isLoading,
    error,
    getAllCategorias,
    getTiposForCategorias,
    getSubcategoriasForTipos,
  };
};
