import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StudySession {
  id: string;
  study_id: string;
  session_type: string;
  status: string;
  current_phase: string | null;
  progress_percentage: number | null;
  config: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySessionLog {
  id: string;
  session_id: string;
  study_id: string;
  phase: string | null;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useStudySessions(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-sessions', studyId],
    queryFn: async () => {
      if (!studyId) return [];
      
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('study_id', studyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudySession[];
    },
    enabled: !!studyId,
  });
}

export function useActiveStudySession(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study-session-active', studyId],
    queryFn: async () => {
      if (!studyId) return null;
      
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('study_id', studyId)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StudySession | null;
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
      
      const { data, error } = await supabase
        .from('study_session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as StudySessionLog[];
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
      const { data, error } = await supabase.functions.invoke('study-start-session', {
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
      const { data, error } = await supabase.functions.invoke('study-proxy', {
        body: { endpoint, method, body },
      });

      if (error) throw error;
      return data;
    },
  });
}
