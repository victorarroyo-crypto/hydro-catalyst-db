import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Chat {
  id: string;
  title: string | null;
  model_used: string | null;
  total_credits_used: number;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export function useAdvisorHistory(userId: string | undefined) {
  const { data: chats, isLoading, refetch } = useQuery({
    queryKey: ['advisor-history', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch chats with real message count via join
      const { data, error } = await supabase
        .from('advisor_chats')
        .select(`
          *,
          advisor_messages(count)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map(chat => {
        // Extract real message count from join result
        const realMessageCount = Array.isArray(chat.advisor_messages) && chat.advisor_messages.length > 0
          ? (chat.advisor_messages[0] as { count: number })?.count || 0
          : 0;
        
        return {
          id: chat.id,
          title: chat.title || 'Conversación sin título',
          model_used: chat.model_used,
          total_credits_used: Number(chat.total_credits_used) || 0,
          message_count: realMessageCount,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        };
      }) as Chat[];
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  return {
    chats: chats ?? [],
    isLoading,
    refetch,
  };
}