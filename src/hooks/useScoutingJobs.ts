import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { toast } from 'sonner';

export interface ScoutingJob {
  id: string;
  session_id: string;
  status: string;
  current_phase: string | null;
  started_at: string;
  completed_at: string | null;
  last_heartbeat: string | null;
  error_message: string | null;
  config: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  technologies_found: number | null;
  technologies_approved: number | null;
  technologies_discarded: number | null;
  sites_examined: number | null;
  progress_percentage: number | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  is_zombie: boolean;
  duration_seconds: number;
}

const ZOMBIE_THRESHOLD_MINUTES = 15;

const calculateDuration = (job: { started_at: string; completed_at: string | null }): number => {
  const start = new Date(job.started_at);
  const end = job.completed_at ? new Date(job.completed_at) : new Date();
  return differenceInSeconds(end, start);
};

const isJobZombie = (job: { status: string; last_heartbeat: string | null; updated_at: string }): boolean => {
  if (job.status !== 'running') return false;
  const heartbeat = job.last_heartbeat || job.updated_at;
  return differenceInMinutes(new Date(), new Date(heartbeat)) > ZOMBIE_THRESHOLD_MINUTES;
};

export const useScoutingJobs = (limit = 50) => {
  return useQuery({
    queryKey: ['admin-scouting-jobs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouting_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((job): ScoutingJob => ({
        ...job,
        config: job.config as Record<string, unknown> | null,
        summary: job.summary as Record<string, unknown> | null,
        is_zombie: isJobZombie(job),
        duration_seconds: calculateDuration(job),
      }));
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};

export const useScoutingJobStats = () => {
  return useQuery({
    queryKey: ['admin-scouting-jobs-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('scouting_sessions')
        .select('id, status, last_heartbeat, updated_at, started_at')
        .gte('started_at', today.toISOString());

      if (error) throw error;

      const jobs = data || [];
      const total = jobs.length;
      const completed = jobs.filter(j => j.status === 'completed').length;
      const failed = jobs.filter(j => j.status === 'failed').length;
      const running = jobs.filter(j => j.status === 'running');
      const zombies = running.filter(j => isJobZombie(j));

      return {
        total,
        completed,
        failed,
        running: running.length,
        zombies: zombies.length,
        zombieIds: zombies.map(z => z.id),
      };
    },
    refetchInterval: 30000,
  });
};

export const useForceCloseJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('force_close_scouting_job', {
        job_id: jobId,
        close_reason: reason || 'Cerrado manualmente desde admin',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Job cerrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-scouting-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-scouting-jobs-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar job: ${error.message}`);
    },
  });
};

export const useCloseZombieJobs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maxAgeMinutes: number = 10): Promise<number> => {
      const { data, error } = await supabase.rpc('close_zombie_jobs', {
        max_age_minutes: maxAgeMinutes,
      });

      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (count: number) => {
      if (count > 0) {
        toast.success(`${count} job(s) zombie cerrado(s)`);
      } else {
        toast.info('No hay jobs zombie para cerrar');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-scouting-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-scouting-jobs-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar jobs zombie: ${error.message}`);
    },
  });
};

export const useScoutingJobLogs = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['scouting-job-logs', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('scouting_session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
  });
};
