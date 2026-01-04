import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  Check,
  X,
  Calendar,
  Tag,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface TechnologyEdit {
  id: string;
  technology_id: string | null;
  proposed_changes: Record<string, unknown>;
  original_data: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  created_by: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  edit_type?: 'create' | 'update' | 'classify';
}

const QualityControl: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEdit, setSelectedEdit] = useState<TechnologyEdit | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const canReview = profile?.role && ['admin', 'supervisor'].includes(profile.role);

  const { data: edits, isLoading } = useQuery({
    queryKey: ['technology-edits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technology_edits')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TechnologyEdit[];
    },
  });

  // Fetch taxonomy classification stats
  const { data: taxonomyStats } = useQuery({
    queryKey: ['taxonomy-classification-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technologies')
        .select('id, tipo_id, subcategoria_id, sector_id');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const withTipo = data?.filter(t => t.tipo_id !== null).length || 0;
      const withSubcategoria = data?.filter(t => t.subcategoria_id !== null).length || 0;
      const withSector = data?.filter(t => t.sector_id !== null).length || 0;
      const fullyClassified = data?.filter(t => t.tipo_id !== null && t.subcategoria_id !== null).length || 0;
      const pending = total - withTipo;
      
      return {
        total,
        withTipo,
        withSubcategoria,
        withSector,
        fullyClassified,
        pending,
        tipoPercentage: total > 0 ? Math.round((withTipo / total) * 100) : 0,
        subcategoriaPercentage: total > 0 ? Math.round((withSubcategoria / total) * 100) : 0,
        sectorPercentage: total > 0 ? Math.round((withSector / total) * 100) : 0,
        fullyClassifiedPercentage: total > 0 ? Math.round((fullyClassified / total) * 100) : 0,
      };
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ editId, action }: { editId: string; action: 'approve' | 'reject' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('review-edit', {
        body: { editId, action },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      // Update review comment locally
      if (reviewComment) {
        await supabase
          .from('technology_edits')
          .update({ review_comments: reviewComment })
          .eq('id', editId);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technology-edits'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast({
        title: variables.action === 'approve' ? 'Edición aprobada' : 'Edición rechazada',
        description: variables.action === 'approve' 
          ? 'Los cambios se han aplicado correctamente' 
          : 'La propuesta ha sido rechazada',
      });
      setReviewModalOpen(false);
      setSelectedEdit(null);
      setReviewComment('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pendingEdits = edits?.filter(e => e.status === 'pending') || [];
  const approvedEdits = edits?.filter(e => e.status === 'approved') || [];
  const rejectedEdits = edits?.filter(e => e.status === 'rejected') || [];

  const openReviewModal = (edit: TechnologyEdit) => {
    setSelectedEdit(edit);
    setReviewModalOpen(true);
    setReviewComment('');
  };

  const getChangedFields = (original: Record<string, unknown>, proposed: Record<string, unknown>) => {
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    
    Object.keys(proposed).forEach(key => {
      if (JSON.stringify(original[key]) !== JSON.stringify(proposed[key])) {
        changes.push({
          field: key,
          oldValue: original[key],
          newValue: proposed[key],
        });
      }
    });
    
    return changes;
  };

  const getEditTypeLabel = (editType: string | undefined) => {
    switch (editType) {
      case 'create': return 'Nueva tecnología';
      case 'classify': return 'Clasificación';
      default: return 'Edición';
    }
  };

  const getEditTypeVariant = (editType: string | undefined): 'default' | 'secondary' | 'outline' => {
    switch (editType) {
      case 'create': return 'default';
      case 'classify': return 'secondary';
      default: return 'outline';
    }
  };

  const EditCard = ({ edit, showActions = false }: { edit: TechnologyEdit; showActions?: boolean }) => {
    const techName = (edit.proposed_changes as any)["Nombre de la tecnología"] || 'Sin nombre';
    const editType = edit.edit_type || 'update';
    
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getEditTypeVariant(editType)} className="text-xs">
                  {getEditTypeLabel(editType)}
                </Badge>
              </div>
              <CardTitle className="text-base line-clamp-1">{techName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3" />
                {new Date(edit.created_at).toLocaleDateString('es-ES')}
              </CardDescription>
            </div>
            <Badge 
              variant={
                edit.status === 'pending' ? 'outline' : 
                edit.status === 'approved' ? 'secondary' : 
                'destructive'
              }
            >
              {edit.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
              {edit.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
              {edit.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
              {edit.status === 'pending' ? 'Pendiente' : edit.status === 'approved' ? 'Aprobado' : 'Rechazado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {edit.comments && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              "{edit.comments}"
            </p>
          )}
          
          {showActions && canReview ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openReviewModal(edit)}>
                <Eye className="w-4 h-4 mr-1" />
                Revisar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => openReviewModal(edit)}>
              <Eye className="w-4 h-4 mr-1" />
              Ver detalles
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7" />
          Control de Calidad
        </h1>
        <p className="text-muted-foreground">
          {canReview 
            ? 'Revisa y aprueba las ediciones propuestas por los analistas'
            : 'Consulta el estado de tus propuestas de edición'
          }
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Taxonomy Classification Stats */}
          {taxonomyStats && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Estado de Clasificación Taxonómica</CardTitle>
                      <CardDescription>Progreso de la nueva taxonomía estandarizada</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {taxonomyStats.fullyClassified.toLocaleString()} clasificadas
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {taxonomyStats.pending.toLocaleString()} pendientes
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Clasificación completa (Tipo + Subcategoría)</span>
                    <span className="text-muted-foreground">
                      {taxonomyStats.fullyClassified.toLocaleString()} / {taxonomyStats.total.toLocaleString()} ({taxonomyStats.fullyClassifiedPercentage}%)
                    </span>
                  </div>
                  <Progress value={taxonomyStats.fullyClassifiedPercentage} className="h-3" />
                </div>

                {/* Detailed Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Con Tipo asignado</span>
                      <span className="font-medium">{taxonomyStats.tipoPercentage}%</span>
                    </div>
                    <Progress value={taxonomyStats.tipoPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {taxonomyStats.withTipo.toLocaleString()} tecnologías
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Con Subcategoría</span>
                      <span className="font-medium">{taxonomyStats.subcategoriaPercentage}%</span>
                    </div>
                    <Progress value={taxonomyStats.subcategoriaPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {taxonomyStats.withSubcategoria.toLocaleString()} tecnologías
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Con Sector</span>
                      <span className="font-medium">{taxonomyStats.sectorPercentage}%</span>
                    </div>
                    <Progress value={taxonomyStats.sectorPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {taxonomyStats.withSector.toLocaleString()} tecnologías
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/technologies" className="gap-2">
                      <Tag className="w-4 h-4" />
                      Clasificar tecnologías
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edits Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pendientes
                {pendingEdits.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingEdits.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Aprobadas
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rechazadas
              </TabsTrigger>
            </TabsList>

          <TabsContent value="pending">
            {pendingEdits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Clock className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No hay ediciones pendientes
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Todas las propuestas de edición han sido revisadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEdits.map(edit => (
                  <EditCard key={edit.id} edit={edit} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedEdits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay ediciones aprobadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedEdits.map(edit => (
                  <EditCard key={edit.id} edit={edit} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedEdits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <XCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay ediciones rechazadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rejectedEdits.map(edit => (
                  <EditCard key={edit.id} edit={edit} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Propuesta de Edición</DialogTitle>
            <DialogDescription>
              {selectedEdit && (
                <>Creada el {new Date(selectedEdit.created_at).toLocaleDateString('es-ES')}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedEdit && (
            <div className="space-y-4">
              {selectedEdit.comments && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Comentario del analista:</p>
                  <p className="text-sm text-muted-foreground">{selectedEdit.comments}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-3">Cambios propuestos:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getChangedFields(
                    selectedEdit.original_data || {}, 
                    selectedEdit.proposed_changes
                  ).map(({ field, oldValue, newValue }) => (
                    <div key={field} className="text-sm border rounded-lg p-3">
                      <p className="font-medium text-foreground mb-1">{field}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-destructive/10 rounded p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Antes:</p>
                          <p className="text-sm line-clamp-3">{String(oldValue || '—')}</p>
                        </div>
                        <div className="bg-accent/10 rounded p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Después:</p>
                          <p className="text-sm line-clamp-3">{String(newValue || '—')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {canReview && selectedEdit.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="review-comment">Comentario de revisión (opcional)</Label>
                  <Textarea
                    id="review-comment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Añade un comentario sobre tu decisión..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {canReview && selectedEdit?.status === 'pending' ? (
              <div className="flex gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  onClick={() => reviewMutation.mutate({ editId: selectedEdit.id, action: 'reject' })}
                  disabled={reviewMutation.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate({ editId: selectedEdit.id, action: 'approve' })}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Aprobar
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityControl;
