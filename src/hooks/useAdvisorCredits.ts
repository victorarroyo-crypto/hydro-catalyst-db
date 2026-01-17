import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  model_used: string | null;
  created_at: string;
}

export function useAdvisorCredits(userId: string | undefined) {
  const { data: credits, isLoading: isLoadingCredits, refetch: refetchCredits } = useQuery({
    queryKey: ['advisor-credits', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await externalSupabase
        .from('advisor_users')
        .select('credits_balance, free_queries_used, free_queries_reset_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Check if free queries should reset
      const resetAt = new Date(data.free_queries_reset_at);
      const now = new Date();
      
      let freeRemaining = 5 - (data.free_queries_used || 0);
      
      if (now > resetAt) {
        // Reset free queries
        await externalSupabase
          .from('advisor_users')
          .update({
            free_queries_used: 0,
            free_queries_reset_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', userId);
        freeRemaining = 5;
      }

      return {
        balance: Number(data.credits_balance) || 0,
        freeRemaining: Math.max(0, freeRemaining),
        resetAt: data.free_queries_reset_at,
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['advisor-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await externalSupabase
        .from('advisor_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balance_after: Number(t.balance_after),
        description: t.description,
        model_used: t.model_used,
        created_at: t.created_at,
      })) as CreditTransaction[];
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  return {
    balance: credits?.balance ?? 0,
    freeRemaining: credits?.freeRemaining ?? 5,
    transactions: transactions ?? [],
    isLoading: isLoadingCredits || isLoadingTransactions,
    refetch: refetchCredits,
  };
}