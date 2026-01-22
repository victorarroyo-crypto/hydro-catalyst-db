/**
 * Technology Unified Modal
 * 
 * Single modal component for displaying and editing technology details
 * from any source: main database, scouting queue, study longlist,
 * case study technologies, or AI extracted technologies.
 * 
 * This component:
 * 1. Detects the input type and maps to unified format
 * 2. Calculates permissions based on user role and workflow status
 * 3. Manages editing state
 * 4. Handles all workflow actions via centralized hook
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UnifiedTechDetailContent } from '@/components/tech/UnifiedTechDetailContent';
import { useAuth } from '@/contexts/AuthContext';
import { useTechWorkflowActions } from '@/hooks/useTechWorkflowActions';
import { calculateTechActions } from '@/lib/techActionPermissions';
import {
  mapFromTechnologies,
  mapFromLonglist,
  mapFromScouting,
  createDatabaseMetadata,
  createLonglistMetadata,
  createScoutingMetadata,
  toEditData,
} from '@/lib/mapToUnifiedTech';
import type {
  UnifiedTechData,
  TechMetadata,
  TechActions,
  UnifiedTechEditData,
} from '@/types/unifiedTech';
import type { Technology } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';
import type { SelectedTipo, SelectedSubcategoria } from '@/components/taxonomy';
import { generateTechnologyWordDocument } from '@/lib/generateWordDocument';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type LonglistItem = Tables<'study_longlist'>;
type ScoutingQueueItem = Tables<'scouting_queue'>;

// Normalized scouting item from UI (from useScoutingData hooks)
interface ScoutingItemUI {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
  queue_status?: string;
  created_at?: string;
  description?: string;
  web?: string;
  email?: string;
  suggestedType?: string;
  suggestedSubcategory?: string;
  sector?: string;
  subsector?: string;
  aplicacionPrincipal?: string;
  competitiveAdvantage?: string;
  innovacion?: string;
  casosReferencia?: string;
  paisesActua?: string;
  comentariosAnalista?: string;
  relevanceReason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  scouting_job_id?: string;
}

// For case study technologies from external DB
interface CaseStudyTechnology {
  id: string;
  case_study_id: string;
  technology_name: string;
  technology_id?: string | null;
  scouting_queue_id?: string | null;
  provider?: string | null;
  role: string;
  selection_rationale?: string | null;
  application_data?: Record<string, any> | null;
  economic_analysis?: Record<string, any> | null;
  created_at?: string;
}

export interface TechnologyUnifiedModalProps {
  // Flexible input - only one should be provided
  technology?: Technology | null;
  scoutingItem?: ScoutingQueueItem | ScoutingItemUI | null;
  longlistItem?: LonglistItem | null;
  caseStudyTech?: CaseStudyTechnology | null;
  
  // For longlist/case study, pass linked technology if available
  linkedTechnology?: Technology | null;
  
  // Modal control
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Context (for metadata)
  studyId?: string;
  studyName?: string;
  caseStudyId?: string;
  caseStudyName?: string;
  
  // Behavior options
  startInEditMode?: boolean;
  
  // Callbacks
  onSuccess?: () => void;
  onStatusChange?: () => void;
}

export const TechnologyUnifiedModal: React.FC<TechnologyUnifiedModalProps> = ({
  technology,
  scoutingItem,
  longlistItem,
  caseStudyTech,
  linkedTechnology,
  open,
  onOpenChange,
  studyId,
  studyName,
  caseStudyId,
  caseStudyName,
  startInEditMode = false,
  onSuccess,
  onStatusChange,
}) => {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UnifiedTechEditData | null>(null);
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);
  
  // Rejection dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Detect input type and map to unified format
  const { unifiedData, metadata, sourceId, sourceType } = useMemo(() => {
    if (technology) {
      const techData = mapFromTechnologies(technology);
      const techMeta: TechMetadata = {
        ...createDatabaseMetadata(),
        reviewStatus: technology.review_status as TechMetadata['reviewStatus'],
        reviewerId: (technology as any).reviewer_id,
        isCurrentReviewer: (technology as any).reviewer_id === user?.id,
      };
      return {
        unifiedData: techData,
        metadata: techMeta,
        sourceId: technology.id,
        sourceType: 'database' as const,
      };
    }
    
    if (scoutingItem) {
      // Check if it's a UI item (normalized) or DB item (Supabase type)
      const isUIItem = 'name' in scoutingItem && !('Nombre de la tecnología' in scoutingItem);
      
      let scoutData: UnifiedTechData;
      let queueStatus: string | undefined;
      
      if (isUIItem) {
        // Map from ScoutingItemUI
        const uiItem = scoutingItem as ScoutingItemUI;
        scoutData = {
          id: uiItem.id,
          technology_name: uiItem.name,
          provider: uiItem.provider || null,
          country: uiItem.country || null,
          paises_actua: uiItem.paisesActua || null,
          web: uiItem.web || null,
          email: uiItem.email || null,
          trl: uiItem.trl || null,
          estado_seguimiento: null,
          fecha_scouting: uiItem.created_at || null,
          type: uiItem.suggestedType || null,
          subcategory: uiItem.suggestedSubcategory || null,
          sector: uiItem.sector || null,
          applications: uiItem.aplicacionPrincipal || null,
          description: uiItem.description || null,
          ventaja_competitiva: uiItem.competitiveAdvantage || null,
          innovacion: uiItem.innovacion || null,
          casos_referencia: uiItem.casosReferencia || null,
          comentarios_analista: uiItem.comentariosAnalista || null,
          status: uiItem.status || null,
          quality_score: uiItem.score || null,
          review_status: null,
          created_at: uiItem.created_at || null,
          updated_at: null,
        };
        queueStatus = uiItem.queue_status || uiItem.status;
      } else {
        // Map from ScoutingQueueItem (Supabase type)
        scoutData = mapFromScouting(scoutingItem as ScoutingQueueItem);
        queueStatus = (scoutingItem as ScoutingQueueItem).queue_status || undefined;
      }
      
      const scoutMeta: TechMetadata = {
        source: 'scouting',
        phase: queueStatus === 'pending_approval' ? 'Pendiente Aprobación' : 'En Revisión',
        queueStatus: queueStatus as TechMetadata['queueStatus'],
        scoutingQueueId: scoutingItem.id,
      };
      
      return {
        unifiedData: scoutData,
        metadata: scoutMeta,
        sourceId: scoutingItem.id,
        sourceType: 'scouting' as const,
      };
    }
    
    if (longlistItem) {
      const isLinked = !!longlistItem.existing_technology_id || !!linkedTechnology;
      const longData = mapFromLonglist(longlistItem, linkedTechnology);
      const longMeta = createLonglistMetadata(
        studyId || longlistItem.study_id,
        studyName || 'Estudio',
        longlistItem,
        isLinked
      );
      return {
        unifiedData: longData,
        metadata: longMeta,
        sourceId: longlistItem.id,
        sourceType: 'longlist' as const,
      };
    }
    
    if (caseStudyTech) {
      const appData = caseStudyTech.application_data || {};
      const csData: UnifiedTechData = {
        id: caseStudyTech.id,
        technology_name: caseStudyTech.technology_name,
        provider: caseStudyTech.provider || appData.proveedor || null,
        country: appData.pais || null,
        paises_actua: appData.paises_actua || null,
        web: appData.web || null,
        email: appData.email || null,
        trl: appData.trl || null,
        estado_seguimiento: null,
        fecha_scouting: null,
        type: appData.tipo || null,
        subcategory: appData.subcategoria || null,
        sector: appData.sector || null,
        applications: appData.aplicacion || null,
        description: appData.descripcion || appData.description || null,
        ventaja_competitiva: appData.ventaja || appData.ventaja_competitiva || null,
        innovacion: appData.innovacion || null,
        casos_referencia: appData.casos_referencia || null,
        comentarios_analista: null,
        // Technical specs from case studies
        capacity: appData.capacity || null,
        removal_efficiency: appData.removal_efficiency || null,
        footprint: appData.footprint || null,
        power_consumption: appData.power_consumption || null,
        price_range: appData.price_range || null,
        business_model: appData.business_model || null,
        lead_time: appData.lead_time || null,
        status: null,
        quality_score: null,
        review_status: null,
        created_at: caseStudyTech.created_at || null,
        updated_at: null,
      };
      
      const csMeta: TechMetadata = {
        source: 'case_study',
        caseStudyId: caseStudyTech.case_study_id,
        caseStudyName,
        isLinkedToDB: !!caseStudyTech.technology_id,
        linkedTechId: caseStudyTech.technology_id || undefined,
        isInScoutingQueue: !!caseStudyTech.scouting_queue_id,
        scoutingQueueId: caseStudyTech.scouting_queue_id || undefined,
        role: caseStudyTech.role as TechMetadata['role'],
        selectionRationale: caseStudyTech.selection_rationale || undefined,
      };
      
      return {
        unifiedData: csData,
        metadata: csMeta,
        sourceId: caseStudyTech.id,
        sourceType: 'case_study' as const,
      };
    }
    
    // Fallback - should never happen
    return {
      unifiedData: null as unknown as UnifiedTechData,
      metadata: { source: 'database' } as TechMetadata,
      sourceId: '',
      sourceType: 'database' as const,
    };
  }, [technology, scoutingItem, longlistItem, caseStudyTech, linkedTechnology, user?.id, studyId, studyName, caseStudyName]);

  // 2. Calculate permissions
  const actions = useMemo<TechActions>(() => {
    if (!unifiedData) {
      return calculateTechActions({
        metadata: { source: 'database' },
        userRole: profile?.role || null,
        userId: user?.id || null,
      });
    }
    
    return calculateTechActions({
      metadata,
      userRole: profile?.role || null,
      userId: user?.id || null,
    });
  }, [metadata, profile?.role, user?.id, unifiedData]);

  // 3. Initialize workflow actions hook
  const workflowActions = useTechWorkflowActions({
    metadata,
    userId: user?.id,
    userEmail: user?.email,
  });

  // Reset editing state when modal closes or item changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditData(null);
      setSelectedTipos([]);
      setSelectedSubcategorias([]);
      setRejectionReason('');
    } else if (startInEditMode && !technology && !scoutingItem && !longlistItem && !caseStudyTech) {
      // Start in edit mode for new technology creation
      setIsEditing(true);
      setEditData({
        technology_name: '',
        provider: '',
        country: '',
        paises_actua: '',
        web: '',
        email: '',
        trl: null,
        estado_seguimiento: '',
        type: '',
        subcategory: '',
        sector: '',
        applications: '',
        description: '',
        ventaja_competitiva: '',
        innovacion: '',
        casos_referencia: '',
        comentarios_analista: '',
        status: 'active',
        tipo_id: null,
        subcategoria_id: null,
        sector_id: null,
        subsector_industrial: '',
      });
    }
  }, [open, startInEditMode, technology, scoutingItem, longlistItem, caseStudyTech]);

  useEffect(() => {
    if (unifiedData && isEditing) {
      setEditData(toEditData(unifiedData));
    }
  }, [unifiedData, isEditing]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleStartEdit = useCallback(() => {
    if (!unifiedData) return;
    setEditData(toEditData(unifiedData));
    setIsEditing(true);
  }, [unifiedData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditData(null);
    setSelectedTipos([]);
    setSelectedSubcategorias([]);
  }, []);

  const handleEditChange = useCallback((field: keyof UnifiedTechEditData, value: string | number | null) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editData || !sourceId) return;
    
    try {
      // Build taxonomy arrays from checkbox selections
      // We need to map tipo_id to codigo from the taxonomy data
      const tipoIds = selectedTipos.map(t => t.tipo_id);
      const subcatIds = selectedSubcategorias.map(s => s.subcategoria_id);
      
      const enrichedEditData: UnifiedTechEditData = {
        ...editData,
        tipo_id: tipoIds[0] || editData.tipo_id,
        subcategoria_id: subcatIds[0] || editData.subcategoria_id,
      };

      switch (sourceType) {
        case 'database':
          await workflowActions.saveTechnology.mutateAsync({
            id: sourceId,
            editData: enrichedEditData,
          });
          break;
        case 'longlist':
          await workflowActions.saveLonglistItem.mutateAsync({
            id: sourceId,
            editData: enrichedEditData,
          });
          break;
        case 'scouting':
          // Convert to scouting format
          await workflowActions.updateScoutingItem.mutateAsync({
            id: sourceId,
            updates: {
              nombre: enrichedEditData.technology_name,
              proveedor: enrichedEditData.provider,
              pais: enrichedEditData.country,
              web: enrichedEditData.web,
              email: enrichedEditData.email,
              descripcion: enrichedEditData.description,
              tipo_sugerido: enrichedEditData.type,
              subcategoria: enrichedEditData.subcategory,
              sector: enrichedEditData.sector,
              aplicacion_principal: enrichedEditData.applications,
              ventaja_competitiva: enrichedEditData.ventaja_competitiva,
              innovacion: enrichedEditData.innovacion,
              trl_estimado: enrichedEditData.trl,
              casos_referencia: enrichedEditData.casos_referencia,
              comentarios_analista: enrichedEditData.comentarios_analista,
              paises_actua: enrichedEditData.paises_actua,
            },
          });
          break;
        default:
          toast.error('Tipo de fuente no soportado para guardar');
          return;
      }
      
      setIsEditing(false);
      setEditData(null);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving:', error);
    }
  }, [editData, sourceId, sourceType, selectedTipos, selectedSubcategorias, workflowActions, onSuccess]);

  const handleEnrichmentComplete = useCallback((enrichedData: Record<string, any>) => {
    if (!editData) return;
    
    setEditData(prev => prev ? {
      ...prev,
      description: enrichedData.descripcion || prev.description,
      ventaja_competitiva: enrichedData.ventaja || prev.ventaja_competitiva,
      innovacion: enrichedData.innovacion || prev.innovacion,
      applications: enrichedData.aplicacion || prev.applications,
    } : null);
    
    toast.success('Datos enriquecidos aplicados');
  }, [editData]);

  const handleDownloadWord = useCallback(async () => {
    if (!unifiedData) return;
    
    try {
      // Convert to Technology format for generateTechnologyWordDocument
      const techData: Partial<Technology> = {
        id: unifiedData.id,
        nombre: unifiedData.technology_name,
        proveedor: unifiedData.provider,
        pais: unifiedData.country,
        paises_actua: unifiedData.paises_actua,
        web: unifiedData.web,
        email: unifiedData.email,
        descripcion: unifiedData.description,
        tipo: unifiedData.type,
        sector: unifiedData.sector,
        aplicacion: unifiedData.applications,
        ventaja: unifiedData.ventaja_competitiva,
        innovacion: unifiedData.innovacion,
        trl: unifiedData.trl,
        casos_referencia: unifiedData.casos_referencia,
        comentarios: unifiedData.comentarios_analista,
      };
      
      await generateTechnologyWordDocument(techData as Technology);
      toast.success('Documento generado');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    }
  }, [unifiedData]);

  // Scouting workflow handlers
  const handleSendToApproval = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.sendToApproval.mutateAsync({ id: sourceId });
    onStatusChange?.();
    onOpenChange(false);
  }, [sourceId, workflowActions.sendToApproval, onStatusChange, onOpenChange]);

  const handleApproveToDatabase = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.approveToDatabase.mutateAsync({ id: sourceId });
    onStatusChange?.();
    onOpenChange(false);
  }, [sourceId, workflowActions.approveToDatabase, onStatusChange, onOpenChange]);

  const handleBackToReview = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.backToReview.mutateAsync({ id: sourceId });
    onStatusChange?.();
  }, [sourceId, workflowActions.backToReview, onStatusChange]);

  const handleRejectConfirm = useCallback(async () => {
    if (!sourceId || !rejectionReason.trim()) {
      toast.error('Debes indicar una razón');
      return;
    }
    
    const stage = profile?.role === 'admin' || profile?.role === 'supervisor' 
      ? 'supervisor' 
      : 'analyst';
    
    await workflowActions.reject.mutateAsync({
      id: sourceId,
      reason: rejectionReason.trim(),
      stage,
    });
    
    setShowRejectDialog(false);
    setRejectionReason('');
    onStatusChange?.();
    onOpenChange(false);
  }, [sourceId, rejectionReason, profile?.role, workflowActions.reject, onStatusChange, onOpenChange]);

  // DB Review workflow handlers
  const handleSendToReview = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.sendToReview.mutateAsync({ id: sourceId });
    onStatusChange?.();
  }, [sourceId, workflowActions.sendToReview, onStatusChange]);

  const handleClaimReview = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.claimReview.mutateAsync({ id: sourceId });
    onStatusChange?.();
  }, [sourceId, workflowActions.claimReview, onStatusChange]);

  const handleCompleteReview = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.completeReview.mutateAsync({ id: sourceId });
    onStatusChange?.();
  }, [sourceId, workflowActions.completeReview, onStatusChange]);

  const handleReleaseReview = useCallback(async () => {
    if (!sourceId) return;
    await workflowActions.releaseReview.mutateAsync({ id: sourceId });
    onStatusChange?.();
  }, [sourceId, workflowActions.releaseReview, onStatusChange]);

  // Linking handlers
  const handleSendToDB = useCallback(async () => {
    if (!unifiedData || !sourceId) return;
    await workflowActions.sendLonglistToDB.mutateAsync({
      data: unifiedData,
      longlistId: sourceId,
    });
    onStatusChange?.();
  }, [unifiedData, sourceId, workflowActions.sendLonglistToDB, onStatusChange]);

  const handleSendToScouting = useCallback(async () => {
    if (!unifiedData || !sourceId) return;
    await workflowActions.sendToScouting.mutateAsync({
      data: unifiedData,
      caseStudyTechId: sourceId,
    });
    onStatusChange?.();
  }, [unifiedData, sourceId, workflowActions.sendToScouting, onStatusChange]);

  const handleViewInDB = useCallback(() => {
    // Could navigate to the technology in main DB
    // For now, just log
    console.log('View in DB:', metadata.linkedTechId);
    toast.info('Ver en base de datos - función en desarrollo');
  }, [metadata.linkedTechId]);

  // User action handlers
  const handleAddFavorite = useCallback(async () => {
    if (!sourceId) return;
    const techId = metadata.linkedTechId || (sourceType === 'database' ? sourceId : null);
    if (!techId) {
      toast.error('Solo se pueden añadir a favoritos tecnologías de la base de datos');
      return;
    }
    await workflowActions.addFavorite.mutateAsync({ technologyId: techId });
  }, [sourceId, sourceType, metadata.linkedTechId, workflowActions.addFavorite]);

  const handleAddToProject = useCallback(async (projectId: string) => {
    if (!sourceId) return;
    const techId = metadata.linkedTechId || (sourceType === 'database' ? sourceId : null);
    if (!techId) {
      toast.error('Solo se pueden añadir a proyectos tecnologías de la base de datos');
      return;
    }
    await workflowActions.addToProject.mutateAsync({
      technologyId: techId,
      projectId,
    });
  }, [sourceId, sourceType, metadata.linkedTechId, workflowActions.addToProject]);

  if (!unifiedData) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {unifiedData.technology_name || 'Detalle de Tecnología'}
            </DialogTitle>
          </DialogHeader>
          
          <UnifiedTechDetailContent
            data={unifiedData}
            metadata={metadata}
            actions={actions}
            isEditing={isEditing}
            editData={editData || undefined}
            isSaving={workflowActions.isAnyLoading}
            isSendingToDB={workflowActions.sendLonglistToDB.isPending}
            selectedTipos={selectedTipos}
            selectedSubcategorias={selectedSubcategorias}
            onTiposChange={setSelectedTipos}
            onSubcategoriasChange={setSelectedSubcategorias}
            onEditChange={handleEditChange}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
            onEnrichmentComplete={handleEnrichmentComplete}
            onDownloadWord={handleDownloadWord}
            onSendToDB={handleSendToDB}
            onViewInDB={handleViewInDB}
            // Workflow actions passed to UnifiedTechActions
            onSendToApproval={handleSendToApproval}
            onApproveToDatabase={handleApproveToDatabase}
            onReject={() => setShowRejectDialog(true)}
            onBackToReview={handleBackToReview}
            onSendToScouting={handleSendToScouting}
            onSendToReview={handleSendToReview}
            onClaimReview={handleClaimReview}
            onCompleteReview={handleCompleteReview}
            onReleaseReview={handleReleaseReview}
            onAddFavorite={handleAddFavorite}
            onAddToProject={handleAddToProject}
          />
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá la tecnología a la lista de rechazadas.
              Por favor, indica el motivo del rechazo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Indica por qué se rechaza esta tecnología..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectionReason.trim()}
            >
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TechnologyUnifiedModal;
