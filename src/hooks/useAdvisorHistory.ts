import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';

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

      // Fetch from BOTH databases and merge results
      // External DB has chats after ~18/01/2026, local has older ones
      
      const [externalChatsResult, localResult] = await Promise.all([
        // External database (Railway/external Supabase) - recent chats
        externalSupabase
          .from('advisor_chats')
          .select(`
            id,
            title,
            model_used,
            total_credits_used,
            created_at,
            updated_at
          `)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(50),
        
        // Local Lovable Cloud database - older chats
        supabase
          .from('advisor_chats')
          .select(`
            *,
            advisor_messages(count)
          `)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(50)
      ]);

      // Get message counts for external chats
      const externalChatIds = (externalChatsResult.data || []).map(c => c.id);
      let externalMessageCounts: Record<string, number> = {};
      
      if (externalChatIds.length > 0) {
        // Query message counts from external DB
        const { data: messagesData } = await externalSupabase
          .from('advisor_messages')
          .select('chat_id')
          .in('chat_id', externalChatIds);
        
        // Count messages per chat
        if (messagesData) {
          messagesData.forEach(msg => {
            externalMessageCounts[msg.chat_id] = (externalMessageCounts[msg.chat_id] || 0) + 1;
          });
        }
      }

      // Process external chats with real message counts
      const externalChats: Chat[] = (externalChatsResult.data || []).map(chat => ({
        id: chat.id,
        title: chat.title || 'Conversación sin título',
        model_used: chat.model_used,
        total_credits_used: Number(chat.total_credits_used) || 0,
        message_count: externalMessageCounts[chat.id] || 0,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      }));

      // Process local chats
      const localChats: Chat[] = (localResult.data || []).map(chat => {
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
      });

      // Merge and deduplicate by ID (external takes priority for duplicates)
      const chatMap = new Map<string, Chat>();
      
      // Add local first
      localChats.forEach(chat => chatMap.set(chat.id, chat));
      // External overwrites duplicates
      externalChats.forEach(chat => chatMap.set(chat.id, chat));
      
      // Sort by updated_at descending
      const mergedChats = Array.from(chatMap.values())
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return mergedChats;
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