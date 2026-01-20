import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studySessionsService, StudySession, StudyLog } from '@/services/studySessionsService';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { toast } from '@/hooks/use-toast';

// Re-export types for backwards compatibility
export type { StudySession };
export type StudySessionLog = StudyLog;

export function useStudySessions(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-sessions', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      // Use API to list sessions for this study
      const response = await studySessionsService.list({ limit: 100 });
      const sessions = response.sessions || response.data || response || [];
      // Filter by study_id (topic field maps to study reference in new schema)
      return sessions.filter((s: any) => s.id === studyId || s.topic === studyId) as StudySession[];
    },
    enabled: !!studyId,
  });
}

export function useActiveStudySession(studyId: string | undefined, sessionType?: string) {
  return useQuery({
    queryKey: ['study-session-active', studyId, sessionType],
    queryFn: async () => {
      if (!studyId) return null;
      
      // Fetch sessions and filter for active ones
      const response = await studySessionsService.list({ status: 'running', limit: 10 });
      const sessions = response.sessions || response.data || response || [];
      
      // Find active session matching study and optionally session type
      const activeSession = sessions.find((s: any) => {
        const matchesStudy = s.id === studyId || s.topic === studyId;
        const isActive = s.status === 'pending' || s.status === 'running';
        const matchesType = !sessionType || s.current_phase === sessionType;
        return matchesStudy && isActive && matchesType;
      });
      
      return activeSession as StudySession | null;
    },
    enabled: !!studyId,
    refetchInterval: (query) => {
      // Refetch every 3 seconds if there's an active session
      return query.state.data ? 3000 : false;
    },
  });
}

export function useStudySessionLogs(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['study-session-logs', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const response = await studySessionsService.listLogs(sessionId, { limit: 200 });
      return (response.logs || response.data || response || []) as StudyLog[];
    },
    enabled: !!sessionId,
    refetchInterval: 2000, // Refetch logs every 2 seconds
  });
}

export function useStartStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studyId, 
      sessionType, 
      config 
    }: { 
      studyId: string; 
      sessionType: string; 
      config?: Record<string, unknown>;
    }) => {
      // Use local Lovable Supabase for edge functions (as per memory)
      const { data, error } = await externalSupabase.functions.invoke('study-start-session', {
        body: { study_id: studyId, session_type: sessionType, config },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to start session');
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['study-sessions', variables.studyId] });
      queryClient.invalidateQueries({ queryKey: ['study-session-active', variables.studyId] });
      toast({
        title: 'Sesión iniciada',
        description: 'La sesión de IA ha comenzado a procesar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useStudyProxy() {
  return useMutation({
    mutationFn: async ({ 
      endpoint, 
      method = 'GET', 
      body 
    }: { 
      endpoint: string; 
      method?: string; 
      body?: Record<string, unknown>;
    }) => {
      const { data, error } = await externalSupabase.functions.invoke('study-proxy', {
        body: { endpoint, method, body },
      });

      if (error) throw error;
      return data;
    },
  });
}
