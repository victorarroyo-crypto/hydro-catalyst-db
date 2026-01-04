import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TRLBadge } from '@/components/TRLBadge';
import { Skeleton } from '@/components/ui/skeleton';
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
  ShieldCheck,
  ClipboardCheck, 
  ClipboardList,
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
  Play,
  Building2,
  User,
  Trash2,
  AlertTriangle,
  Edit,
} from 'lucide-react';

// ============ TYPES ============

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

// ============ MAIN COMPONENT ============

const QualityControl: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // State
  const [selectedEdit, setSelectedEdit] = useState<TechnologyEdit | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('approvals');

  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);
  const canReview = profile?.role && ['admin', 'supervisor'].includes(profile.role);

  // ============ DATA FETCHING ============

  // Fetch technology edits (approvals)
  const { data: edits, isLoading: loadingEdits } = useQuery({
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

  // Fetch technologies pending review - paginated to get all
  const { data: technologies, isLoading: loadingReviews } = useQuery({
    queryKey: ['technologies-reviews'],
    queryFn: async () => {
      const allTechnologies: TechnologyWithReview[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('technologies')
          .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Proveedor / Empresa", "Grado de madurez (TRL)", review_status, reviewer_id, review_requested_at, review_requested_by')
          .neq('review_status', 'none')
          .order('review_requested_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allTechnologies.push(...(data as TechnologyWithReview[]));
        
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      return allTechnologies;
    },
    enabled: isInternalUser,
  });

  // Fetch deletion requests
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
      
      const deletions = (data || []).filter((item: any) => {
        const changes = item.proposed_changes as any;
        return changes?.action === 'delete';
      });
      
      return deletions as unknown as DeletionRequest[];
    },
    enabled: canReview,
  });

  // Fetch taxonomy classification stats - paginated to bypass 1000 row limit
  const { data: taxonomyStats } = useQuery({
    queryKey: ['taxonomy-classification-stats'],
    queryFn: async () => {
      const allTechnologies: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('technologies')
          .select('id, tipo_id, subcategoria_id, sector_id')
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allTechnologies.push(...data);
        
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      const total = allTechnologies.length;
      const withTipo = allTechnologies.filter(t => t.tipo_id !== null).length;
      const withSubcategoria = allTechnologies.filter(t => t.subcategoria_id !== null).length;
      const withSector = allTechnologies.filter(t => t.sector_id !== null).length;
      const fullyClassified = allTechnologies.filter(t => t.tipo_id !== null && t.subcategoria_id !== null).length;
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

  // ============ MUTATIONS ============

  // Review edit mutation (approve/reject)
  const reviewMutation = useMutation({
    mutationFn: async ({ editId, action }: { editId: string; action: 'approve' | 'reject' }) => {
      const response = await supabase.functions.invoke('review-edit', {
        body: { editId, action },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
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
      const { error: deleteError } = await supabase
        .from('technologies')
        .delete()
        .eq('id', request.technology_id);

      if (deleteError) throw deleteError;

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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-edits-dashboard'] });
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

  // ============ COMPUTED DATA ============

  const pendingEdits = edits?.filter(e => e.status === 'pending' && (e.proposed_changes as any)?.action !== 'delete') || [];
  const approvedEdits = edits?.filter(e => e.status === 'approved') || [];
  const rejectedEdits = edits?.filter(e => e.status === 'rejected') || [];

  const pendingTechs = technologies?.filter(t => t.review_status === 'pending') || [];
  const inReviewTechs = technologies?.filter(t => t.review_status === 'in_review') || [];
  const completedTechs = technologies?.filter(t => t.review_status === 'completed') || [];
  const myReviews = inReviewTechs.filter(t => t.reviewer_id === user?.id);

  const pendingDeletions = deletionRequests?.length || 0;

  // Total pending items for badge
  const totalPending = pendingEdits.length + pendingTechs.length + pendingDeletions;

  // ============ HELPER FUNCTIONS ============

  const openReviewModal = (edit: TechnologyEdit) => {
    setSelectedEdit(edit);
    setReviewModalOpen(true);
    setReviewComment('');
  };

  const handleEditTechnology = (techId: string) => {
    navigate(`/technologies?edit=${techId}`);
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

  // ============ SUB-COMPONENTS ============

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

  const TechnologyReviewCard = ({ tech, showActions = true }: { tech: TechnologyWithReview; showActions?: boolean }) => {
    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {tech["Nombre de la tecnología"]}
                </h4>
                <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">{tech["Tipo de tecnología"]}</Badge>
                <TRLBadge trl={tech["Grado de madurez (TRL)"]} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {tech["Proveedor / Empresa"] || 'Sin proveedor'}
                </span>
                {tech.review_requested_at && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(tech.review_requested_at).toLocaleDateString('es-ES')}
                  </span>
                )}
                {tech.reviewer_id && tech.review_status === 'in_review' && (
                  <span className="flex items-center gap-1 text-primary shrink-0">
                    <User className="w-3 h-3" />
                    {tech.reviewer_id === user?.id ? 'Tú' : getProfileName(tech.reviewer_id)}
                  </span>
                )}
              </div>
            </div>
            
            {showActions && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditTechnology(tech.id)}
                  className="h-8 px-2"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                {tech.review_status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => claimMutation.mutate(tech.id)}
                    disabled={claimMutation.isPending}
                    className="h-8"
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
                      className="h-8"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelMutation.mutate(tech.id)}
                      disabled={cancelMutation.isPending}
                      className="h-8 px-2"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {tech.review_status === 'completed' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
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
  };

  // ============ RENDER ============

  if (!isInternalUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes acceso a esta sección</p>
      </div>
    );
  }

  const isLoading = loadingEdits || loadingReviews;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7" />
          Centro de Supervisión
        </h1>
        <p className="text-muted-foreground">
          {canReview 
            ? 'Gestiona aprobaciones, revisiones de calidad y solicitudes de eliminación'
            : 'Consulta el estado de tus propuestas y revisiones'
          }
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className={pendingEdits.length > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3" />
              Aprobaciones
            </CardDescription>
            <CardTitle className="text-2xl">{pendingEdits.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendingTechs.length > 0 ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              Cola de Revisión
            </CardDescription>
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
        {canReview && (
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Clasificación completa (Tipo + Subcategoría)</span>
                    <span className="text-muted-foreground">
                      {taxonomyStats.fullyClassified.toLocaleString()} / {taxonomyStats.total.toLocaleString()} ({taxonomyStats.fullyClassifiedPercentage}%)
                    </span>
                  </div>
                  <Progress value={taxonomyStats.fullyClassifiedPercentage} className="h-3" />
                </div>

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

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-2">
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Aprobaciones
                {pendingEdits.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingEdits.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="review-queue" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Cola de Revisión
                {pendingTechs.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingTechs.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="my-reviews" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Mis Revisiones
                {myReviews.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{myReviews.length}</Badge>
                )}
              </TabsTrigger>
              {canReview && (
                <TabsTrigger value="deletions" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Eliminaciones
                  {pendingDeletions > 0 && (
                    <Badge variant="destructive" className="ml-1">{pendingDeletions}</Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            {/* Approvals Tab */}
            <TabsContent value="approvals">
              {pendingEdits.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ClipboardCheck className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No hay aprobaciones pendientes
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

            {/* Review Queue Tab */}
            <TabsContent value="review-queue" className="space-y-4">
              {pendingTechs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ClipboardList className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No hay tecnologías en cola
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      No hay tecnologías pendientes de revisión de calidad.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pendingTechs.map(tech => (
                    <TechnologyReviewCard key={tech.id} tech={tech} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Reviews Tab */}
            <TabsContent value="my-reviews" className="space-y-4">
              {myReviews.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <User className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No tienes revisiones asignadas
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Ve a "Cola de Revisión" para tomar una tecnología.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {myReviews.map(tech => (
                    <TechnologyReviewCard key={tech.id} tech={tech} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Deletions Tab */}
            {canReview && (
              <TabsContent value="deletions" className="space-y-4">
                {loadingDeletions ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : deletionRequests?.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Trash2 className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No hay solicitudes de eliminación
                      </h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        No hay tecnologías pendientes de eliminar.
                      </p>
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

            {/* History Tab */}
            <TabsContent value="history">
              <Tabs defaultValue="approved" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="approved">Aprobadas</TabsTrigger>
                  <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
                  <TabsTrigger value="completed">Revisiones completadas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="approved">
                  {approvedEdits.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No hay ediciones aprobadas</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {approvedEdits.slice(0, 12).map(edit => (
                        <EditCard key={edit.id} edit={edit} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rejected">
                  {rejectedEdits.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <XCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No hay ediciones rechazadas</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rejectedEdits.slice(0, 12).map(edit => (
                        <EditCard key={edit.id} edit={edit} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {completedTechs.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No hay revisiones completadas</p>
                      </CardContent>
                    </Card>
                  ) : (
                    completedTechs.slice(0, 10).map(tech => <TechnologyReviewCard key={tech.id} tech={tech} showActions={false} />)
                  )}
                </TabsContent>
              </Tabs>
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
