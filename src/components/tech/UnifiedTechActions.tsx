/**
 * Unified Tech Actions Component
 * 
 * Consistent action buttons bar for all technology views.
 * Actions are conditionally rendered based on TechActions configuration.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Edit,
  Save,
  X,
  Download,
  Database,
  Star,
  SendHorizonal,
  ExternalLink,
  Loader2,
  FolderPlus,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ClipboardCheck,
  Unlock,
  ChevronDown,
} from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import type { TechActions, UnifiedTechData } from '@/types/unifiedTech';

interface Project {
  id: string;
  name: string;
}

interface UnifiedTechActionsProps {
  data: UnifiedTechData;
  actions: TechActions;
  isEditing: boolean;
  isSaving?: boolean;
  isSendingToDB?: boolean;
  
  // Edit actions
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSave?: () => void;
  
  // AI & Export
  onEnrichmentComplete?: (data: Record<string, any>) => void;
  onDownloadWord?: () => void;
  
  // Scouting workflow
  onSendToApproval?: () => void;
  onApproveToDatabase?: () => void;
  onReject?: (reason: string) => void;
  onBackToReview?: () => void;
  
  // DB Review workflow
  onSendToReview?: () => void;
  onClaimReview?: () => void;
  onCompleteReview?: () => void;
  onReleaseReview?: () => void;
  
  // Linking
  onSendToDB?: () => void;
  onViewInDB?: () => void;
  onSendToScouting?: () => void;
  
  // User actions
  onAddFavorite?: () => void;
  onAddToProject?: (projectId: string) => void;
  projects?: Project[];
  
  // Loading states
  isSendingToApproval?: boolean;
  isApproving?: boolean;
  isRejecting?: boolean;
  isSendingToScouting?: boolean;
  isFavoriting?: boolean;
  isAddingToProject?: boolean;
}

export const UnifiedTechActions: React.FC<UnifiedTechActionsProps> = ({
  data,
  actions,
  isEditing,
  isSaving = false,
  isSendingToDB = false,
  onStartEdit,
  onCancelEdit,
  onSave,
  onEnrichmentComplete,
  onDownloadWord,
  onSendToApproval,
  onApproveToDatabase,
  onReject,
  onBackToReview,
  onSendToReview,
  onClaimReview,
  onCompleteReview,
  onReleaseReview,
  onSendToDB,
  onViewInDB,
  onSendToScouting,
  onAddFavorite,
  onAddToProject,
  projects = [],
  isSendingToApproval = false,
  isApproving = false,
  isRejecting = false,
  isSendingToScouting = false,
  isFavoriting = false,
  isAddingToProject = false,
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Convert UnifiedTechData to format expected by AIEnrichmentButton
  const technologyLikeObject = {
    id: data.id,
    nombre: data.nombre,
    proveedor: data.proveedor || '',
    pais: data.pais || '',
    trl_estimado: data.trl,
    descripcion: data.descripcion || '',
    tipo_sugerido: data.tipo || 'Por clasificar',
    subcategoria: data.subcategoria || '',
    web: data.web || '',
    aplicacion_principal: data.aplicacion || '',
    sector: data.sector || '',
    ventaja_competitiva: data.ventaja || '',
    innovacion: data.innovacion || '',
    casos_referencia: data.casos_referencia || '',
    paises_actua: data.paises_actua || '',
    comentarios_analista: data.comentarios || '',
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim() && onReject) {
      onReject(rejectionReason.trim());
      setShowRejectDialog(false);
      setRejectionReason('');
    }
  };

  // Check if any workflow actions are available
  const hasScoutingActions = actions.canSendToApproval || actions.canApproveToDatabase || 
                             actions.canReject || actions.canBackToReview;
  const hasReviewActions = actions.canSendToReview || actions.canClaimReview || 
                           actions.canCompleteReview || actions.canReleaseReview;
  const hasLinkingActions = actions.canSendToDB || actions.canViewInDB || actions.canSendToScouting;
  const hasUserActions = actions.canFavorite || actions.canAddToProject;

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        {/* === EDIT/SAVE/CANCEL === */}
        {actions.canEdit && (
          <>
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onStartEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </>
        )}

        {/* === AI ENRICHMENT - Solo en modo lectura para source != database === */}
        {/* Para database, AI está en el formulario de edición */}
        {actions.canEnrich && onEnrichmentComplete && !isEditing && false && (
          <AIEnrichmentButton
            technology={technologyLikeObject as any}
            onEnrichmentComplete={onEnrichmentComplete}
          />
        )}

        {/* === DOWNLOAD WORD === */}
        {actions.canDownload && onDownloadWord && !isEditing && (
          <Button variant="outline" size="sm" onClick={onDownloadWord}>
            <Download className="w-4 h-4 mr-2" />
            Word
          </Button>
        )}

        {/* === SCOUTING WORKFLOW === */}
        {hasScoutingActions && !isEditing && (
          <>
            {actions.canSendToApproval && onSendToApproval && (
              <Button 
                size="sm" 
                onClick={onSendToApproval}
                disabled={isSendingToApproval}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSendingToApproval ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4 mr-2" />
                )}
                Enviar a aprobación
              </Button>
            )}
            
            {actions.canApproveToDatabase && onApproveToDatabase && (
              <Button 
                size="sm" 
                onClick={onApproveToDatabase}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Aprobar a BD
              </Button>
            )}
            
            {actions.canBackToReview && onBackToReview && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBackToReview}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a revisión
              </Button>
            )}
            
            {actions.canReject && onReject && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowRejectDialog(true)}
                disabled={isRejecting}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                {isRejecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Rechazar
              </Button>
            )}
          </>
        )}

        {/* === DB REVIEW WORKFLOW === */}
        {hasReviewActions && !isEditing && (
          <>
            {actions.canSendToReview && onSendToReview && (
              <Button variant="outline" size="sm" onClick={onSendToReview}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Enviar a revisión
              </Button>
            )}
            
            {actions.canClaimReview && onClaimReview && (
              <Button size="sm" onClick={onClaimReview}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Reclamar revisión
              </Button>
            )}
            
            {actions.canCompleteReview && onCompleteReview && (
              <Button 
                size="sm" 
                onClick={onCompleteReview}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Completar revisión
              </Button>
            )}
            
            {actions.canReleaseReview && onReleaseReview && (
              <Button variant="outline" size="sm" onClick={onReleaseReview}>
                <Unlock className="w-4 h-4 mr-2" />
                Liberar revisión
              </Button>
            )}
          </>
        )}

        {/* === LINKING ACTIONS === */}
        {hasLinkingActions && !isEditing && (
          <>
            {actions.canSendToDB && onSendToDB && (
              <Button 
                size="sm" 
                onClick={onSendToDB} 
                disabled={isSendingToDB}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSendingToDB ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                Añadir a BD
              </Button>
            )}
            
            {actions.canSendToScouting && onSendToScouting && (
              <Button 
                size="sm" 
                onClick={onSendToScouting}
                disabled={isSendingToScouting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSendingToScouting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4 mr-2" />
                )}
                Enviar a Scouting
              </Button>
            )}
            
            {actions.canViewInDB && onViewInDB && (
              <Button variant="outline" size="sm" onClick={onViewInDB}>
                Ver en BD
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </>
        )}

        {/* === USER ACTIONS === */}
        {hasUserActions && !isEditing && (
          <>
            {actions.canFavorite && onAddFavorite && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAddFavorite}
                disabled={isFavoriting}
              >
                {isFavoriting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                Favorito
              </Button>
            )}
            
            {actions.canAddToProject && onAddToProject && projects.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isAddingToProject}
                  >
                    {isAddingToProject ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FolderPlus className="w-4 h-4 mr-2" />
                    )}
                    Añadir a proyecto
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {projects.map((project) => (
                    <DropdownMenuItem 
                      key={project.id}
                      onClick={() => onAddToProject(project.id)}
                    >
                      {project.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, indica el motivo del rechazo. Esta información ayudará a mejorar 
              el proceso de scouting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
