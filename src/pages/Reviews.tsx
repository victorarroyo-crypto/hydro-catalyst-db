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
  Building2
} from 'lucide-react';

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

  const pendingTechs = technologies?.filter(t => t.review_status === 'pending') || [];
  const inReviewTechs = technologies?.filter(t => t.review_status === 'in_review') || [];
  const completedTechs = technologies?.filter(t => t.review_status === 'completed') || [];
  const myReviews = inReviewTechs.filter(t => t.reviewer_id === user?.id);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </>
        )}
      </Tabs>
    </div>
  );
}
