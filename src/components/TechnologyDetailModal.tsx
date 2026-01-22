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
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { comparisonProjectsService } from '@/services/comparisonProjectsService';
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
  Sparkles
} from 'lucide-react';
import { DownloadTechnologyButton } from '@/components/DownloadTechnologyButton';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
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
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Fetch user's active projects from external API
  const { data: userProjects } = useQuery({
    queryKey: ['user-projects-for-add', user?.id],
    queryFn: async () => {
      const response = await comparisonProjectsService.list({ status: 'active' });
      const projects = response.projects || response.data || [];
      // Filter for statuses that allow adding technologies
      return projects.filter((p: any) => 
        ['draft', 'active', 'on_hold'].includes(p.status)
      );
    },
    enabled: !!user && open,
  });

  // Fetch taxonomy tipos
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
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
      const { data, error } = await externalSupabase
        .from('technology_tipos')
        .select('tipo_id, is_primary')
        .eq('technology_id', technology.id);
      if (error) throw error;
      return data as TechnologyTipoRelation[];
    },
    enabled: !!technology?.id && open,
  });

  // Always fetch the latest technology row when modal is open (so enrichment updates show immediately)
  const { data: freshTechnology } = useQuery({
    queryKey: ['technology-detail', technology?.id],
    queryFn: async () => {
      if (!technology?.id) return null;
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('*')
        .eq('id', technology.id)
        .single();
      if (error) throw error;
      return data as Technology;
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
    try {
      await comparisonProjectsService.addTechnology(selectedProjectId, {
        technology_id: technology.id,
      });

      queryClient.invalidateQueries({ queryKey: ['project-technologies'] });
      queryClient.invalidateQueries({ queryKey: ['project-tech-counts'] });
      queryClient.invalidateQueries({ queryKey: ['comparison-project', selectedProjectId] });
      toast({
        title: 'Añadida al proyecto',
        description: 'La tecnología se ha añadido al proyecto',
      });
      setSelectedProjectId('');
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('already')) {
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
    } finally {
      setIsAddingToProject(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!user) return;
    
    setIsFavoriting(true);
    const { error } = await externalSupabase.from('user_favorites').insert({
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
    const { error } = await externalSupabase
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

  // Check if technology is already in review process
  const reviewStatus = technology.review_status;
  const isInReviewProcess = reviewStatus && reviewStatus !== 'none' && reviewStatus !== 'completed';

  const InfoRow = ({
    icon: Icon,
    label,
    value,
    isLink = false,
    showEmpty = false,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null;
    isLink?: boolean;
    showEmpty?: boolean;
  }) => {
    const displayValue = value && String(value).trim().length > 0 ? value : null;
    if (!displayValue && !showEmpty) return null;

    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {isLink ? (
            displayValue ? (
              <a
                href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-secondary hover:underline flex items-center gap-1"
              >
                {displayValue}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )
          ) : (
            <p className={displayValue ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
              {displayValue ?? '—'}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Use fresh technology data if available, otherwise fall back to prop
  const t = freshTechnology ?? technology;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="tech-detail-description">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-display mb-2">
                {t.nombre}
              </DialogTitle>
              <DialogDescription id="tech-detail-description" className="sr-only">
                Detalles de la tecnología {t.nombre}
              </DialogDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <TRLBadge trl={t.trl} />
                {t.status && (
                  <Badge variant="outline">{t.status}</Badge>
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
            <DownloadTechnologyButton technology={t} variant="full" />
            {isInternalUser && (
              <AIEnrichmentButton
                technology={{
                  id: t.id,
                  nombre: t.nombre,
                  proveedor: t.proveedor || '',
                  web: t.web || '',
                  pais: t.pais || '',
                  tipo: t.tipo || '',
                  subcategoria: t.subcategorias?.[0] || '',
                  sector: t.sector || '',
                  descripcion: t.descripcion || '',
                  aplicacion: t.aplicacion || '',
                  ventaja: t.ventaja || '',
                  innovacion: t.innovacion || '',
                  trl: t.trl ?? null,
                  casos_referencia: t.casos_referencia || '',
                  paises_actua: t.paises_actua || '',
                  comentarios: t.comentarios || '',
                }}
                onEnrichmentComplete={async (enrichedData) => {
                  const updates: Record<string, any> = {};
                  if (typeof enrichedData.descripcion === 'string') updates.descripcion = enrichedData.descripcion;
                  if (typeof enrichedData.aplicacion === 'string') updates.aplicacion = enrichedData.aplicacion;
                  if (typeof enrichedData.ventaja === 'string') updates.ventaja = enrichedData.ventaja;
                  if (typeof enrichedData.innovacion === 'string') updates.innovacion = enrichedData.innovacion;
                  if (typeof enrichedData.casos_referencia === 'string') updates.casos_referencia = enrichedData.casos_referencia;
                  if (typeof enrichedData.paises_actua === 'string') updates.paises_actua = enrichedData.paises_actua;
                  if (typeof enrichedData.comentarios === 'string') updates.comentarios = enrichedData.comentarios;
                  if (typeof enrichedData.trl === 'number') updates.trl = enrichedData.trl;

                  if (Object.keys(updates).length === 0) {
                    toast({
                      title: 'Sin cambios',
                      description: 'La IA no devolvió campos actualizables',
                    });
                    return;
                  }

                  const { error } = await externalSupabase
                    .from('technologies')
                    .update(updates)
                    .eq('id', t.id);

                  if (error) {
                    toast({
                      title: 'Error',
                      description: 'No se pudo guardar el enriquecimiento en la base de datos',
                      variant: 'destructive',
                    });
                    return;
                  }

                  queryClient.invalidateQueries({ queryKey: ['technologies'] });
                  queryClient.invalidateQueries({ queryKey: ['technology-detail', t.id] });
                  toast({
                    title: 'Ficha actualizada',
                    description: 'Se guardaron los campos enriquecidos',
                  });
                }}
              />
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
                {reviewStatus === 'in_review' ? 'En revisión' : 'En proceso'}
              </Badge>
            )}
          </div>

          {/* General Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Información General
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Building2} label="Proveedor / Empresa" value={t.proveedor} showEmpty />
              <InfoRow icon={MapPin} label="País de origen" value={t.pais} showEmpty />
              <InfoRow icon={Globe} label="Web de la empresa" value={t.web} isLink showEmpty />
              <InfoRow icon={Mail} label="Email de contacto" value={t.email} showEmpty />
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
              {/* Tipos from array or legacy text */}
              <div className="flex items-start gap-3 py-2">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Tipos de tecnología</p>
                  <div className="flex flex-wrap gap-1">
                    {t.tipos && t.tipos.length > 0 ? (
                      t.tipos.map((tipo, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tipo}
                        </Badge>
                      ))
                    ) : t.tipo ? (
                      <Badge variant="secondary" className="text-xs">{t.tipo}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subcategorias from array */}
              {(t.subcategorias && t.subcategorias.length > 0) && (
                <div className="flex items-start gap-3 py-2">
                  <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Subcategorías</p>
                    <div className="flex flex-wrap gap-1">
                      {t.subcategorias.map((sub, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {sub}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <InfoRow icon={Tag} label="Sector" value={t.sector} showEmpty />
            </div>
          </div>

          <Separator />

          {/* Technical Description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descripción Técnica
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={FileText} label="Descripción técnica breve" value={t.descripcion} showEmpty />
              <InfoRow icon={Lightbulb} label="Aplicación principal" value={t.aplicacion} showEmpty />
            </div>
          </div>

          <Separator />

          {/* Differentiation */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Diferenciación
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Trophy} label="Ventaja competitiva" value={t.ventaja} showEmpty />
              <InfoRow icon={Sparkles} label="Por qué es innovadora" value={t.innovacion} showEmpty />
            </div>
          </div>

          <Separator />

          {/* References */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referencias
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Users} label="Casos de referencia" value={t.casos_referencia} showEmpty />
              <InfoRow icon={MapPin} label="Países donde actúa" value={t.paises_actua} showEmpty />
            </div>
          </div>

          {/* Internal info (only for internal users) */}
          {isInternalUser && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Información Interna
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={MessageSquare} label="Comentarios del analista" value={t.comentarios} showEmpty />
                  <InfoRow icon={Calendar} label="Fecha de scouting" value={t.fecha_scouting} showEmpty />
                  <InfoRow icon={Tag} label="Estado del seguimiento" value={t.estado_seguimiento} showEmpty />
                  {t.quality_score !== null && t.quality_score !== undefined && (
                    <div className="flex items-start gap-3 py-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Quality Score</p>
                        <Badge variant={t.quality_score >= 70 ? 'default' : 'secondary'}>
                          {t.quality_score}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>Última actualización: {t.updated_at ? new Date(t.updated_at).toLocaleDateString('es-ES') : '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
