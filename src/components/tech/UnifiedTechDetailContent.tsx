/**
 * Unified Tech Detail Content Component
 * 
 * The SINGLE source of truth for displaying technology details.
 * This component is used by ALL technology modals to ensure consistent
 * field display regardless of data source.
 * 
 * IMPORTANT: ALL fields are ALWAYS displayed, showing "Sin información"
 * when empty. This ensures identical visual format across all views.
 */

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  Globe,
  Mail,
  Tag,
  FileText,
  Lightbulb,
  Trophy,
  Users,
  MessageSquare,
  Calendar,
  Database,
  Clock,
} from 'lucide-react';
import { UnifiedInfoRow } from './UnifiedInfoRow';
import { UnifiedTechHeader } from './UnifiedTechHeader';
import { UnifiedTechActions } from './UnifiedTechActions';
import { getSourceLabel } from '@/lib/mapToUnifiedTech';
import {
  CountrySelector,
  TRLSelector,
  StatusSelector,
  TaxonomySectorSelector,
  TaxonomyTypeSelector,
  TaxonomySubcategorySelector,
  type SelectedTipo,
  type SelectedSubcategoria,
} from '@/components/taxonomy';
import type { 
  UnifiedTechData, 
  TechMetadata, 
  TechActions as TechActionsType, 
  UnifiedTechEditData 
} from '@/types/unifiedTech';

interface UnifiedTechDetailContentProps {
  data: UnifiedTechData;
  metadata: TechMetadata;
  actions: TechActionsType;
  isEditing?: boolean;
  editData?: UnifiedTechEditData;
  isLoading?: boolean;
  isSaving?: boolean;
  isSendingToDB?: boolean;
  
  // Taxonomy state for checkboxes
  selectedTipos?: SelectedTipo[];
  selectedSubcategorias?: SelectedSubcategoria[];
  onTiposChange?: (tipos: SelectedTipo[]) => void;
  onSubcategoriasChange?: (subcategorias: SelectedSubcategoria[]) => void;
  
  // Edit handlers
  onEditChange?: (field: keyof UnifiedTechEditData, value: string | number | null) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSave?: () => void;
  
  // AI & Export handlers
  onEnrichmentComplete?: (data: Record<string, any>) => void;
  onDownloadWord?: () => void;
  
  // Linking handlers
  onSendToDB?: () => void;
  onViewInDB?: () => void;
  
  // Scouting workflow handlers
  onSendToApproval?: () => void;
  onApproveToDatabase?: () => void;
  onReject?: () => void;
  onBackToReview?: () => void;
  
  // DB Review workflow handlers
  onSendToReview?: () => void;
  onClaimReview?: () => void;
  onCompleteReview?: () => void;
  onReleaseReview?: () => void;
  
  // Linking handlers
  onSendToScouting?: () => void;
  
  // User action handlers
  onAddFavorite?: () => void;
  onAddToProject?: (projectId: string) => void;
  projects?: Array<{ id: string; name: string }>;
}

