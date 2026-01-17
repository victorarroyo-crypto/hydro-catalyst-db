import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TableName = 
  | 'technologies' 
  | 'taxonomy_tipos' 
  | 'taxonomy_subcategorias' 
  | 'taxonomy_sectores' 
  | 'technological_trends' 
  | 'projects' 
  | 'technology_edits' 
  | 'user_favorites'
  | 'casos_de_estudio'
  | 'scouting_queue'
  | 'scouting_sessions'
  | 'study_sessions'
  | 'scouting_studies';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  queryKeys: string[][];
}

export const useRealtimeSubscription = ({ tables, queryKeys }: UseRealtimeSubscriptionOptions) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = tables.map((table, index) => {
      return supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            // Invalidate related queries when data changes
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, queryKeys, queryClient]);
};
