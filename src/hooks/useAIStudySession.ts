import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveStudySession, useStudySessionLogs, useStartStudySession } from './useStudySessions';
import { toast } from '@/hooks/use-toast';

export type AISessionPhase = 
  | 'research' 
  | 'solutions' 
  | 'longlist' 
  | 'shortlist' 
  | 'evaluation' 
  | 'report';

export interface AIStudySessionState {
  isActive: boolean;
  isStarting: boolean;
  currentPhase: string | null;
  progress: number;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  logs: Array<{
    id: string;
    phase: string | null;
    level: string;
    message: string;
    details: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export function useAIStudySession(studyId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: activeSession, isLoading: isLoadingSession } = useActiveStudySession(studyId);
  const { data: logs = [] } = useStudySessionLogs(activeSession?.id);
  const startSessionMutation = useStartStudySession();
  
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  // Subscribe to realtime updates for the active session
  useEffect(() => {
    if (!activeSession?.id) return;

    const channel = supabase
      .channel(`study-session-${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `id=eq.${activeSession.id}`,
        },
        () => {
          setRealtimeUpdates(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ['study-session-active', studyId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_session_logs',
          filter: `session_id=eq.${activeSession.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-session-logs', activeSession.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id, studyId, queryClient]);

  // Subscribe to realtime updates for study data changes
  useEffect(() => {
    if (!studyId) return;

    const channel = supabase
      .channel(`study-data-${studyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_research',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-research', studyId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_solutions',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-solutions', studyId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_longlist',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_evaluations',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-evaluations', studyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studyId, queryClient]);

  const startSession = useCallback(async (
    sessionType: AISessionPhase,
    config?: Record<string, unknown>
  ) => {
    if (!studyId) {
      toast({
        title: 'Error',
        description: 'No se ha seleccionado ningún estudio.',
        variant: 'destructive',
      });
      return;
    }

    await startSessionMutation.mutateAsync({
      studyId,
      sessionType,
      config,
    });
  }, [studyId, startSessionMutation]);

  const cancelSession = useCallback(async () => {
    if (!activeSession?.id) return;

    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['study-sessions', studyId] });
      queryClient.invalidateQueries({ queryKey: ['study-session-active', studyId] });
      
      toast({
        title: 'Sesión cancelada',
        description: 'La sesión de IA ha sido cancelada.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la sesión.',
        variant: 'destructive',
      });
    }
  }, [activeSession?.id, studyId, queryClient]);

  const state: AIStudySessionState = {
    isActive: !!activeSession && ['pending', 'running'].includes(activeSession.status),
    isStarting: startSessionMutation.isPending,
    currentPhase: activeSession?.current_phase || null,
    progress: activeSession?.progress_percentage || 0,
    status: activeSession?.status as AIStudySessionState['status'] || 'idle',
    error: activeSession?.error_message || null,
    logs,
  };

  return {
    ...state,
    isLoading: isLoadingSession,
    startSession,
    cancelSession,
    activeSession,
    realtimeUpdates,
  };
}
