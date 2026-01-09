/**
 * Unified Tech Actions Component
 * 
 * Consistent action buttons bar for all technology views.
 * Actions are conditionally rendered based on TechActions configuration.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Save,
  X,
  Download,
  Database,
  Star,
  SendHorizonal,
  TrendingUp,
  BookOpen,
  ExternalLink,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import type { TechActions, UnifiedTechData } from '@/types/unifiedTech';

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
  
  // Other actions
  onEnrichmentComplete?: (data: Record<string, any>) => void;
  onDownloadWord?: () => void;
  onSendToDB?: () => void;
  onViewInDB?: () => void;
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
  onSendToDB,
  onViewInDB,
}) => {
  // Convert UnifiedTechData to format expected by AIEnrichmentButton
  const technologyLikeObject = {
    id: data.id,
    nombre: data.technology_name,
    proveedor: data.provider || '',
    pais: data.country || '',
    trl_estimado: data.trl,
    descripcion: data.description || '',
    tipo_sugerido: data.type || 'Por clasificar',
    subcategoria: data.subcategory || '',
    web: data.web || '',
    aplicacion_principal: data.applications || '',
    sector: data.sector || '',
    ventaja_competitiva: data.ventaja_competitiva || '',
    innovacion: data.innovacion || '',
    casos_referencia: data.casos_referencia || '',
    paises_actua: data.paises_actua || '',
    comentarios_analista: data.comentarios_analista || '',
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Download Word - Always visible if allowed */}
      {actions.canDownload && onDownloadWord && (
        <Button variant="outline" size="sm" onClick={onDownloadWord}>
          <Download className="w-4 h-4 mr-2" />
          Descargar Word
        </Button>
      )}
      
      {/* Edit/Save/Cancel */}
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
      
      {/* AI Enrichment */}
      {actions.canEnrich && onEnrichmentComplete && !isEditing && (
        <AIEnrichmentButton
          technology={technologyLikeObject as any}
          onEnrichmentComplete={onEnrichmentComplete}
        />
      )}
      
      {/* Send to DB */}
      {actions.canSendToDB && onSendToDB && !isEditing && (
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
      
      {/* View in DB */}
      {actions.canViewInDB && onViewInDB && (
        <Button variant="outline" size="sm" onClick={onViewInDB}>
          Ver en BD
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
};
