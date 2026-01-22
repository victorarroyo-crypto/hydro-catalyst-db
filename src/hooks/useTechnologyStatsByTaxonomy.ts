import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

export interface TechCountByType {
  tipo: string;
  count: number;
}

export interface TechCountByCategory {
  categoria: string;
  tipos: TechCountByType[];
  totalCount: number;
}

/**
 * Fetches technology counts grouped by "tipo" from external Supabase DB (snake_case).
 * Then maps types to taxonomy categories for hierarchical display.
 */
export function useTechnologyStatsByTaxonomy() {
  return useQuery({
    queryKey: ['technology-stats-by-taxonomy'],
    queryFn: async () => {
      // Fetch all technologies with their type field (snake_case)
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('tipo');

      if (error) {
        console.error('Error fetching technologies:', error);
        throw new Error(`Error fetching technologies: ${error.message}`);
      }

      // Count by type manually
      const countsByType: Record<string, number> = {};
      let totalTechnologies = 0;

      (data || []).forEach((tech) => {
        const tipo = tech.tipo || 'Sin clasificar';
        countsByType[tipo] = (countsByType[tipo] || 0) + 1;
        totalTechnologies++;
      });

      // Convert to array and sort by count
      const typeCounts: TechCountByType[] = Object.entries(countsByType)
        .map(([tipo, count]) => ({ tipo, count }))
        .sort((a, b) => b.count - a.count);

      return {
        typeCounts,
        totalTechnologies,
        uniqueTypes: typeCounts.length,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
