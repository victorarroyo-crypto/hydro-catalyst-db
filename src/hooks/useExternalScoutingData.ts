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

/**
 * Hook para leer scouting_queue desde la Supabase EXTERNA (Railway)
 * Las operaciones de aprobación escriben a Lovable Cloud (Master)
 */

// Helper function to call the external scouting queue edge function
async function callExternalScoutingQueue<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('external-scouting-queue', {
    body,
  });

  if (error) {
    console.error('[useExternalScoutingData] Function error:', error);
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Error al comunicar con BD externa');
  }

  return data.data as T;
}

// Fetch scouting queue items from EXTERNAL DB by status
export const useExternalScoutingQueue = (status?: string) => {
  return useQuery({
    queryKey: ['external-scouting-queue', status],
    queryFn: async () => {
      const data = await callExternalScoutingQueue<ScoutingQueueItem[]>({
        action: 'list',
        status: status || 'all',
      });
      return data.map(normalizeScoutingItem);
    },
  });
};

// Fetch active scouting queue items from EXTERNAL DB (review + pending_approval)
export const useExternalActiveScoutingQueue = () => {
  return useQuery({
    queryKey: ['external-scouting-queue', 'active'],
    queryFn: async () => {
      const data = await callExternalScoutingQueue<ScoutingQueueItem[]>({
        action: 'list',
        status: 'active',
      });
      return data.map(normalizeScoutingItem);
    },
  });
};

// Fetch all scouting queue items from EXTERNAL DB
export const useExternalAllScoutingQueue = () => {
  return useQuery({
    queryKey: ['external-scouting-queue', 'all'],
    queryFn: async () => {
      const data = await callExternalScoutingQueue<ScoutingQueueItem[]>({
        action: 'list',
        status: 'all',
      });
      return data.map(normalizeScoutingItem);
    },
  });
};

// Fetch rejected technologies from LOCAL DB (Lovable Cloud)
// Rejected techs are stored locally, not in external DB
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

// Update scouting queue item in EXTERNAL DB
export const useUpdateExternalScoutingItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScoutingFormData> }) => {
      // Convert form data to database column names
      const dbUpdates = formDataToDbFormat(updates as ScoutingFormData);
      
      const data = await callExternalScoutingQueue<ScoutingQueueItem>({
        action: 'update',
        id,
        updates: dbUpdates,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-scouting-queue'] });
      toast.success('Cambios guardados en BD externa');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar', { description: error.message });
    },
  });
};

// Change status of scouting item in EXTERNAL DB
export const useChangeExternalScoutingStatus = () => {
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
      };
      
      if ((status === 'pending_approval' || status === 'approved') && reviewedBy) {
        updateData.reviewed_by = reviewedBy;
        updateData.reviewed_at = new Date().toISOString();
      }
      
      const data = await callExternalScoutingQueue<ScoutingQueueItem>({
        action: 'update',
        id,
        updates: updateData,
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['external-scouting-queue'] });
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

// Approve technology: 
// 1. Copy data from EXTERNAL to LOCAL technologies table
// 2. Mark as approved in EXTERNAL DB
export const useApproveExternalToTechnologies = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scoutingId, approvedBy }: { scoutingId: string; approvedBy: string }) => {
      // Step 1: Get the full record from external DB
      const scoutingRecord = await callExternalScoutingQueue<ScoutingQueueItem>({
        action: 'get',
        id: scoutingId,
      });
      
      // Step 2: Insert into LOCAL technologies table (Lovable Cloud)
      const techData = {
        "Nombre de la tecnología": scoutingRecord["Nombre de la tecnología"],
        "Tipo de tecnología": scoutingRecord["Tipo de tecnología"] || 'Sin clasificar',
        "Subcategoría": scoutingRecord["Subcategoría"],
        "Sector y subsector": scoutingRecord["Sector y subsector"],
        "Proveedor / Empresa": scoutingRecord["Proveedor / Empresa"],
        "País de origen": scoutingRecord["País de origen"],
        "Paises donde actua": scoutingRecord["Paises donde actua"],
        "Web de la empresa": scoutingRecord["Web de la empresa"],
        "Email de contacto": scoutingRecord["Email de contacto"],
        "Descripción técnica breve": scoutingRecord["Descripción técnica breve"],
        "Aplicación principal": scoutingRecord["Aplicación principal"],
        "Ventaja competitiva clave": scoutingRecord["Ventaja competitiva clave"],
        "Porque es innovadora": scoutingRecord["Porque es innovadora"],
        "Grado de madurez (TRL)": scoutingRecord["Grado de madurez (TRL)"],
        "Casos de referencia": scoutingRecord["Casos de referencia"],
        "Comentarios del analista": scoutingRecord["Comentarios del analista"],
        "Fecha de scouting": scoutingRecord["Fecha de scouting"],
        "Estado del seguimiento": scoutingRecord["Estado del seguimiento"],
        tipo_id: scoutingRecord.tipo_id,
        subcategoria_id: scoutingRecord.subcategoria_id,
        sector_id: scoutingRecord.sector_id,
        subsector_industrial: scoutingRecord.subsector_industrial,
        status: 'active',
        review_status: 'none',
      };
      
      const { data: newTech, error: insertError } = await (supabase as any)
        .from('technologies')
        .insert(techData)
        .select()
        .single();
      
      if (insertError) {
        console.error('[useApproveExternalToTechnologies] Insert error:', insertError);
        throw insertError;
      }
      
      // Step 3: Mark as approved in EXTERNAL DB and delete from queue
      await callExternalScoutingQueue({
        action: 'update',
        id: scoutingId,
        updates: {
          queue_status: 'approved',
          reviewed_by: approvedBy,
          reviewed_at: new Date().toISOString(),
        },
      });
      
      return newTech;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Tecnología transferida a la base de datos principal (Lovable Cloud)');
    },
    onError: (error: Error) => {
      toast.error('Error al aprobar tecnología', { description: error.message });
    },
  });
};

