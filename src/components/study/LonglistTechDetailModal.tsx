/**
 * Longlist Tech Detail Modal
 * 
 * Refactored to use UnifiedTechDetailContent for consistent display.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Database, ExternalLink } from 'lucide-react';
import { UnifiedTechDetailContent } from '@/components/tech/UnifiedTechDetailContent';
import { 
  mapFromLonglist, 
  createLonglistMetadata, 
  createLonglistActions,
  toEditData,
} from '@/lib/mapToUnifiedTech';
import { generateLonglistWordDocument } from '@/lib/generateLonglistWordDocument';
import type { Tables } from '@/integrations/supabase/types';
import type { UnifiedTechEditData } from '@/types/unifiedTech';
import type { Technology } from '@/types/database';

type LonglistItem = Tables<'study_longlist'>;

interface LonglistTechDetailModalProps {
  item: LonglistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyName?: string;
}

export const LonglistTechDetailModal: React.FC<LonglistTechDetailModalProps> = ({
  item,
  open,
  onOpenChange,
  studyId,
  studyName = 'Estudio',
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToDB, setIsSendingToDB] = useState(false);
  const [editData, setEditData] = useState<UnifiedTechEditData | null>(null);

  // Determine if already linked to database
  const isLinkedToDB = item?.already_in_db || !!item?.existing_technology_id;

  // Fetch fresh data from technologies table when linked to DB
  const { data: linkedTechnology, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['linked-technology', item?.existing_technology_id],
    queryFn: async () => {
      if (!item?.existing_technology_id) return null;
      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('id', item.existing_technology_id)
        .single();
      if (error) throw error;
      return data as Technology;
    },
    enabled: !!item?.existing_technology_id && open,
  });

  // Initialize edit data when item changes
  useEffect(() => {
    if (item && !isLinkedToDB) {
      const unifiedData = mapFromLonglist(item, null);
      setEditData(toEditData(unifiedData));
    }
  }, [item, isLinkedToDB]);

  if (!item) return null;

  // Create unified data and metadata
  const unifiedData = mapFromLonglist(item, linkedTechnology);
  const metadata = createLonglistMetadata(studyId, studyName, item, isLinkedToDB);
  const actions = createLonglistActions(isLinkedToDB);

  const handleEditChange = (field: keyof UnifiedTechEditData, value: string | number | null) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const handleSave = async () => {
    if (isLinkedToDB || !editData) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('study_longlist')
      .update({
        technology_name: editData.technology_name,
        provider: editData.provider,
        country: editData.country,
        trl: editData.trl,
        brief_description: editData.description,
        inclusion_reason: editData.comentarios_analista,
        web: editData.web,
        applications: editData.applications ? editData.applications.split(',').map(s => s.trim()).filter(Boolean) : [],
        type_suggested: editData.type,
        subcategory_suggested: editData.subcategory,
        paises_actua: editData.paises_actua,
        sector: editData.sector,
        ventaja_competitiva: editData.ventaja_competitiva,
        innovacion: editData.innovacion,
        casos_referencia: editData.casos_referencia,
        email: editData.email,
      } as any)
      .eq('id', item.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      toast({
        title: 'Guardado',
        description: 'Los cambios se han guardado correctamente',
      });
      setIsEditing(false);
    }
  };

  const handleSendToDatabase = async () => {
    if (isLinkedToDB) {
      toast({
        title: 'Ya existe en BD',
        description: 'Esta tecnología ya está vinculada a la base de datos',
      });
      return;
    }

    setIsSendingToDB(true);

    const dataToSend = editData || toEditData(unifiedData);
    
    const { data: insertedTech, error } = await supabase
      .from('technologies')
      .insert({
        'Nombre de la tecnología': dataToSend.technology_name,
        'Proveedor / Empresa': dataToSend.provider || null,
        'País de origen': dataToSend.country || null,
        'Paises donde actua': dataToSend.paises_actua || null,
        'Web de la empresa': dataToSend.web || null,
        'Email de contacto': dataToSend.email || null,
        'Grado de madurez (TRL)': dataToSend.trl,
        'Descripción técnica breve': dataToSend.description || null,
        'Tipo de tecnología': dataToSend.type || 'Por clasificar',
        'Subcategoría': dataToSend.subcategory || null,
        'Sector y subsector': dataToSend.sector || null,
        'Aplicación principal': dataToSend.applications || null,
        'Ventaja competitiva clave': dataToSend.ventaja_competitiva || null,
        'Porque es innovadora': dataToSend.innovacion || null,
        'Casos de referencia': dataToSend.casos_referencia || null,
        'Comentarios del analista': dataToSend.comentarios_analista || null,
        status: 'en_revision',
        review_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      setIsSendingToDB(false);
      toast({
        title: 'Error',
        description: 'No se pudo enviar a la base de datos',
        variant: 'destructive',
      });
      return;
    }

    const { error: updateError } = await supabase
      .from('study_longlist')
      .update({
        existing_technology_id: insertedTech.id,
        already_in_db: true,
      })
      .eq('id', item.id);

    setIsSendingToDB(false);

    if (updateError) {
      console.error('Error linking to longlist:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['technologies'] });
    queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
    toast({
      title: 'Enviado a BD',
      description: 'La tecnología está vinculada y pendiente de revisión',
    });
    onOpenChange(false);
  };

  const handleEnrichmentComplete = (enrichedData: Record<string, any>) => {
    if (isLinkedToDB || !editData) return;
    
    setEditData(prev => prev ? {
      ...prev,
      description: enrichedData.descripcion || prev.description,
      comentarios_analista: enrichedData.comentarios_analista || prev.comentarios_analista,
      ventaja_competitiva: enrichedData.ventaja_competitiva || prev.ventaja_competitiva,
      innovacion: enrichedData.innovacion || prev.innovacion,
      casos_referencia: enrichedData.casos_referencia || prev.casos_referencia,
      paises_actua: enrichedData.paises_actua || prev.paises_actua,
      sector: enrichedData.sector || prev.sector,
      applications: enrichedData.aplicacion_principal || prev.applications,
    } : null);
    
    setTimeout(() => {
      handleSave();
    }, 500);
  };

  const handleDownloadWord = () => {
    const wordData = {
      technology_name: unifiedData.technology_name,
      provider: unifiedData.provider,
      country: unifiedData.country,
      paises_actua: unifiedData.paises_actua,
      web: unifiedData.web,
      email: unifiedData.email,
      trl: unifiedData.trl,
      brief_description: unifiedData.description,
      type_suggested: unifiedData.type,
      subcategory_suggested: unifiedData.subcategory,
      sector: unifiedData.sector,
      applications: unifiedData.applications?.split(',').map(s => s.trim()) || null,
      ventaja_competitiva: unifiedData.ventaja_competitiva,
      innovacion: unifiedData.innovacion,
      casos_referencia: unifiedData.casos_referencia,
      inclusion_reason: unifiedData.comentarios_analista,
      source: metadata.specificSource,
      added_at: metadata.addedAt,
      // New fields for complete parity with DB
      estado_seguimiento: unifiedData.estado_seguimiento,
      fecha_scouting: unifiedData.fecha_scouting,
    };
    
    generateLonglistWordDocument(wordData as any, studyName);
    toast({
      title: 'Generando documento',
      description: 'La ficha Word se está generando...',
    });
  };

  const handleViewInDB = () => {
    if (item.existing_technology_id) {
      window.open(`/technologies?id=${item.existing_technology_id}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="longlist-tech-detail-description">
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">{unifiedData.technology_name}</DialogTitle>
          <DialogDescription id="longlist-tech-detail-description" className="sr-only">
            Detalles de la tecnología {unifiedData.technology_name}
          </DialogDescription>
        </DialogHeader>

        {isLoadingLinked && isLinkedToDB ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <UnifiedTechDetailContent
            data={unifiedData}
            metadata={metadata}
            actions={actions}
            isEditing={isEditing}
            editData={editData || undefined}
            isSaving={isSaving}
            isSendingToDB={isSendingToDB}
            onEditChange={handleEditChange}
            onStartEdit={() => setIsEditing(true)}
            onCancelEdit={() => setIsEditing(false)}
            onSave={handleSave}
            onEnrichmentComplete={handleEnrichmentComplete}
            onDownloadWord={handleDownloadWord}
            onSendToDB={handleSendToDatabase}
            onViewInDB={handleViewInDB}
          />
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!isLinkedToDB && (
            <Button 
              onClick={handleSendToDatabase} 
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
          {isLinkedToDB && item.existing_technology_id && (
            <Button variant="outline" onClick={handleViewInDB}>
              Ver en Base de Datos
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