export const UnifiedTechDetailContent: React.FC<UnifiedTechDetailContentProps> = ({
  data,
  metadata,
  actions,
  isEditing = false,
  editData,
  isLoading = false,
  isSaving = false,
  isSendingToDB = false,
  selectedTipos = [],
  selectedSubcategorias = [],
  onTiposChange,
  onSubcategoriasChange,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onEnrichmentComplete,
  onDownloadWord,
  onSendToDB,
  onViewInDB,
  // Scouting workflow
  onSendToApproval,
  onApproveToDatabase,
  onReject,
  onBackToReview,
  // DB Review workflow
  onSendToReview,
  onClaimReview,
  onCompleteReview,
  onReleaseReview,
  // Linking
  onSendToScouting,
  // User actions
  onAddFavorite,
  onAddToProject,
  projects = [],
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get tipo IDs for filtering subcategories
  const selectedTipoIds = selectedTipos.map(t => t.tipo_id);

  return (
    <div className="space-y-6">
      {/* Header with title and badges */}
      <UnifiedTechHeader data={data} metadata={metadata} />
      
      {/* Action Buttons */}
      <UnifiedTechActions
        data={data}
        actions={actions}
        isEditing={isEditing}
        isSaving={isSaving}
        isSendingToDB={isSendingToDB}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSave}
        onEnrichmentComplete={onEnrichmentComplete}
        onDownloadWord={onDownloadWord}
        onSendToDB={onSendToDB}
        onViewInDB={onViewInDB}
        // Scouting workflow
        onSendToApproval={onSendToApproval}
        onApproveToDatabase={onApproveToDatabase}
        onReject={onReject ? () => onReject() : undefined}
        onBackToReview={onBackToReview}
        // DB Review workflow
        onSendToReview={onSendToReview}
        onClaimReview={onClaimReview}
        onCompleteReview={onCompleteReview}
        onReleaseReview={onReleaseReview}
        // Linking
        onSendToScouting={onSendToScouting}
        // User actions
        onAddFavorite={onAddFavorite}
        onAddToProject={onAddToProject}
        projects={projects}
      />
      
      {/* Read-only notice when linked to DB */}
      {metadata.isLinkedToDB && !actions.canEdit && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Esta ficha está vinculada a la base de datos. Los datos se muestran en solo lectura.
          </span>
          {actions.canViewInDB && onViewInDB && (
            <Button 
              variant="link" 
              size="sm" 
              className="ml-auto p-0 h-auto"
              onClick={onViewInDB}
            >
              Ver en BD
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      )}

      {isEditing && editData && onEditChange ? (
        /* ==================== EDIT MODE ==================== */
        <div className="space-y-6 py-4">
          {/* Información General */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              INFORMACIÓN GENERAL
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la tecnología</Label>
                <Input
                  value={editData.technology_name}
                  onChange={(e) => onEditChange('technology_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor / Empresa</Label>
                <Input
                  value={editData.provider}
                  onChange={(e) => onEditChange('provider', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>País de origen</Label>
                <CountrySelector
                  value={editData.country}
                  onChange={(value) => onEditChange('country', value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Países donde actúa</Label>
                <Input
                  value={editData.paises_actua}
                  onChange={(e) => onEditChange('paises_actua', e.target.value)}
                  placeholder="Ej: España, Francia, Alemania"
                />
              </div>
              <div className="space-y-2">
                <Label>Web de la empresa</Label>
                <Input
                  value={editData.web}
                  onChange={(e) => onEditChange('web', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email de contacto</Label>
                <Input
                  value={editData.email}
                  onChange={(e) => onEditChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Grado de madurez (TRL)</Label>
                <TRLSelector
                  value={editData.trl}
                  onChange={(value) => onEditChange('trl', value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado del seguimiento</Label>
                <StatusSelector
                  type="estado_seguimiento"
                  value={editData.estado_seguimiento}
                  onChange={(value) => onEditChange('estado_seguimiento', value)}
                />
              </div>
            </div>
          </div>

          {/* Clasificación */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              CLASIFICACIÓN
            </h3>
            
            {/* Tipo de tecnología - Checkboxes */}
            <div className="space-y-2">
              <Label>Tipo de tecnología</Label>
              {onTiposChange ? (
                <TaxonomyTypeSelector
                  selectedTipos={selectedTipos}
                  onChange={onTiposChange}
                />
              ) : (
                <Input
                  value={editData.type}
                  onChange={(e) => onEditChange('type', e.target.value)}
                  placeholder="Tipo de tecnología"
                />
              )}
            </div>
            
            {/* Subcategoría - Checkboxes filtered by tipos */}
            <div className="space-y-2">
              <Label>Subcategoría</Label>
              {onSubcategoriasChange ? (
                <TaxonomySubcategorySelector
                  selectedSubcategorias={selectedSubcategorias}
                  onChange={onSubcategoriasChange}
                  filterByTipoIds={selectedTipoIds}
                />
              ) : (
                <Input
                  value={editData.subcategory}
                  onChange={(e) => onEditChange('subcategory', e.target.value)}
                  placeholder="Subcategoría"
                />
              )}
            </div>
            
            {/* Sector */}
            <div className="space-y-2">
              <Label>Sector</Label>
              <TaxonomySectorSelector
                value={editData.sector_id}
                onChange={(value) => onEditChange('sector_id', value)}
                subsectorValue={editData.subsector_industrial}
                onSubsectorChange={(value) => onEditChange('subsector_industrial', value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Aplicación principal</Label>
              <Input
                value={editData.applications}
                onChange={(e) => onEditChange('applications', e.target.value)}
              />
            </div>
          </div>

          {/* Descripción Técnica */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              DESCRIPCIÓN TÉCNICA
            </h3>
            <Textarea
              value={editData.description}
              onChange={(e) => onEditChange('description', e.target.value)}
              rows={4}
              placeholder="Descripción técnica breve de la tecnología..."
            />
          </div>

          {/* Innovación y Ventajas */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              INNOVACIÓN Y VENTAJAS
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ventaja competitiva clave</Label>
                <Textarea
                  value={editData.ventaja_competitiva}
                  onChange={(e) => onEditChange('ventaja_competitiva', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Por qué es innovadora</Label>
                <Textarea
                  value={editData.innovacion}
                  onChange={(e) => onEditChange('innovacion', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Referencias */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              REFERENCIAS
            </h3>
            <Textarea
              value={editData.casos_referencia}
              onChange={(e) => onEditChange('casos_referencia', e.target.value)}
              rows={3}
              placeholder="Casos de referencia, clientes, implementaciones..."
            />
          </div>

          {/* Notas del Analista */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              NOTAS DEL ANALISTA
            </h3>
            <Textarea
              value={editData.comentarios_analista}
              onChange={(e) => onEditChange('comentarios_analista', e.target.value)}
              rows={3}
              placeholder="Comentarios y observaciones del analista..."
            />
          </div>
        </div>
      ) : (
        /* ==================== VIEW MODE ==================== */
        <div className="space-y-6 py-4">
          {/* Información General */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              INFORMACIÓN GENERAL
            </h3>
            <UnifiedInfoRow icon={Building2} label="Proveedor / Empresa" value={data.provider} />
            <UnifiedInfoRow icon={MapPin} label="País de origen" value={data.country} />
            <UnifiedInfoRow icon={Users} label="Países donde actúa" value={data.paises_actua} />
            <UnifiedInfoRow icon={Globe} label="Web de la empresa" value={data.web} isLink />
            <UnifiedInfoRow icon={Mail} label="Email de contacto" value={data.email} />
            <UnifiedInfoRow icon={Tag} label="Grado de madurez (TRL)" value={data.trl ? `TRL ${data.trl}` : null} />
            <UnifiedInfoRow icon={Clock} label="Estado del seguimiento" value={data.estado_seguimiento} />
            <UnifiedInfoRow icon={Calendar} label="Fecha de scouting" value={formatDate(data.fecha_scouting)} />
          </div>

          <Separator />

          {/* Clasificación */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              CLASIFICACIÓN
            </h3>
            <UnifiedInfoRow icon={Tag} label="Tipo de tecnología" value={data.type} />
            <UnifiedInfoRow icon={Tag} label="Subcategoría" value={data.subcategory} />
            <UnifiedInfoRow icon={Tag} label="Sector y subsector" value={data.sector} />
            <UnifiedInfoRow icon={FileText} label="Aplicación principal" value={data.applications} />
          </div>

          <Separator />

          {/* Descripción Técnica */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              DESCRIPCIÓN TÉCNICA
            </h3>
            <p className={`text-sm ${data.description ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}>
              {data.description || 'Sin información'}
            </p>
          </div>

          <Separator />

          {/* Innovación y Ventajas */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              INNOVACIÓN Y VENTAJAS
            </h3>
            <UnifiedInfoRow icon={Trophy} label="Ventaja competitiva clave" value={data.ventaja_competitiva} />
            <UnifiedInfoRow icon={Lightbulb} label="Por qué es innovadora" value={data.innovacion} />
          </div>

          <Separator />

          {/* Referencias */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              REFERENCIAS
            </h3>
            <p className={`text-sm ${data.casos_referencia ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}>
              {data.casos_referencia || 'Sin información'}
            </p>
          </div>

          <Separator />

          {/* Notas del Analista */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              NOTAS DEL ANALISTA
            </h3>
            <p className={`text-sm italic ${data.comentarios_analista ? 'text-foreground' : 'text-muted-foreground/50'}`}>
              {data.comentarios_analista || 'Sin notas'}
            </p>
          </div>

          <Separator />

          {/* Información de Registro */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              INFORMACIÓN DE REGISTRO
            </h3>
            {metadata.studyName && (
              <UnifiedInfoRow icon={FileText} label="Estudio" value={metadata.studyName} />
            )}
            <UnifiedInfoRow icon={Database} label="Procedencia" value={getSourceLabel(metadata)} />
            {data.created_at && (
              <UnifiedInfoRow icon={Calendar} label="Fecha de creación" value={formatDate(data.created_at)} />
            )}
            {metadata.addedAt && metadata.addedAt !== data.created_at && (
              <UnifiedInfoRow icon={Calendar} label="Fecha de adición" value={formatDate(metadata.addedAt)} />
            )}
            {data.updated_at && (
              <UnifiedInfoRow icon={Clock} label="Última actualización" value={formatDate(data.updated_at)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
