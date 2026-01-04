import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TRLBadge } from '@/components/TRLBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardCheck, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle,
  Play,
  Building2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface TechnologyWithReview {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Proveedor / Empresa": string | null;
  "Grado de madurez (TRL)": number | null;
  review_status: string;
  reviewer_id: string | null;
  review_requested_at: string | null;
  review_requested_by: string | null;
}

interface ReviewerProfile {
  user_id: string;
  full_name: string | null;
}

interface DeletionRequest {
  id: string;
  technology_id: string;
  created_by: string;
  created_at: string;
  proposed_changes: { action: string; reason: string };
  comments: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_comments: string | null;
  technology: {
    id: string;
    "Nombre de la tecnología": string;
    "Proveedor / Empresa": string | null;
  } | null;
}

export default function Reviews() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  // Fetch technologies pending review
  const { data: technologies, isLoading } = useQuery({
    queryKey: ['technologies-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technologies')
        .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Proveedor / Empresa", "Grado de madurez (TRL)", review_status, reviewer_id, review_requested_at, review_requested_by')
        .neq('review_status', 'none')
        .order('review_requested_at', { ascending: false });

      if (error) throw error;
      return data as TechnologyWithReview[];
    },
    enabled: isInternalUser,
  });

  // Fetch deletion requests (only for admin/supervisor)
  const canManageDeletions = profile?.role && ['admin', 'supervisor'].includes(profile.role);
  
  const { data: deletionRequests, isLoading: loadingDeletions } = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technology_edits')
        .select(`
          id,
          technology_id,
          created_by,
          created_at,
          proposed_changes,
          comments,
          status,
          review_comments,
          technology:technologies(id, "Nombre de la tecnología", "Proveedor / Empresa")
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter only deletion requests
      const deletions = (data || []).filter((item: any) => {
        const changes = item.proposed_changes as any;
        return changes?.action === 'delete';
      });
      
      return deletions as unknown as DeletionRequest[];
    },
    enabled: canManageDeletions,
  });

  // Fetch reviewer profiles
  const reviewerIds = technologies?.map(t => t.reviewer_id).filter(Boolean) as string[] || [];
  const requesterIds = technologies?.map(t => t.review_requested_by).filter(Boolean) as string[] || [];
  const allUserIds = [...new Set([...reviewerIds, ...requesterIds])];

  const { data: profiles } = useQuery({
    queryKey: ['reviewer-profiles', allUserIds],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', allUserIds);
      if (error) throw error;
      return data as ReviewerProfile[];
    },
    enabled: allUserIds.length > 0,
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const p = profiles?.find(pr => pr.user_id === userId);
    return p?.full_name || 'Usuario';
  };

  // Claim a technology for review
  const claimMutation = useMutation({
    mutationFn: async (techId: string) => {
      const { error } = await supabase
        .from('technologies')
        .update({
          review_status: 'in_review',
          reviewer_id: user?.id,
        })
        .eq('id', techId)
        .eq('review_status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies-reviews'] });
      toast({
        title: 'Revisión asignada',
        description: 'Has tomado esta tecnología para revisar',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo asignar la revisión',
        variant: 'destructive',
      });
    },
  });

  // Complete review
  const completeMutation = useMutation({
    mutationFn: async (techId: string) => {
      const { error } = await supabase
        .from('technologies')
        .update({
          review_status: 'completed',
        })
        .eq('id', techId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies-reviews'] });
      toast({
        title: 'Revisión completada',
        description: 'La tecnología ha sido marcada como revisada',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo completar la revisión',
        variant: 'destructive',
      });
    },
  });

  // Cancel review (release back to pending)
  const cancelMutation = useMutation({
    mutationFn: async (techId: string) => {
      const { error } = await supabase
        .from('technologies')
        .update({
          review_status: 'pending',
          reviewer_id: null,
        })
        .eq('id', techId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technologies-reviews'] });
      toast({
        title: 'Revisión liberada',
        description: 'La tecnología vuelve a estar disponible para revisión',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo liberar la revisión',
        variant: 'destructive',
      });
    },
  });

  // Approve deletion request
  const approveDeletionMutation = useMutation({
    mutationFn: async (request: DeletionRequest) => {
      // First delete the technology
      const { error: deleteError } = await supabase
        .from('technologies')
        .delete()
        .eq('id', request.technology_id);

      if (deleteError) throw deleteError;

      // Then update the edit request status
      const { error: updateError } = await supabase
        .from('technology_edits')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast({
        title: 'Eliminación aprobada',
        description: 'La tecnología ha sido eliminada correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo procesar la eliminación',
        variant: 'destructive',
      });
    },
  });

  // Reject deletion request
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const rejectDeletionMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('technology_edits')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reason,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
      setRejectingId(null);
      setRejectReason('');
      toast({
        title: 'Solicitud rechazada',
        description: 'La solicitud de eliminación ha sido rechazada',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la solicitud',
        variant: 'destructive',
      });
    },
  });

  const pendingTechs = technologies?.filter(t => t.review_status === 'pending') || [];
  const inReviewTechs = technologies?.filter(t => t.review_status === 'in_review') || [];
  const completedTechs = technologies?.filter(t => t.review_status === 'completed') || [];
  const myReviews = inReviewTechs.filter(t => t.reviewer_id === user?.id);
  const pendingDeletions = deletionRequests?.length || 0;

  if (!isInternalUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes acceso a esta sección</p>
      </div>
    );
  }

  const TechnologyReviewCard = ({ tech, showActions = true }: { tech: TechnologyWithReview; showActions?: boolean }) => (
    <Card key={tech.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate">
              {tech["Nombre de la tecnología"]}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{tech["Proveedor / Empresa"] || 'Sin proveedor'}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{tech["Tipo de tecnología"]}</Badge>
              <TRLBadge trl={tech["Grado de madurez (TRL)"]} />
            </div>
            {tech.review_requested_at && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Solicitado: {new Date(tech.review_requested_at).toLocaleDateString('es-ES')}
                {tech.review_requested_by && (
                  <span> por {getProfileName(tech.review_requested_by)}</span>
                )}
              </p>
            )}
            {tech.reviewer_id && tech.review_status === 'in_review' && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Revisando: {getProfileName(tech.reviewer_id)}
                {tech.reviewer_id === user?.id && ' (tú)'}
              </p>
            )}
          </div>
          
          {showActions && (
            <div className="flex flex-col gap-2">
              {tech.review_status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => claimMutation.mutate(tech.id)}
                  disabled={claimMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Tomar
                </Button>
              )}
              {tech.review_status === 'in_review' && tech.reviewer_id === user?.id && (
                <>
                  <Button
                    size="sm"
                    onClick={() => completeMutation.mutate(tech.id)}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Completar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelMutation.mutate(tech.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Liberar
                  </Button>
                </>
              )}
              {tech.review_status === 'completed' && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completada
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Cola de Revisión
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las tecnologías pendientes de revisión
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl">{pendingTechs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En revisión</CardDescription>
            <CardTitle className="text-2xl">{inReviewTechs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mis revisiones</CardDescription>
            <CardTitle className="text-2xl">{myReviews.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-2xl">{completedTechs.length}</CardTitle>
          </CardHeader>
        </Card>
        {canManageDeletions && (
          <Card className={pendingDeletions > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Eliminaciones
              </CardDescription>
              <CardTitle className="text-2xl">{pendingDeletions}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendientes ({pendingTechs.length})
          </TabsTrigger>
          <TabsTrigger value="in_review" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            En revisión ({inReviewTechs.length})
          </TabsTrigger>
          <TabsTrigger value="my_reviews" className="gap-2">
            <User className="w-4 h-4" />
            Mis revisiones ({myReviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completadas ({completedTechs.length})
          </TabsTrigger>
          {canManageDeletions && (
            <TabsTrigger value="deletions" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminaciones ({pendingDeletions})
            </TabsTrigger>
          )}
        </TabsList>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingTechs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay tecnologías pendientes de revisión</p>
                  </CardContent>
                </Card>
              ) : (
                pendingTechs.map(tech => <TechnologyReviewCard key={tech.id} tech={tech} />)
              )}
            </TabsContent>

            <TabsContent value="in_review" className="space-y-4 mt-4">
              {inReviewTechs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay tecnologías en revisión</p>
                  </CardContent>
                </Card>
              ) : (
                inReviewTechs.map(tech => <TechnologyReviewCard key={tech.id} tech={tech} />)
              )}
            </TabsContent>

            <TabsContent value="my_reviews" className="space-y-4 mt-4">
              {myReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tienes revisiones asignadas</p>
                    <p className="text-sm mt-2">Ve a "Pendientes" para tomar una tecnología</p>
                  </CardContent>
                </Card>
              ) : (
                myReviews.map(tech => <TechnologyReviewCard key={tech.id} tech={tech} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedTechs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay revisiones completadas</p>
                  </CardContent>
                </Card>
              ) : (
                completedTechs.map(tech => <TechnologyReviewCard key={tech.id} tech={tech} showActions={false} />)
              )}
            </TabsContent>

            {/* Deletion Requests Tab */}
            {canManageDeletions && (
              <TabsContent value="deletions" className="space-y-4 mt-4">
                {loadingDeletions ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : deletionRequests?.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay solicitudes de eliminación pendientes</p>
                    </CardContent>
                  </Card>
                ) : (
                  deletionRequests?.map((request) => (
                    <Card key={request.id} className="border-destructive/30 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              <Badge variant="destructive" className="text-xs">
                                Solicitud de eliminación
                              </Badge>
                            </div>
                            <h4 className="font-medium text-foreground truncate">
                              {request.technology?.["Nombre de la tecnología"] || 'Tecnología no encontrada'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">
                                {request.technology?.["Proveedor / Empresa"] || 'Sin proveedor'}
                              </span>
                            </div>
                            <div className="mt-3 p-3 bg-muted/50 rounded-md">
                              <p className="text-sm font-medium text-muted-foreground mb-1">Motivo:</p>
                              <p className="text-sm">{(request.proposed_changes as any)?.reason || request.comments}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Solicitado: {new Date(request.created_at).toLocaleDateString('es-ES')}
                              {request.created_by && (
                                <span> por {getProfileName(request.created_by)}</span>
                              )}
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-2 shrink-0">
                            {rejectingId === request.id ? (
                              <div className="w-64 space-y-2">
                                <Textarea
                                  placeholder="Motivo del rechazo..."
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectingId(null);
                                      setRejectReason('');
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => rejectDeletionMutation.mutate({ 
                                      requestId: request.id, 
                                      reason: rejectReason 
                                    })}
                                    disabled={rejectDeletionMutation.isPending || !rejectReason.trim()}
                                  >
                                    Confirmar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => approveDeletionMutation.mutate(request)}
                                  disabled={approveDeletionMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectingId(request.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
