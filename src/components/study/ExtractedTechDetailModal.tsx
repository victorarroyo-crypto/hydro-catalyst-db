/**
 * Extracted Tech Detail Modal
 * 
 * Refactored to use UnifiedTechDetailContent for consistent display.
 * Handles technology details from AI extraction in studies.
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
import type { Tables } from '@/integrations/supabase/types';
import type { UnifiedTechEditData, UnifiedTechData } from '@/types/unifiedTech';
import type { Technology } from '@/types/database';
import type { SelectedTipo, SelectedSubcategoria } from '@/components/taxonomy';

// Extended interface for extracted technology props
interface ExtractedTechnology {
  id: string;
  study_id: string;
  technology_name: string;
  provider: string | null;
  country: string | null;
  web: string | null;
  trl: number | null;
  type_suggested: string | null;
  subcategory_suggested: string | null;
  brief_description: string | null;
  applications: string[] | null;
  confidence_score: number | null;
  already_in_db: boolean | null;
  existing_technology_id: string | null;
  inclusion_reason: string | null;
  source: string | null;
  added_at: string;
  paises_actua?: string | null;
  email?: string | null;
  sector?: string | null;
  ventaja_competitiva?: string | null;
  innovacion?: string | null;
  casos_referencia?: string | null;
  tipo_id?: number | null;
  subcategoria_id?: number | null;
  sector_id?: string | null;
  subsector_industrial?: string | null;
  status?: string | null;
}

interface Props {
  technology: ExtractedTechnology;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToScoutingQueue?: (tech: ExtractedTechnology) => void;
}

// Map ExtractedTechnology to UnifiedTechData
function mapFromExtracted(tech: ExtractedTechnology, linkedTech?: Technology | null): UnifiedTechData {
  if (linkedTech) {
    return {
      id: linkedTech.id,
      technology_name: linkedTech['Nombre de la tecnología'],
      provider: linkedTech['Proveedor / Empresa'],
      country: linkedTech['País de origen'],
      paises_actua: linkedTech['Paises donde actua'],
      web: linkedTech['Web de la empresa'],
      email: linkedTech['Email de contacto'],
      trl: linkedTech['Grado de madurez (TRL)'],
      estado_seguimiento: linkedTech['Estado del seguimiento'],
      fecha_scouting: linkedTech['Fecha de scouting'],
      type: linkedTech['Tipo de tecnología'],
      subcategory: linkedTech['Subcategoría'],
      sector: linkedTech['Sector y subsector'],
      applications: linkedTech['Aplicación principal'],
      description: linkedTech['Descripción técnica breve'],
      ventaja_competitiva: linkedTech['Ventaja competitiva clave'],
      innovacion: linkedTech['Porque es innovadora'],
      casos_referencia: linkedTech['Casos de referencia'],
      comentarios_analista: linkedTech['Comentarios del analista'],
      status: linkedTech.status,
      quality_score: linkedTech.quality_score,
      review_status: linkedTech.review_status,
      created_at: linkedTech.created_at,
      updated_at: linkedTech.updated_at,
    };
  }
  
  return {
    id: tech.id,
    technology_name: tech.technology_name,
    provider: tech.provider,
    country: tech.country,
    paises_actua: tech.paises_actua || null,
    web: tech.web,
    email: tech.email || null,
    trl: tech.trl,
    estado_seguimiento: null,
    fecha_scouting: null,
    type: tech.type_suggested,
    subcategory: tech.subcategory_suggested,
    sector: tech.sector || null,
    applications: tech.applications?.join(', ') || null,
    description: tech.brief_description,
    ventaja_competitiva: tech.ventaja_competitiva || null,
    innovacion: tech.innovacion || null,
    casos_referencia: tech.casos_referencia || null,
    comentarios_analista: tech.inclusion_reason,
    status: tech.status || null,
    quality_score: null,
    review_status: null,
    created_at: tech.added_at,
    updated_at: null,
  };
}

export default function ExtractedTechDetailModal({ 
  technology, 
  open, 
  onOpenChange,
  onSendToScoutingQueue
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tech = technology;
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToDB, setIsSendingToDB] = useState(false);
  
  // Taxonomy state for checkboxes
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);

  // Determine if already linked to database
  const isLinkedToDB = tech.already_in_db || !!tech.existing_technology_id;

  // Initialize editData
  const [editData, setEditData] = useState<UnifiedTechEditData | null>(() => {
    return toEditData(mapFromExtracted(tech, null));
  });

  // Fetch fresh data from technologies table when linked to DB
  const { data: linkedTechnology, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['linked-technology', tech.existing_technology_id],
    queryFn: async () => {
      if (!tech.existing_technology_id) return null;
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('*')
        .eq('id', tech.existing_technology_id)
        .single();
      if (error) throw error;
      return data as Technology;
    },
    enabled: !!tech.existing_technology_id && open,
  });

  // Fetch technology tipos when linked to DB
  const { data: technologyTipos } = useQuery({
    queryKey: ['technology-tipos', tech.existing_technology_id],
    queryFn: async () => {
      if (!tech.existing_technology_id) return [];
      const { data, error } = await externalSupabase
        .from('technology_tipos')
        .select('tipo_id, is_primary')
        .eq('technology_id', tech.existing_technology_id);
      if (error) throw error;
      return data;
    },
    enabled: !!tech.existing_technology_id && open,
  });

  // Fetch technology subcategorias when linked to DB
  const { data: technologySubcategorias } = useQuery({
    queryKey: ['technology-subcategorias', tech.existing_technology_id],
    queryFn: async () => {
      if (!tech.existing_technology_id) return [];
      const { data, error } = await externalSupabase
        .from('technology_subcategorias')
        .select('subcategoria_id, is_primary')
        .eq('technology_id', tech.existing_technology_id);
      if (error) throw error;
      return data;
    },
    enabled: !!tech.existing_technology_id && open,
  });

  // Update editData and taxonomy state when technology changes
  useEffect(() => {
    if (tech) {
      if (isLinkedToDB && linkedTechnology) {
        setEditData(toEditData(mapFromExtracted(tech, linkedTechnology)));
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
        setEditData(toEditData(mapFromExtracted(tech, null)));
        if (tech.tipo_id) {
          setSelectedTipos([{ tipo_id: tech.tipo_id, is_primary: true }]);
        } else {
          setSelectedTipos([]);
        }
        if (tech.subcategoria_id) {
          setSelectedSubcategorias([{ subcategoria_id: tech.subcategoria_id, is_primary: true }]);
        } else {
          setSelectedSubcategorias([]);
        }
      }
    }
  }, [tech?.id, isLinkedToDB, linkedTechnology, technologyTipos, technologySubcategorias]);

  // Create unified data and metadata
  const unifiedData = mapFromExtracted(tech, linkedTechnology);
  const metadata = {
    source: isLinkedToDB ? 'database' as const : 'extracted' as const,
    phase: 'Tecnología Extraída',
    studyId: tech.study_id,
    isLinkedToDB,
    linkedTechId: tech.existing_technology_id || undefined,
    confidenceScore: tech.confidence_score || undefined,
    specificSource: tech.source || 'ai_extracted',
    addedAt: tech.added_at,
  };
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
    if (!editData || isLinkedToDB) return;
    
    setIsSaving(true);
    
    const primaryTipoId = selectedTipos.find(t => t.is_primary)?.tipo_id || null;
    const primarySubcategoriaId = selectedSubcategorias.find(s => s.is_primary)?.subcategoria_id || null;
    
    const { error } = await externalSupabase
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
        tipo_id: primaryTipoId,
        subcategoria_id: primarySubcategoriaId,
        sector_id: editData.sector_id,
        subsector_industrial: editData.subsector_industrial,
        status: editData.status,
      })
      .eq('id', tech.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', tech.study_id] });
      queryClient.invalidateQueries({ queryKey: ['study-solutions', tech.study_id] });
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

    // Validation
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

    // Create M:N relationships
    if (selectedTipos.length > 0) {
      await externalSupabase.from('technology_tipos').insert(
        selectedTipos.map(t => ({
          technology_id: insertedTech.id,
          tipo_id: t.tipo_id,
          is_primary: t.is_primary,
        }))
      );
    }
    if (selectedSubcategorias.length > 0) {
      await externalSupabase.from('technology_subcategorias').insert(
        selectedSubcategorias.map(s => ({
          technology_id: insertedTech.id,
          subcategoria_id: s.subcategoria_id,
          is_primary: s.is_primary,
        }))
      );
    }

    // Link longlist entry
    await externalSupabase
      .from('study_longlist')
      .update({
        existing_technology_id: insertedTech.id,
        already_in_db: true,
        tipo_id: primaryTipoId,
        subcategoria_id: primarySubcategoriaId,
        sector_id: dataToSend.sector_id,
        subsector_industrial: dataToSend.subsector_industrial,
      })
      .eq('id', tech.id);

    setIsSendingToDB(false);

    queryClient.invalidateQueries({ queryKey: ['technologies'] });
    queryClient.invalidateQueries({ queryKey: ['study-longlist', tech.study_id] });
    queryClient.invalidateQueries({ queryKey: ['study-solutions', tech.study_id] });
    toast({
      title: 'Enviado a BD',
      description: 'La tecnología está vinculada y pendiente de revisión',
    });
    onOpenChange(false);
  };

  const handleEnrichmentComplete = async (enrichedData: Record<string, any>) => {
    if (isLinkedToDB) return;
    
    const currentData = editData || toEditData(mapFromExtracted(tech, null));
    
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
    
    // Save to DB
    setIsSaving(true);
    const { error } = await externalSupabase
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
      .eq('id', tech.id);
    
    setIsSaving(false);
    
    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el enriquecimiento', variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', tech.study_id] });
      queryClient.invalidateQueries({ queryKey: ['study-solutions', tech.study_id] });
      toast({ title: 'Enriquecimiento guardado', description: 'Los datos de la IA se han guardado correctamente' });
    }
  };

  const handleViewInDB = () => {
    if (tech.existing_technology_id) {
      window.open(`/technologies?id=${tech.existing_technology_id}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="extracted-tech-detail-description">
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">{unifiedData.technology_name}</DialogTitle>
          <DialogDescription id="extracted-tech-detail-description" className="sr-only">
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
          {isLinkedToDB && tech.existing_technology_id && (
            <Button variant="outline" onClick={handleViewInDB}>
              Ver en Base de Datos
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
