/**
 * Hooks para el módulo de Scouting
 * 
 * MIGRACIÓN: Este hook ahora lee directamente de la base de datos externa
 * (ktzhrlcvluaptixngrsh.supabase.co) usando el cliente externalSupabase.
 * 
 * La BD externa usa schema snake_case: nombre, proveedor, status, etc.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

import { toast } from 'sonner';
import { 
  ExternalScoutingQueueItem,
  ExternalRejectedTechnology,
  QueueItemUI, 
  normalizeExternalScoutingItem,
  ScoutingFormData,
  formDataToExternalDbFormat
} from '@/types/scouting';

// Status mapping for external database 'status' column
const STATUS_MAPPING: Record<string, string[]> = {
  'review': ['pending', 'review', 'reviewing'],
  'pending_approval': ['pending_approval'],
  'approved': ['approved'],
  'rejected': ['rejected'],
  'active': ['pending', 'review', 'reviewing', 'pending_approval'],
};

// ============================================================
// FETCH HOOKS (read from external DB)
// ============================================================

/**
 * Fetch scouting queue items by status from external DB
 */
export const useScoutingQueue = (status?: string) => {
  return useQuery({
    queryKey: ['scouting-queue', status],
    queryFn: async () => {
      let query = externalSupabase
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        const dbStatuses = STATUS_MAPPING[status] || [status];
        query = query.in('status', dbStatuses);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as ExternalScoutingQueueItem[]).map(normalizeExternalScoutingItem);
    },
  });
};

/**
 * Fetch active scouting queue items (review + pending_approval)
 */
export const useActiveScoutingQueue = () => {
  return useQuery({
    queryKey: ['scouting-queue', 'active'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .in('status', STATUS_MAPPING.active)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as ExternalScoutingQueueItem[]).map(normalizeExternalScoutingItem);
    },
  });
};

/**
 * Fetch all scouting queue items (all statuses)
 */
export const useAllScoutingQueue = () => {
  return useQuery({
    queryKey: ['scouting-queue', 'all'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as ExternalScoutingQueueItem[]).map(normalizeExternalScoutingItem);
    },
  });
};

/**
 * Fetch rejected technologies from external DB
 */
export const useRejectedTechnologies = () => {
  return useQuery({
    queryKey: ['rejected-technologies'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('rejected_technologies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExternalRejectedTechnology[];
    },
  });
};

// ============================================================
// MUTATION HOOKS (write to external DB)
// ============================================================

/**
 * Update scouting queue item in external DB
 */
export const useUpdateScoutingItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScoutingFormData> }) => {
      const dbUpdates = formDataToExternalDbFormat(updates as ScoutingFormData);
      
      const { data, error } = await externalSupabase
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

/**
 * Change status of scouting item in external DB
 */
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
        status: status,
        updated_at: new Date().toISOString(),
      };
      
      if ((status === 'pending_approval' || status === 'approved') && reviewedBy) {
        updateData.reviewed_by = reviewedBy;
        updateData.reviewed_at = new Date().toISOString();
      }
      
      const { data, error } = await externalSupabase
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

/**
 * Approve technology: 
 * 1. Get data from external scouting_queue
 * 2. Insert into LOCAL technologies (Lovable Cloud)
 * 3. Delete from external scouting_queue
 */
