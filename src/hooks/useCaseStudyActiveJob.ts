import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useEffect } from 'react';

export interface ActiveCaseStudyJob {
  id: string;
  status: string;
  current_phase: string | null;
  progress_percentage: number;
  error_message: string | null;
  case_study_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to detect and track active case study processing jobs.
 * An active job is one with status 'processing' or 'awaiting_user_decision' that was updated within the last 15 minutes.
 */
export function useCaseStudyActiveJob() {
  const ZOMBIE_THRESHOLD_MINUTES = 20;
  
  const query = useQuery({
    queryKey: ['case-study-active-job'],
    queryFn: async () => {
      const cutoffTime = new Date(Date.now() - ZOMBIE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
      
      const { data, error } = await externalSupabase
        .from('case_study_jobs')
        .select('id, status, current_phase, progress_percentage, error_message, case_study_id, created_at, updated_at, result_data')
        .in('status', ['processing', 'awaiting_user_decision'])
        .gte('updated_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[useCaseStudyActiveJob] Error fetching active job:', error);
        return null;
      }
      
      return data as ActiveCaseStudyJob | null;
    },
    refetchInterval: (query) => {
      // Refetch every 5 seconds if there's an active job, otherwise every 30 seconds
      return query.state.data ? 5000 : 30000;
    },
    staleTime: 2000,
  });

  // Subscribe to realtime updates for the active job
  useEffect(() => {
    if (!query.data?.id) return;

    const channel = externalSupabase
      .channel(`case_study_active_job_${query.data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'case_study_jobs',
          filter: `id=eq.${query.data.id}`,
        },
        () => {
          // Refetch on any update
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, [query.data?.id]);

  return {
    activeJob: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
