/**
 * Tech Workflow Actions Hook
 * 
 * Centralized mutations for all technology workflow actions.
 * Handles scouting, DB review, linking, and user actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { toast } from 'sonner';
import type { TechMetadata, UnifiedTechData, UnifiedTechEditData } from '@/types/unifiedTech';
import type { Technology } from '@/types/database';
import { formDataToExternalDbFormat, type ScoutingFormData } from '@/types/scouting';

interface WorkflowActionsProps {
  metadata: TechMetadata;
  userId?: string | null;
  userEmail?: string | null;
}

export function useTechWorkflowActions({ metadata, userId, userEmail }: WorkflowActionsProps) {
  const queryClient = useQueryClient();

  // ========================================
  // SCOUTING WORKFLOW MUTATIONS
  // ========================================

  const updateScoutingItem = useMutation({
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

  const sendToApproval = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .update({
          status: 'pending_approval',
          reviewed_by: userEmail || userId,
          reviewed_at: new Date().toISOString(),
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
      toast.success('Enviado a aprobación');
    },
    onError: (error: Error) => {
      toast.error('Error al enviar', { description: error.message });
    },
  });

  const backToReview = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .update({
          status: 'review',
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
      toast.success('Devuelto a revisión');
    },
    onError: (error: Error) => {
      toast.error('Error al devolver', { description: error.message });
    },
  });

  const approveToDatabase = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Fetch the record
      const { data: record, error: fetchError } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);
      if (!record) throw new Error('Registro no encontrado');
      
      // Insert into technologies
      const { data: newTech, error: insertError } = await externalSupabase
        .from('technologies')
        .insert({
          nombre: record.nombre,
          tipo: record.tipo_sugerido || 'Otro',
          subcategorias: record.subcategoria ? [record.subcategoria] : null,
          sector: record.sector,
          proveedor: record.proveedor,
          pais: record.pais,
          paises_actua: record.paises_actua,
          web: record.web,
          email: record.email,
          descripcion: record.descripcion,
          aplicacion: record.aplicacion_principal,
          ventaja: record.ventaja_competitiva,
          innovacion: record.innovacion,
          trl: record.trl_estimado,
          casos_referencia: record.casos_referencia,
          comentarios: record.comentarios_analista,
          subsector_industrial: record.subsector,
          status: 'active',
          review_status: 'none',
        })
        .select()
        .single();
      
      if (insertError) throw new Error(`Error al insertar: ${insertError.message}`);
      
      // Delete from scouting queue
      await externalSupabase
        .from('scouting_queue')
        .delete()
        .eq('id', id);
      
      return newTech;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-counts'] });
      toast.success('Tecnología añadida a la base de datos');
    },
    onError: (error: Error) => {
      toast.error('Error al aprobar', { description: error.message });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ 
      id, 
      reason, 
      stage 
    }: { 
      id: string; 
      reason: string; 
      stage: 'analyst' | 'supervisor' | 'admin' 
    }) => {
      // Fetch the record
      const { data: record, error: fetchError } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);
      if (!record) throw new Error('Registro no encontrado');
      
      // Insert into rejected_technologies
      const insertPayload: Record<string, unknown> = {
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
        aplicacion_principal: record.aplicacion_principal,
        ventaja_competitiva: record.ventaja_competitiva,
        innovacion: record.innovacion,
        trl_estimado: record.trl_estimado,
        casos_referencia: record.casos_referencia,
        paises_actua: record.paises_actua,
        comentarios_analista: record.comentarios_analista,
        rejection_reason: reason,
        rejection_category: stage,
        rejected_by: userEmail || userId,
      };

      const { error: insertError } = await externalSupabase
        .from('rejected_technologies')
        .insert(insertPayload);
      
      if (insertError) throw new Error(`Error al mover a rechazadas: ${insertError.message}`);
      
      // Delete from scouting queue
      await externalSupabase
        .from('scouting_queue')
        .delete()
        .eq('id', id);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['rejected-technologies'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-counts'] });
      toast.success('Tecnología rechazada');
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar', { description: error.message });
    },
  });

  // ========================================
  // DATABASE REVIEW MUTATIONS
  // ========================================

  const sendToReview = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .update({
          review_status: 'pending',
          review_requested_at: new Date().toISOString(),
          review_requested_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Enviado a revisión');
    },
    onError: (error: Error) => {
      toast.error('Error al enviar a revisión', { description: error.message });
    },
  });

  const claimReview = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .update({
          review_status: 'in_review',
          reviewer_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Revisión reclamada');
    },
    onError: (error: Error) => {
      toast.error('Error al reclamar revisión', { description: error.message });
    },
  });

  const completeReview = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .update({
          review_status: 'completed',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Revisión completada');
    },
    onError: (error: Error) => {
      toast.error('Error al completar revisión', { description: error.message });
    },
  });

  const releaseReview = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .update({
          review_status: 'pending',
          reviewer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Revisión liberada');
    },
    onError: (error: Error) => {
      toast.error('Error al liberar revisión', { description: error.message });
    },
  });

  // ========================================
  // USER ACTION MUTATIONS
  // ========================================

  const addFavorite = useMutation({
    mutationFn: async ({ technologyId }: { technologyId: string }) => {
      if (!userId) throw new Error('Usuario no autenticado');
      
      const { data, error } = await externalSupabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          technology_id: technologyId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Añadido a favoritos');
    },
    onError: (error: Error) => {
      toast.error('Error al añadir a favoritos', { description: error.message });
    },
  });

  const addToProject = useMutation({
    mutationFn: async ({ 
      technologyId, 
      projectId 
    }: { 
      technologyId: string; 
      projectId: string;
    }) => {
      // Use externalSupabase since comparison_project_technologies is in external DB
      const { data, error } = await externalSupabase
        .from('comparison_project_technologies')
        .insert({
          project_id: projectId,
          technology_id: technologyId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-projects'] });
      toast.success('Añadido al proyecto');
    },
    onError: (error: Error) => {
      toast.error('Error al añadir al proyecto', { description: error.message });
    },
  });

  // ========================================
  // LINKING MUTATIONS
  // ========================================

  const sendToScouting = useMutation({
    mutationFn: async ({ 
      data, 
      caseStudyTechId 
    }: { 
      data: UnifiedTechData; 
      caseStudyTechId: string;
    }) => {
      // Insert into external scouting_queue
      const { data: inserted, error: insertError } = await externalSupabase
        .from('scouting_queue')
        .insert({
          nombre: data.technology_name,
          proveedor: data.provider,
          pais: data.country,
          web: data.web,
          email: data.email,
          descripcion: data.description,
          tipo_sugerido: data.type,
          subcategoria: data.subcategory,
          sector: data.sector,
          aplicacion_principal: data.applications,
          ventaja_competitiva: data.ventaja_competitiva,
          innovacion: data.innovacion,
          trl_estimado: data.trl,
          casos_referencia: data.casos_referencia,
          paises_actua: data.paises_actua,
          comentarios_analista: data.comentarios_analista,
          status: 'review',
          source: 'case_study',
        })
        .select()
        .single();
      
      if (insertError) throw new Error(`Error al crear en scouting: ${insertError.message}`);
      
      // Update case_study_technologies with scouting_queue_id
      const { error: updateError } = await supabase
        .from('case_study_technologies')
        .update({ scouting_queue_id: inserted.id })
        .eq('id', caseStudyTechId);
      
      if (updateError) {
        console.error('Error updating case_study_technologies:', updateError);
      }
      
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['case-study-technologies'] });
      toast.success('Enviado a cola de scouting');
    },
    onError: (error: Error) => {
      toast.error('Error al enviar a scouting', { description: error.message });
    },
  });

  const sendLonglistToDB = useMutation({
    mutationFn: async ({ 
      data,
      longlistId 
    }: { 
      data: UnifiedTechData;
      longlistId: string;
    }) => {
      // Insert into technologies
      const { data: newTech, error: insertError } = await externalSupabase
        .from('technologies')
        .insert({
          nombre: data.technology_name,
          proveedor: data.provider,
          pais: data.country,
          paises_actua: data.paises_actua,
          web: data.web,
          email: data.email,
          descripcion: data.description,
          tipo: data.type,
          subcategorias: data.subcategory ? [data.subcategory] : null,
          sector: data.sector,
          aplicacion: data.applications,
          ventaja: data.ventaja_competitiva,
          innovacion: data.innovacion,
          trl: data.trl,
          casos_referencia: data.casos_referencia,
          comentarios: data.comentarios_analista,
          status: 'active',
          review_status: 'none',
        })
        .select()
        .single();
      
      if (insertError) throw new Error(`Error al insertar: ${insertError.message}`);
      
      // Update study_longlist with existing_technology_id
      const { error: updateError } = await supabase
        .from('study_longlist')
        .update({ existing_technology_id: newTech.id })
        .eq('id', longlistId);
      
      if (updateError) {
        console.error('Error updating study_longlist:', updateError);
      }
      
      return newTech;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['study-longlist'] });
      toast.success('Tecnología añadida a la base de datos');
    },
    onError: (error: Error) => {
      toast.error('Error al añadir a BD', { description: error.message });
    },
  });

  // ========================================
  // SAVE MUTATIONS (by source)
  // ========================================

  const saveTechnology = useMutation({
    mutationFn: async ({ 
      id, 
      editData 
    }: { 
      id: string; 
      editData: UnifiedTechEditData;
    }) => {
      const { data, error } = await externalSupabase
        .from('technologies')
        .update({
          nombre: editData.technology_name,
          proveedor: editData.provider,
          pais: editData.country,
          paises_actua: editData.paises_actua,
          web: editData.web,
          email: editData.email,
          descripcion: editData.description,
          tipo: editData.type,
          sector: editData.sector,
          aplicacion: editData.applications,
          ventaja: editData.ventaja_competitiva,
          innovacion: editData.innovacion,
          trl: editData.trl,
          casos_referencia: editData.casos_referencia,
          comentarios: editData.comentarios_analista,
          estado_seguimiento: editData.estado_seguimiento,
          tipo_id: editData.tipo_id,
          subcategoria_id: editData.subcategoria_id,
          sector_id: editData.sector_id,
          subsector_industrial: editData.subsector_industrial,
          status: editData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast.success('Cambios guardados');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar', { description: error.message });
    },
  });

  const saveLonglistItem = useMutation({
    mutationFn: async ({ 
      id, 
      editData 
    }: { 
      id: string; 
      editData: UnifiedTechEditData;
    }) => {
      const { data, error } = await supabase
        .from('study_longlist')
        .update({
          technology_name: editData.technology_name,
          provider: editData.provider,
          country: editData.country,
          web: editData.web,
          brief_description: editData.description,
          type_suggested: editData.type,
          subcategory_suggested: editData.subcategory,
          trl: editData.trl,
          inclusion_reason: editData.comentarios_analista,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-longlist'] });
      toast.success('Cambios guardados');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar', { description: error.message });
    },
  });

  return {
    // Scouting workflow
    updateScoutingItem,
    sendToApproval,
    backToReview,
    approveToDatabase,
    reject,
    
    // DB Review workflow
    sendToReview,
    claimReview,
    completeReview,
    releaseReview,
    
    // User actions
    addFavorite,
    addToProject,
    
    // Linking
    sendToScouting,
    sendLonglistToDB,
    
    // Save
    saveTechnology,
    saveLonglistItem,
    
    // Loading states
    isAnyLoading: 
      updateScoutingItem.isPending ||
      sendToApproval.isPending ||
      backToReview.isPending ||
      approveToDatabase.isPending ||
      reject.isPending ||
      sendToReview.isPending ||
      claimReview.isPending ||
      completeReview.isPending ||
      releaseReview.isPending ||
      addFavorite.isPending ||
      addToProject.isPending ||
      sendToScouting.isPending ||
      sendLonglistToDB.isPending ||
      saveTechnology.isPending ||
      saveLonglistItem.isPending,
  };
}