export const useApproveToTechnologies = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      scoutingId, 
      approvedBy,
      approverId
    }: { 
      scoutingId: string; 
      approvedBy: string;
      approverId?: string;
    }) => {
      // 1. Fetch the record from external DB
      const { data: scoutingRecord, error: fetchError } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', scoutingId)
        .single();
      
      if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);
      if (!scoutingRecord) throw new Error('Registro no encontrado');
      
      const record = scoutingRecord as ExternalScoutingQueueItem;
      
      // 2. Insert into LOCAL technologies table (Lovable Cloud)
      const { data: newTech, error: insertError } = await externalSupabase
        .from('technologies')
        .insert({
          "Nombre de la tecnología": record.nombre,
          "Tipo de tecnología": record.tipo_sugerido || 'Otro',
          "Subcategoría": record.subcategoria,
          "Sector y subsector": record.sector,
          "Proveedor / Empresa": record.proveedor,
          "País de origen": record.pais,
          "Paises donde actua": record.paises_actua,
          "Web de la empresa": record.web,
          "Email de contacto": record.email,
          "Descripción técnica breve": record.descripcion,
          "Aplicación principal": record.aplicacion_principal,
          "Ventaja competitiva clave": record.ventaja_competitiva,
          "Porque es innovadora": record.innovacion,
          "Grado de madurez (TRL)": record.trl_estimado,
          "Casos de referencia": record.casos_referencia,
          "Comentarios del analista": record.comentarios_analista,
          subsector_industrial: record.subsector,
          status: 'active',
          review_status: 'none',
        })
        .select()
        .single();
      
      if (insertError) throw new Error(`Error al insertar tecnología: ${insertError.message}`);
      
      // 3. Delete from external scouting_queue
      const { error: deleteError } = await externalSupabase
        .from('scouting_queue')
        .delete()
        .eq('id', scoutingId);
      
      if (deleteError) {
        console.error('Error deleting from external queue:', deleteError);
        // Don't fail the whole operation if delete fails
      }
      
      return newTech;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-counts'] });
      toast.success('Tecnología transferida a la base de datos principal');
    },
    onError: (error: Error) => {
      toast.error('Error al aprobar tecnología', { description: error.message });
    },
  });
};

/**
 * Reject technology:
 * 1. Get data from external scouting_queue
 * 2. Insert into external rejected_technologies
 * 3. Delete from external scouting_queue
 */
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
      // 1. Fetch the record from external DB
      const { data: scoutingRecord, error: fetchError } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', scoutingId)
        .single();
      
      if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);
      if (!scoutingRecord) throw new Error('Registro no encontrado');
      
      const record = scoutingRecord as ExternalScoutingQueueItem;
      
      // 2. Insert into rejected_technologies in external DB
      const { error: insertError } = await externalSupabase
        .from('rejected_technologies')
        .insert({
          original_scouting_id: record.id,
          nombre: record.nombre,
          proveedor: record.proveedor,
          pais: record.pais,
          web: record.web,
          email: record.email,
          descripcion: record.descripcion,
          tipo_sugerido: record.tipo_sugerido,
          subcategoria: record.subcategoria,
          sector: record.sector,
          subsector: record.subsector,
          aplicacion_principal: record.aplicacion_principal,
          ventaja_competitiva: record.ventaja_competitiva,
          innovacion: record.innovacion,
          trl_estimado: record.trl_estimado,
          casos_referencia: record.casos_referencia,
          paises_actua: record.paises_actua,
          comentarios_analista: record.comentarios_analista,
          rejection_reason: rejectionReason,
          rejection_category: rejectionStage,
          rejected_by: rejectedBy,
          rejected_at: new Date().toISOString(),
          original_data: record as unknown as Record<string, unknown>,
        });
      
      if (insertError) throw new Error(`Error al mover a rechazadas: ${insertError.message}`);
      
      // 3. Delete from external scouting_queue
      const { error: deleteError } = await externalSupabase
        .from('scouting_queue')
        .delete()
        .eq('id', scoutingId);
      
      if (deleteError) {
        console.error('Error deleting from external queue:', deleteError);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-technologies'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-counts'] });
      toast.success('Tecnología movida a rechazadas');
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar tecnología', { description: error.message });
    },
  });
};

// ============================================================
// COUNT HOOKS
// ============================================================

/**
 * Get scouting queue counts by status from external DB
 */
export const useScoutingCounts = () => {
  return useQuery({
    queryKey: ['scouting-counts'],
    queryFn: async () => {
      const [reviewRes, pendingRes, rejectedRes] = await Promise.all([
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'review', 'reviewing']),
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),
        externalSupabase
          .from('rejected_technologies')
          .select('id', { count: 'exact', head: true }),
      ]);
      
      return {
        review: reviewRes.count ?? 0,
        pending_approval: pendingRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
      };
    },
  });
};

/**
 * Get technology counts grouped by scouting_job_id from external DB
 */
export const useTechCountsBySession = () => {
  return useQuery({
    queryKey: ['tech-counts-by-session'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('scouting_job_id');
      
      if (error) throw error;
      
      // Count by session
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { scouting_job_id: string | null }) => {
        if (item.scouting_job_id) {
          counts[item.scouting_job_id] = (counts[item.scouting_job_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    refetchInterval: 30000,
  });
};
