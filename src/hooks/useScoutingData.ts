import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ScoutingQueueItem, 
  RejectedTechnology, 
  QueueItemUI, 
  normalizeScoutingItem,
  ScoutingFormData,
  formDataToDbFormat
} from '@/types/scouting';

// Note: These tables are new and may not be in the generated types yet
// Using type assertions to work with the new tables

// Status mapping for database queue_status
const STATUS_MAPPING: Record<string, string[]> = {
  'review': ['pending', 'review', 'reviewing'],
  'pending_approval': ['pending_approval'],
  'approved': ['approved'],
  'rejected': ['rejected'],
  // Combined filter for "all active" items
  'active': ['pending', 'review', 'reviewing', 'pending_approval'],
};

// Fetch scouting queue items by status
export const useScoutingQueue = (status?: string) => {
  return useQuery({
    queryKey: ['scouting-queue', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        const dbStatuses = STATUS_MAPPING[status] || [status];
        query = query.in('queue_status', dbStatuses);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as ScoutingQueueItem[]).map(normalizeScoutingItem);
    },
  });
};

// Fetch active scouting queue items (review + pending_approval)
export const useActiveScoutingQueue = () => {
  return useQuery({
    queryKey: ['scouting-queue', 'active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scouting_queue')
        .select('*')
        .in('queue_status', STATUS_MAPPING.active)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as ScoutingQueueItem[]).map(normalizeScoutingItem);
    },
  });
};

// Fetch all scouting queue items (all statuses)
export const useAllScoutingQueue = () => {
  return useQuery({
    queryKey: ['scouting-queue', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as ScoutingQueueItem[]).map(normalizeScoutingItem);
    },
  });
};

// Fetch rejected technologies
export const useRejectedTechnologies = () => {
  return useQuery({
    queryKey: ['rejected-technologies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rejected_technologies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RejectedTechnology[];
    },
  });
};

// Update scouting queue item
export const useUpdateScoutingItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScoutingFormData> }) => {
      // Convert form data to database column names
      const dbUpdates = formDataToDbFormat(updates as ScoutingFormData);
      
      const { data, error } = await (supabase as any)
        .from('scouting_queue')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      toast.success('Cambios guardados');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar', { description: error.message });
    },
  });
};

// Change status of scouting item
export const useChangeScoutingStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reviewedBy 
    }: { 
      id: string; 
      status: 'review' | 'pending_approval' | 'approved' | 'rejected';
      reviewedBy?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        queue_status: status,
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'pending_approval' && reviewedBy) {
        updateData.reviewed_by = reviewedBy;
        updateData.reviewed_at = new Date().toISOString();
      }
      
      if (status === 'approved' && reviewedBy) {
        updateData.reviewed_by = reviewedBy;
        updateData.reviewed_at = new Date().toISOString();
      }
      
      const { data, error } = await (supabase as any)
        .from('scouting_queue')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      const statusLabels: Record<string, string> = {
        'review': 'En revisión',
        'pending_approval': 'Pendiente aprobación',
        'approved': 'Aprobada',
        'rejected': 'Rechazada',
      };
      toast.success(`Estado cambiado a "${statusLabels[variables.status]}"`);
    },
    onError: (error: Error) => {
      toast.error('Error al cambiar estado', { description: error.message });
    },
  });
};

// Approve technology to main database
export const useApproveToTechnologies = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scoutingId, approvedBy }: { scoutingId: string; approvedBy: string }) => {
      // Use the database function that exists
      const { data, error } = await (supabase as any).rpc('approve_scouting_to_technologies', {
        scouting_id: scoutingId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Tecnología transferida a la base de datos principal');
    },
    onError: (error: Error) => {
      toast.error('Error al aprobar tecnología', { description: error.message });
    },
  });
};

// Reject technology
export const useMoveToRejected = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      scoutingId, 
      rejectionReason, 
      rejectedBy, 
      rejectionStage 
    }: { 
      scoutingId: string; 
      rejectionReason: string; 
      rejectedBy: string; 
      rejectionStage: 'analyst' | 'supervisor' | 'admin';
    }) => {
      // Use the database function that exists
      const { data, error } = await (supabase as any).rpc('reject_scouting_to_rejected', {
        scouting_id: scoutingId,
        reason: rejectionReason,
        category: rejectionStage,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-technologies'] });
      toast.success('Tecnología movida a rechazadas');
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar tecnología', { description: error.message });
    },
  });
};

// Get scouting queue counts by status
export const useScoutingCounts = () => {
  return useQuery({
    queryKey: ['scouting-counts'],
    queryFn: async () => {
      const supabaseAny = supabase as any;
      const [reviewRes, pendingRes, rejectedRes] = await Promise.all([
        supabaseAny.from('scouting_queue').select('id', { count: 'exact', head: true }).in('queue_status', ['pending', 'review', 'reviewing']),
        supabaseAny.from('scouting_queue').select('id', { count: 'exact', head: true }).eq('queue_status', 'pending_approval'),
        supabaseAny.from('rejected_technologies').select('id', { count: 'exact', head: true }),
      ]);
      
      return {
        review: reviewRes.count ?? 0,
        pending_approval: pendingRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
      };
    },
  });
};
