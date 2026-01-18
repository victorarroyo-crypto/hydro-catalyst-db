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
import { externalSupabase } from '@/integrations/supabase/externalClient';
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
import type { SelectedTipo, SelectedSubcategoria } from '@/components/taxonomy';

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
  
  // Taxonomy state for checkboxes
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);
  
  // Determine if already linked to database
  const isLinkedToDB = item?.already_in_db || !!item?.existing_technology_id;

  // Initialize editData synchronously - always allow editing for all items
  const [editData, setEditData] = useState<UnifiedTechEditData | null>(() => {
    if (item) {
      return toEditData(mapFromLonglist(item, null));
    }
    return null;
  });

  // Fetch fresh data from technologies table when linked to DB
  const { data: linkedTechnology, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['linked-technology', item?.existing_technology_id],
    queryFn: async () => {
      if (!item?.existing_technology_id) return null;
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('*')
        .eq('id', item.existing_technology_id)
        .single();
      if (error) throw error;
      return data as Technology;
    },
    enabled: !!item?.existing_technology_id && open,
  });

  // Fetch technology tipos when linked to DB
  const { data: technologyTipos } = useQuery({
    queryKey: ['technology-tipos', item?.existing_technology_id],
    queryFn: async () => {
      if (!item?.existing_technology_id) return [];
      const { data, error } = await externalSupabase
        .from('technology_tipos')
        .select('tipo_id, is_primary')
        .eq('technology_id', item.existing_technology_id);
      if (error) throw error;
      return data;
    },
    enabled: !!item?.existing_technology_id && open,
  });

  // Fetch technology subcategorias when linked to DB
  const { data: technologySubcategorias } = useQuery({
    queryKey: ['technology-subcategorias', item?.existing_technology_id],
    queryFn: async () => {
      if (!item?.existing_technology_id) return [];
      const { data, error } = await externalSupabase
        .from('technology_subcategorias')
        .select('subcategoria_id, is_primary')
        .eq('technology_id', item.existing_technology_id);
      if (error) throw error;
      return data;
    },
    enabled: !!item?.existing_technology_id && open,
  });

  // Update editData and taxonomy state when item/linkedTechnology changes
  useEffect(() => {
    if (item) {
      // For linked items, prefer linkedTechnology data if available
      if (isLinkedToDB && linkedTechnology) {
        setEditData(toEditData(mapFromLonglist(item, linkedTechnology)));
        // Use tipos/subcategorias from technology_tipos/technology_subcategorias tables
        if (technologyTipos && technologyTipos.length > 0) {
          setSelectedTipos(technologyTipos);
        } else if ((linkedTechnology as any).tipo_id) {
          setSelectedTipos([{ tipo_id: (linkedTechnology as any).tipo_id, is_primary: true }]);
        }
        if (technologySubcategorias && technologySubcategorias.length > 0) {
          setSelectedSubcategorias(technologySubcategorias);
        } else if ((linkedTechnology as any).subcategoria_id) {
          setSelectedSubcategorias([{ subcategoria_id: (linkedTechnology as any).subcategoria_id, is_primary: true }]);
        }
      } else {
        setEditData(toEditData(mapFromLonglist(item, null)));
        // Initialize from longlist item's tipo_id/subcategoria_id
        if (item.tipo_id) {
          setSelectedTipos([{ tipo_id: item.tipo_id, is_primary: true }]);
        } else {
          setSelectedTipos([]);
        }
        if (item.subcategoria_id) {
          setSelectedSubcategorias([{ subcategoria_id: item.subcategoria_id, is_primary: true }]);
        } else {
          setSelectedSubcategorias([]);
        }
      }
    }
  }, [item?.id, isLinkedToDB, linkedTechnology, technologyTipos, technologySubcategorias]);

  if (!item) return null;

  // Create unified data and metadata
  const unifiedData = mapFromLonglist(item, linkedTechnology);
  const metadata = createLonglistMetadata(studyId, studyName, item, isLinkedToDB);
  const actions = createLonglistActions(isLinkedToDB);

  // Taxonomy handlers
  const handleTiposChange = (tipos: SelectedTipo[]) => {
    setSelectedTipos(tipos);
    const primaryTipo = tipos.find(t => t.is_primary);
    if (editData) {
      setEditData({ ...editData, tipo_id: primaryTipo?.tipo_id || null });
    }
  };

  const handleSubcategoriasChange = (subcategorias: SelectedSubcategoria[]) => {
    setSelectedSubcategorias(subcategorias);
    const primarySub = subcategorias.find(s => s.is_primary);
    if (editData) {
      setEditData({ ...editData, subcategoria_id: primarySub?.subcategoria_id || null });
    }
  };

  const handleEditChange = (field: keyof UnifiedTechEditData, value: string | number | null) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const handleSave = async () => {
    if (!editData) return;
    
    setIsSaving(true);
    
    // Get primary tipo/subcategoria IDs
    const primaryTipoId = selectedTipos.find(t => t.is_primary)?.tipo_id || null;
    const primarySubcategoriaId = selectedSubcategorias.find(s => s.is_primary)?.subcategoria_id || null;
    
    // Always save to study_longlist with taxonomy IDs
    const { error: longlistError } = await externalSupabase
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
        // Taxonomy IDs
        tipo_id: primaryTipoId,
        subcategoria_id: primarySubcategoriaId,
        sector_id: editData.sector_id,
        subsector_industrial: editData.subsector_industrial,
        status: editData.status,
      })
      .eq('id', item.id);

    // If linked to DB, also sync changes to technologies table
    if (isLinkedToDB && item.existing_technology_id) {
      const { error: techError } = await externalSupabase
        .from('technologies')
        .update({
          'Nombre de la tecnología': editData.technology_name,
          'Proveedor / Empresa': editData.provider || null,
          'País de origen': editData.country || null,
          'Paises donde actua': editData.paises_actua || null,
          'Web de la empresa': editData.web || null,
          'Email de contacto': editData.email || null,
          'Grado de madurez (TRL)': editData.trl,
          'Estado del seguimiento': editData.estado_seguimiento || null,
          'Descripción técnica breve': editData.description || null,
          'Tipo de tecnología': editData.type || 'Por clasificar',
          'Subcategoría': editData.subcategory || null,
          'Sector y subsector': editData.sector || null,
          'Aplicación principal': editData.applications || null,
          'Ventaja competitiva clave': editData.ventaja_competitiva || null,
          'Porque es innovadora': editData.innovacion || null,
          'Casos de referencia': editData.casos_referencia || null,
          'Comentarios del analista': editData.comentarios_analista || null,
          tipo_id: primaryTipoId,
          subcategoria_id: primarySubcategoriaId,
          sector_id: editData.sector_id,
          subsector_industrial: editData.subsector_industrial,
        })
        .eq('id', item.existing_technology_id);

      if (techError) {
        console.error('Error syncing to technologies:', techError);
      }

      // Sync many-to-many relationships for tipos
      if (selectedTipos.length > 0) {
        await externalSupabase.from('technology_tipos').delete().eq('technology_id', item.existing_technology_id);
        await externalSupabase.from('technology_tipos').insert(
          selectedTipos.map(t => ({
            technology_id: item.existing_technology_id,
            tipo_id: t.tipo_id,
            is_primary: t.is_primary,
          }))
        );
      }

      // Sync many-to-many relationships for subcategorias
      if (selectedSubcategorias.length > 0) {
        await externalSupabase.from('technology_subcategorias').delete().eq('technology_id', item.existing_technology_id);
        await externalSupabase.from('technology_subcategorias').insert(
          selectedSubcategorias.map(s => ({
            technology_id: item.existing_technology_id,
            subcategoria_id: s.subcategoria_id,
            is_primary: s.is_primary,
          }))
        );
      }
    }

    setIsSaving(false);

    if (longlistError) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      if (isLinkedToDB) {
        queryClient.invalidateQueries({ queryKey: ['technologies'] });
        queryClient.invalidateQueries({ queryKey: ['linked-technology', item.existing_technology_id] });
        queryClient.invalidateQueries({ queryKey: ['technology-tipos', item.existing_technology_id] });
        queryClient.invalidateQueries({ queryKey: ['technology-subcategorias', item.existing_technology_id] });
      }
      toast({
        title: 'Guardado',
        description: isLinkedToDB 
          ? 'Los cambios se han sincronizado con la BD principal' 
          : 'Los cambios se han guardado correctamente',
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

    // Validation for required fields
    const errors: string[] = [];
    if (!editData?.country) errors.push('País de origen');
    if (selectedTipos.length === 0) errors.push('Tipo de tecnología');
    if (!editData?.sector_id) errors.push('Sector');
    
    if (errors.length > 0) {
      toast({
        title: 'Campos requeridos',
        description: `Por favor completa: ${errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSendingToDB(true);

    const dataToSend = editData || toEditData(unifiedData);
    const primaryTipoId = selectedTipos.find(t => t.is_primary)?.tipo_id || null;
    const primarySubcategoriaId = selectedSubcategorias.find(s => s.is_primary)?.subcategoria_id || null;
    
    const { data: insertedTech, error } = await externalSupabase
      .from('technologies')
      .insert({
        'Nombre de la tecnología': dataToSend.technology_name,
        'Proveedor / Empresa': dataToSend.provider || null,
        'País de origen': dataToSend.country || null,
        'Paises donde actua': dataToSend.paises_actua || null,
        'Web de la empresa': dataToSend.web || null,
        'Email de contacto': dataToSend.email || null,
        'Grado de madurez (TRL)': dataToSend.trl,
        'Estado del seguimiento': dataToSend.estado_seguimiento || null,
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
        tipo_id: primaryTipoId,
        subcategoria_id: primarySubcategoriaId,
        sector_id: dataToSend.sector_id,
        subsector_industrial: dataToSend.subsector_industrial,
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

    // Create many-to-many relationships for tipos
    if (selectedTipos.length > 0) {
      await externalSupabase.from('technology_tipos').insert(
        selectedTipos.map(t => ({
          technology_id: insertedTech.id,
          tipo_id: t.tipo_id,
          is_primary: t.is_primary,
        }))
      );
    }

    // Create many-to-many relationships for subcategorias
    if (selectedSubcategorias.length > 0) {
      await externalSupabase.from('technology_subcategorias').insert(
        selectedSubcategorias.map(s => ({
          technology_id: insertedTech.id,
          subcategoria_id: s.subcategoria_id,
          is_primary: s.is_primary,
        }))
      );
    }

    const { error: updateError } = await externalSupabase
      .from('study_longlist')
      .update({
        existing_technology_id: insertedTech.id,
        already_in_db: true,
        tipo_id: primaryTipoId,
        subcategoria_id: primarySubcategoriaId,
        sector_id: dataToSend.sector_id,
        subsector_industrial: dataToSend.subsector_industrial,
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

  const handleEnrichmentComplete = async (enrichedData: Record<string, any>) => {
    // Use current editData or create from item to avoid null issues
    const currentData = editData || toEditData(mapFromLonglist(item, linkedTechnology));
    
    const updatedData = {
      ...currentData,
      description: enrichedData.descripcion || currentData.description,
      comentarios_analista: enrichedData.comentarios_analista || currentData.comentarios_analista,
      ventaja_competitiva: enrichedData.ventaja_competitiva || currentData.ventaja_competitiva,
      innovacion: enrichedData.innovacion || currentData.innovacion,
      casos_referencia: enrichedData.casos_referencia || currentData.casos_referencia,
      paises_actua: enrichedData.paises_actua || currentData.paises_actua,
      sector: enrichedData.sector || currentData.sector,
      applications: enrichedData.aplicacion_principal || currentData.applications,
    };
    
    setEditData(updatedData);
    
    // Save directly to study_longlist
    setIsSaving(true);
    const { error: longlistError } = await externalSupabase
      .from('study_longlist')
      .update({
        brief_description: updatedData.description,
        inclusion_reason: updatedData.comentarios_analista,
        ventaja_competitiva: updatedData.ventaja_competitiva,
        innovacion: updatedData.innovacion,
        casos_referencia: updatedData.casos_referencia,
        paises_actua: updatedData.paises_actua,
        sector: updatedData.sector,
        applications: updatedData.applications 
          ? updatedData.applications.split(',').map(s => s.trim()).filter(Boolean) 
          : [],
      })
      .eq('id', item.id);
    
    // If linked to DB, also sync enriched data to technologies table
    if (isLinkedToDB && item.existing_technology_id) {
      const { error: techError } = await externalSupabase
        .from('technologies')
        .update({
          'Descripción técnica breve': updatedData.description || null,
          'Comentarios del analista': updatedData.comentarios_analista || null,
          'Ventaja competitiva clave': updatedData.ventaja_competitiva || null,
          'Porque es innovadora': updatedData.innovacion || null,
          'Casos de referencia': updatedData.casos_referencia || null,
          'Paises donde actua': updatedData.paises_actua || null,
          'Sector y subsector': updatedData.sector || null,
          'Aplicación principal': updatedData.applications || null,
        })
        .eq('id', item.existing_technology_id);

      if (techError) {
        console.error('Error syncing enrichment to technologies:', techError);
      }
    }
    
    setIsSaving(false);
    
    if (longlistError) {
      toast({ title: 'Error', description: 'No se pudo guardar el enriquecimiento', variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      if (isLinkedToDB) {
        queryClient.invalidateQueries({ queryKey: ['technologies'] });
        queryClient.invalidateQueries({ queryKey: ['linked-technology', item.existing_technology_id] });
      }
      toast({ 
        title: 'Enriquecimiento guardado', 
        description: isLinkedToDB 
          ? 'Los datos de la IA se han sincronizado con la BD principal'
          : 'Los datos de la IA se han guardado correctamente' 
      });
    }
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
            selectedTipos={selectedTipos}
            selectedSubcategorias={selectedSubcategorias}
            onTiposChange={handleTiposChange}
            onSubcategoriasChange={handleSubcategoriasChange}
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