// Reject technology:
// 1. Copy to LOCAL rejected_technologies table
// 2. Mark as rejected in EXTERNAL DB
export const useMoveExternalToRejected = () => {
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
      // Step 1: Get the full record from external DB
      const scoutingRecord = await callExternalScoutingQueue<ScoutingQueueItem>({
        action: 'get',
        id: scoutingId,
      });
      
      // Step 2: Insert into LOCAL rejected_technologies table
      const rejectedData = {
        original_scouting_id: scoutingId,
        "Nombre de la tecnología": scoutingRecord["Nombre de la tecnología"],
        "Tipo de tecnología": scoutingRecord["Tipo de tecnología"] || 'Sin clasificar',
        "Subcategoría": scoutingRecord["Subcategoría"],
        "Sector y subsector": scoutingRecord["Sector y subsector"],
        "Proveedor / Empresa": scoutingRecord["Proveedor / Empresa"],
        "País de origen": scoutingRecord["País de origen"],
        "Paises donde actua": scoutingRecord["Paises donde actua"],
        "Web de la empresa": scoutingRecord["Web de la empresa"],
        "Email de contacto": scoutingRecord["Email de contacto"],
        "Descripción técnica breve": scoutingRecord["Descripción técnica breve"],
        "Aplicación principal": scoutingRecord["Aplicación principal"],
        "Ventaja competitiva clave": scoutingRecord["Ventaja competitiva clave"],
        "Porque es innovadora": scoutingRecord["Porque es innovadora"],
        "Grado de madurez (TRL)": scoutingRecord["Grado de madurez (TRL)"],
        "Casos de referencia": scoutingRecord["Casos de referencia"],
        "Comentarios del analista": scoutingRecord["Comentarios del analista"],
        "Fecha de scouting": scoutingRecord["Fecha de scouting"],
        "Estado del seguimiento": scoutingRecord["Estado del seguimiento"],
        tipo_id: scoutingRecord.tipo_id,
        subcategoria_id: scoutingRecord.subcategoria_id,
        sector_id: scoutingRecord.sector_id,
        subsector_industrial: scoutingRecord.subsector_industrial,
        rejection_reason: rejectionReason,
        rejection_category: rejectionStage,
        rejected_by: rejectedBy,
        original_data: scoutingRecord,
      };
      
      const { data: rejected, error: insertError } = await (supabase as any)
        .from('rejected_technologies')
        .insert(rejectedData)
        .select()
        .single();
      
      if (insertError) {
        console.error('[useMoveExternalToRejected] Insert error:', insertError);
        throw insertError;
      }
      
      // Step 3: Mark as rejected in EXTERNAL DB
      await callExternalScoutingQueue({
        action: 'update',
        id: scoutingId,
        updates: {
          queue_status: 'rejected',
          rejection_reason: rejectionReason,
        },
      });
      
      return rejected;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-technologies'] });
      toast.success('Tecnología movida a rechazadas');
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar tecnología', { description: error.message });
    },
  });
};

// Get scouting queue counts (external + local for rejected)
export const useExternalScoutingCounts = () => {
  return useQuery({
    queryKey: ['external-scouting-counts'],
    queryFn: async () => {
      // Get counts from external DB
      const externalCounts = await callExternalScoutingQueue<{
        review: number;
        pending_approval: number;
      }>({
        action: 'count',
      });
      
      // Get rejected count from local DB
      const { count: rejectedCount } = await (supabase as any)
        .from('rejected_technologies')
        .select('id', { count: 'exact', head: true });
      
      return {
        review: externalCounts.review,
        pending_approval: externalCounts.pending_approval,
        rejected: rejectedCount ?? 0,
      };
    },
  });
};
