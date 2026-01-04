import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TRLBadge } from '@/components/TRLBadge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { syncTrendInsert, syncCaseStudyInsert, syncTechnologyDelete, syncProjectTechnologyInsert } from '@/lib/syncToExternal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Star,
  Edit,
  FolderPlus,
  ExternalLink,
  SendHorizonal,
  Loader2,
  ClipboardList,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import type { Technology } from '@/types/database';

interface TechnologyDetailModalProps {
  technology: Technology | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
}

interface TechnologyTipoRelation {
  tipo_id: number;
  is_primary: boolean;
}

export const TechnologyDetailModal: React.FC<TechnologyDetailModalProps> = ({
  technology,
  open,
  onOpenChange,
  onEdit,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isSendingToReview, setIsSendingToReview] = useState(false);
  const [isMovingToTrends, setIsMovingToTrends] = useState(false);
  const [isMovingToCaseStudy, setIsMovingToCaseStudy] = useState(false);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showTrendsConfirm, setShowTrendsConfirm] = useState(false);
  const [showCaseStudyConfirm, setShowCaseStudyConfirm] = useState(false);

  // Fetch user's active projects
  const { data: userProjects } = useQuery({
    queryKey: ['user-projects-for-add', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .in('status', ['draft', 'active', 'on_hold'])
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  // Fetch taxonomy tipos
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('id, codigo, nombre');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch technology tipos relationship
  const { data: technologyTipos } = useQuery({
    queryKey: ['technology-tipos', technology?.id],
    queryFn: async () => {
      if (!technology?.id) return [];
      const { data, error } = await supabase
        .from('technology_tipos')
        .select('tipo_id, is_primary')
        .eq('technology_id', technology.id);
      if (error) throw error;
      return data as TechnologyTipoRelation[];
    },
    enabled: !!technology?.id && open,
  });

  if (!technology) return null;

  // Check if user has internal role (can see internal information)
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);
  const canEdit = isInternalUser;
  const hasProjects = userProjects && userProjects.length > 0;

  const handleAddToProject = async () => {
    if (!user || !selectedProjectId) return;
    
    setIsAddingToProject(true);
    const { data, error } = await supabase.from('project_technologies').insert({
      project_id: selectedProjectId,
      technology_id: technology.id,
      added_by: user.id,
    }).select().single();
    setIsAddingToProject(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Ya añadida',
          description: 'Esta tecnología ya está en el proyecto seleccionado',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo añadir al proyecto',
          variant: 'destructive',
        });
      }
    } else {
      // Sync to external Supabase
      try {
        await syncProjectTechnologyInsert({
          id: data.id,
          project_id: selectedProjectId,
          technology_id: technology.id,
          added_by: user.id,
          added_at: data.added_at,
        });
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }

      queryClient.invalidateQueries({ queryKey: ['project-technologies'] });
      queryClient.invalidateQueries({ queryKey: ['project-tech-counts'] });
      toast({
        title: 'Añadida al proyecto',
        description: 'La tecnología se ha añadido al proyecto',
      });
      setSelectedProjectId('');
    }
  };

  const handleAddFavorite = async () => {
    if (!user) return;
    
    setIsFavoriting(true);
    const { error } = await supabase.from('user_favorites').insert({
      user_id: user.id,
      technology_id: technology.id,
    });
    setIsFavoriting(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Ya está en favoritos',
          description: 'Esta tecnología ya está en tu lista de favoritos',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo añadir a favoritos',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Añadido a favoritos',
        description: 'La tecnología se ha añadido a tu lista de favoritos',
      });
    }
  };

  const handleSendToReview = async () => {
    if (!user) return;
    
    setIsSendingToReview(true);
    const { error } = await supabase
      .from('technologies')
      .update({
        review_status: 'pending',
        review_requested_at: new Date().toISOString(),
        review_requested_by: user.id,
      })
      .eq('id', technology.id);
    setIsSendingToReview(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar a revisión',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['technologies-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast({
        title: 'Enviado a revisión',
        description: 'La tecnología ha sido añadida a la cola de revisión',
      });
      onOpenChange(false);
    }
  };

  const handleMoveToTrends = async () => {
    if (!user) return;
    
    setIsMovingToTrends(true);
    
    // Store ALL original technology data to preserve it
    const techData = technology as unknown as Record<string, unknown>;
    const originalData = JSON.parse(JSON.stringify({
      "Nombre de la tecnología": technology["Nombre de la tecnología"],
      "Proveedor / Empresa": technology["Proveedor / Empresa"],
      "País de origen": technology["País de origen"],
      "Web de la empresa": technology["Web de la empresa"],
      "Email de contacto": technology["Email de contacto"],
      "Tipo de tecnología": technology["Tipo de tecnología"],
      "Subcategoría": technology["Subcategoría"],
      "Sector y subsector": technology["Sector y subsector"],
      "Aplicación principal": technology["Aplicación principal"],
      "Descripción técnica breve": technology["Descripción técnica breve"],
      "Ventaja competitiva clave": technology["Ventaja competitiva clave"],
      "Porque es innovadora": technology["Porque es innovadora"],
      "Casos de referencia": technology["Casos de referencia"],
      "Paises donde actua": technology["Paises donde actua"],
      "Comentarios del analista": technology["Comentarios del analista"],
      "Fecha de scouting": technology["Fecha de scouting"],
      "Estado del seguimiento": technology["Estado del seguimiento"],
      "Grado de madurez (TRL)": technology["Grado de madurez (TRL)"],
      quality_score: technology.quality_score,
      status: technology.status,
      sector_id: techData.sector_id,
      tipo_id: techData.tipo_id,
      subcategoria_id: techData.subcategoria_id,
      subsector_industrial: techData.subsector_industrial,
    }));
    
    // Insert into technological_trends with all original data preserved
    const trendData = {
      name: technology["Nombre de la tecnología"],
      description: technology["Descripción técnica breve"],
      technology_type: technology["Tipo de tecnología"],
      subcategory: technology["Subcategoría"],
      sector: technology["Sector y subsector"],
      source_technology_id: technology.id,
      created_by: user.id,
      original_data: originalData,
    };
    
    const { data: insertedTrend, error: insertError } = await supabase
      .from('technological_trends')
      .insert([trendData])
      .select()
      .single();

    if (insertError) {
      setIsMovingToTrends(false);
      toast({
        title: 'Error',
        description: 'No se pudo mover a tendencias',
        variant: 'destructive',
      });
      return;
    }

    // Sync to external Supabase
    try {
      await syncTrendInsert({ ...trendData, id: insertedTrend.id });
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    // Then delete from technologies
    const { error: deleteError } = await supabase
      .from('technologies')
      .delete()
      .eq('id', technology.id);

    // Sync deletion to external
    try {
      await syncTechnologyDelete(technology.id);
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    setIsMovingToTrends(false);

    if (deleteError) {
      toast({
        title: 'Error',
        description: 'Se creó la tendencia pero no se pudo eliminar la tecnología original',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['technological-trends'] });
      toast({
        title: 'Movido a tendencias',
        description: 'La tecnología ha sido movida y sincronizada con Supabase externo',
      });
      onOpenChange(false);
    }
  };

  const handleMoveToCaseStudy = async () => {
    if (!user) return;
    
    setIsMovingToCaseStudy(true);
    
    // Store ALL original technology data to preserve it
    const techData = technology as unknown as Record<string, unknown>;
    const originalData = JSON.parse(JSON.stringify({
      "Nombre de la tecnología": technology["Nombre de la tecnología"],
      "Proveedor / Empresa": technology["Proveedor / Empresa"],
      "País de origen": technology["País de origen"],
      "Web de la empresa": technology["Web de la empresa"],
      "Email de contacto": technology["Email de contacto"],
      "Tipo de tecnología": technology["Tipo de tecnología"],
      "Subcategoría": technology["Subcategoría"],
      "Sector y subsector": technology["Sector y subsector"],
      "Aplicación principal": technology["Aplicación principal"],
      "Descripción técnica breve": technology["Descripción técnica breve"],
      "Ventaja competitiva clave": technology["Ventaja competitiva clave"],
      "Porque es innovadora": technology["Porque es innovadora"],
      "Casos de referencia": technology["Casos de referencia"],
      "Paises donde actua": technology["Paises donde actua"],
      "Comentarios del analista": technology["Comentarios del analista"],
      "Fecha de scouting": technology["Fecha de scouting"],
      "Estado del seguimiento": technology["Estado del seguimiento"],
      "Grado de madurez (TRL)": technology["Grado de madurez (TRL)"],
      quality_score: technology.quality_score,
      status: technology.status,
      sector_id: techData.sector_id,
      tipo_id: techData.tipo_id,
      subcategoria_id: techData.subcategoria_id,
      subsector_industrial: techData.subsector_industrial,
    }));
    
    // Insert into casos_de_estudio with all original data preserved
    const caseData = {
      name: technology["Nombre de la tecnología"],
      description: technology["Descripción técnica breve"],
      technology_types: [technology["Tipo de tecnología"]],
      sector: technology["Sector y subsector"],
      country: technology["País de origen"],
      entity_type: 'technology',
      source_technology_id: technology.id,
      created_by: user.id,
      original_data: originalData,
    };
    
    const { data: insertedCase, error: insertError } = await supabase
      .from('casos_de_estudio')
      .insert([caseData])
      .select()
      .single();

    if (insertError) {
      setIsMovingToCaseStudy(false);
      toast({
        title: 'Error',
        description: 'No se pudo mover a casos de estudio',
        variant: 'destructive',
      });
      return;
    }

    // Sync to external Supabase
    try {
      await syncCaseStudyInsert({ ...caseData, id: insertedCase.id });
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    // Then delete from technologies
    const { error: deleteError } = await supabase
      .from('technologies')
      .delete()
      .eq('id', technology.id);

    // Sync deletion to external
    try {
      await syncTechnologyDelete(technology.id);
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    setIsMovingToCaseStudy(false);

    if (deleteError) {
      toast({
        title: 'Error',
        description: 'Se creó el caso de estudio pero no se pudo eliminar la tecnología original',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['casos-de-estudio'] });
      toast({
        title: 'Movido a casos de estudio',
        description: 'La tecnología ha sido movida y sincronizada',
      });
      onOpenChange(false);
    }
  };

  // Check if technology is already in review process
  const reviewStatus = (technology as any).review_status;
  const isInReviewProcess = reviewStatus && reviewStatus !== 'none' && reviewStatus !== 'completed';

  const InfoRow = ({ icon: Icon, label, value, isLink = false }: {
    icon: React.ElementType; 
    label: string; 
    value: string | null; 
    isLink?: boolean;
  }) => {
    if (!value) return null;
    
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {isLink ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              {value}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm text-foreground">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-display mb-2">
                {technology["Nombre de la tecnología"]}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <TRLBadge trl={technology["Grado de madurez (TRL)"]} />
                {technology.status && (
                  <Badge variant="outline">{technology.status}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            {hasProjects && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                <FolderPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">Añadir a:</span>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[160px] h-8 text-sm">
                    <SelectValue placeholder="Elige proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {userProjects?.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm"
                  className="h-8"
                  onClick={handleAddToProject}
                  disabled={!selectedProjectId || isAddingToProject}
                >
                  {isAddingToProject ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Añadir'
                  )}
                </Button>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddFavorite}
              disabled={isFavoriting}
            >
              <Star className="w-4 h-4 mr-2" />
              Favorito
            </Button>
            {isInternalUser && !isInReviewProcess && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleSendToReview}
                disabled={isSendingToReview}
              >
                {isSendingToReview ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4 mr-2" />
                )}
                Enviar a revisión
              </Button>
            )}
            {isInternalUser && isInReviewProcess && (
              <Badge variant="outline" className="gap-1 py-1.5">
                <ClipboardList className="w-3 h-3" />
                {reviewStatus === 'pending' ? 'Pendiente de revisión' : 'En revisión'}
              </Badge>
            )}
            {isInternalUser && (
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTrendsConfirm(true)}
                  disabled={isMovingToTrends}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50 h-7 text-xs px-2"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Tendencias
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCaseStudyConfirm(true)}
                  disabled={isMovingToCaseStudy}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 h-7 text-xs px-2"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Caso estudio
                </Button>
              </div>
            )}
          </div>

          {/* General Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Información General
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Building2} label="Proveedor / Empresa" value={technology["Proveedor / Empresa"]} />
              <InfoRow icon={MapPin} label="País de origen" value={technology["País de origen"]} />
              <InfoRow icon={Globe} label="Web de la empresa" value={technology["Web de la empresa"]} isLink />
              <InfoRow icon={Mail} label="Email de contacto" value={technology["Email de contacto"]} />
            </div>
          </div>

          <Separator />

          {/* Classification */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Clasificación
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              {/* Multiple tipos display */}
              <div className="flex items-start gap-3 py-2">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Tipos de tecnología</p>
                  <div className="flex flex-wrap gap-2">
                    {technologyTipos && technologyTipos.length > 0 ? (
                      [...technologyTipos]
                        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                        .map(tt => {
                          const tipo = tipos?.find(t => t.id === tt.tipo_id);
                          if (!tipo) return null;
                          return (
                            <Badge 
                              key={tt.tipo_id} 
                              variant={tt.is_primary ? "default" : "secondary"}
                              className="flex items-center gap-1"
                            >
                              {tt.is_primary && technologyTipos.length > 1 && (
                                <Star className="w-3 h-3 fill-current" />
                              )}
                              <span className="font-mono text-xs opacity-70">{tipo.codigo}</span>
                              {tipo.nombre}
                            </Badge>
                          );
                        })
                    ) : technology["Tipo de tecnología"] ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {technology["Tipo de tecnología"]}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
              <InfoRow icon={Tag} label="Subcategoría" value={technology["Subcategoría"]} />
              <InfoRow icon={Tag} label="Sector y subsector" value={technology["Sector y subsector"]} />
              <InfoRow icon={Tag} label="Aplicación principal" value={technology["Aplicación principal"]} />
            </div>
          </div>

          {/* Description */}
          {technology["Descripción técnica breve"] && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción Técnica
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                  {technology["Descripción técnica breve"]}
                </p>
              </div>
            </>
          )}

          {/* Differentiation */}
          {(technology["Ventaja competitiva clave"] || technology["Porque es innovadora"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Diferenciación
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={Trophy} label="Ventaja competitiva clave" value={technology["Ventaja competitiva clave"]} />
                  <InfoRow icon={Lightbulb} label="Por qué es innovadora" value={technology["Porque es innovadora"]} />
                </div>
              </div>
            </>
          )}

          {/* References */}
          {(technology["Casos de referencia"] || technology["Paises donde actua"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Referencias
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={Trophy} label="Casos de referencia" value={technology["Casos de referencia"]} />
                  <InfoRow icon={MapPin} label="Países donde actúa" value={technology["Paises donde actua"]} />
                </div>
              </div>
            </>
          )}

          {/* Internal - Only visible to internal users */}
          {isInternalUser && (technology["Comentarios del analista"] || technology["Fecha de scouting"] || technology["Estado del seguimiento"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Información Interna
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={MessageSquare} label="Comentarios del analista" value={technology["Comentarios del analista"]} />
                  <InfoRow icon={Calendar} label="Fecha de scouting" value={technology["Fecha de scouting"]} />
                  <InfoRow icon={Tag} label="Estado del seguimiento" value={technology["Estado del seguimiento"]} />
                </div>
              </div>
            </>
          )}

          {/* Metadata - Only visible to internal users */}
          {isInternalUser && (
            <div className="text-xs text-muted-foreground pt-4 border-t flex justify-between">
              <span>Quality Score: {technology.quality_score ?? '—'}</span>
              <span>Actualizado: {new Date(technology.updated_at).toLocaleDateString('es-ES')}</span>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Confirm Move to Trends Dialog */}
      <Dialog open={showTrendsConfirm} onOpenChange={setShowTrendsConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Mover a Tendencias
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-3">
              <p>
                Al confirmar, esta tecnología se convertirá en una <strong>tendencia tecnológica</strong> y:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Se eliminará del catálogo de tecnologías</li>
                <li>Aparecerá en la sección de Tendencias</li>
                <li>Todos los datos se guardarán y podrán recuperarse si la restauras como tecnología</li>
              </ul>
              <p className="text-sm font-medium">
                Usa esta opción para tecnologías que representan categorías o tendencias generales, no productos específicos.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowTrendsConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowTrendsConfirm(false);
                handleMoveToTrends();
              }}
              disabled={isMovingToTrends}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isMovingToTrends ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Confirmar y mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Move to Case Study Dialog */}
      <Dialog open={showCaseStudyConfirm} onOpenChange={setShowCaseStudyConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Mover a Caso de Estudio
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-3">
              <p>
                Al confirmar, esta tecnología se convertirá en un <strong>caso de estudio</strong> y:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Se eliminará del catálogo de tecnologías</li>
                <li>Aparecerá en la sección de Casos de Estudio</li>
                <li>Todos los datos se guardarán y podrán recuperarse si la restauras como tecnología</li>
              </ul>
              <p className="text-sm font-medium">
                Usa esta opción para tecnologías que representan implementaciones reales, proyectos municipales, u organizaciones.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCaseStudyConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowCaseStudyConfirm(false);
                handleMoveToCaseStudy();
              }}
              disabled={isMovingToCaseStudy}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isMovingToCaseStudy ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2" />
              )}
              Confirmar y mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
