import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Radar, 
  Building2,
  MapPin,
  Rocket,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  Send,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { TRLBadge } from '@/components/TRLBadge';
import { ScoutingTechFormModal } from '@/components/ScoutingTechFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  useScoutingQueue,
  useActiveScoutingQueue,
  useRejectedTechnologies,
  useChangeScoutingStatus,
  useApproveToTechnologies,
  useMoveToRejected,
  useScoutingCounts
} from '@/hooks/useScoutingData';
import { QueueItemUI } from '@/types/scouting';

// Score badge color helper
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500/20 text-green-600 border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
  if (score >= 40) return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
  return 'bg-red-500/20 text-red-600 border-red-500/30';
};

const Scouting = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionFilter = searchParams.get('session');
  
  const [queueFilter, setQueueFilter] = useState('all');
  const [selectedTech, setSelectedTech] = useState<QueueItemUI | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ tech: QueueItemUI; stage: 'analyst' | 'supervisor' | 'admin' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalDialog, setApprovalDialog] = useState<{ tech: QueueItemUI; action: 'send' | 'approve' } | null>(null);
  const [approvalEmail, setApprovalEmail] = useState('');

  // Local Supabase queries for scouting_queue (Lovable Cloud)
  const { data: activeItems = [], isLoading: activeLoading, refetch: refetchActive } = useActiveScoutingQueue();
  const { data: reviewItems = [], isLoading: reviewLoading, refetch: refetchReview } = useScoutingQueue('review');
  const { data: pendingApprovalItems = [], isLoading: pendingApprovalLoading, refetch: refetchPendingApproval } = useScoutingQueue('pending_approval');
  const { data: rejectedTechs = [] } = useRejectedTechnologies();
  const { data: counts, refetch: refetchCounts } = useScoutingCounts();

  // Invalidate cache when session filter changes to ensure fresh data
  useEffect(() => {
    if (sessionFilter) {
      console.log('[Scouting] Session filter detected, invalidating cache:', sessionFilter);
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['active-scouting-queue'] });
    }
  }, [sessionFilter, queryClient]);

  // Filtered items based on queueFilter and sessionFilter
  const filteredQueueItems = useMemo(() => {
    let items: QueueItemUI[];
    if (queueFilter === 'all') items = activeItems;
    else if (queueFilter === 'review') items = reviewItems;
    else if (queueFilter === 'pending_approval') items = pendingApprovalItems;
    else items = activeItems;
    
    // Filter by session if sessionFilter is set
    if (sessionFilter) {
      items = items.filter(item => item.scouting_job_id === sessionFilter);
    }
    
    return items;
  }, [queueFilter, activeItems, reviewItems, pendingApprovalItems, sessionFilter]);

  // Debug logging for session filter
  console.log('[Scouting] Filter state:', {
    sessionFilter,
    queueFilter,
    activeItemsCount: activeItems.length,
    activeItemsWithJobId: activeItems.filter(i => i.scouting_job_id).length,
    filteredCount: filteredQueueItems.length,
    sampleItems: activeItems.slice(0, 3).map(i => ({
      name: i.name,
      scouting_job_id: i.scouting_job_id
    }))
  });

  // Clear session filter function
  const clearSessionFilter = () => {
    searchParams.delete('session');
    setSearchParams(searchParams);
  };

  const isQueueLoading = queueFilter === 'all' ? activeLoading : 
    queueFilter === 'review' ? reviewLoading : pendingApprovalLoading;

  // Mutations
  const changeStatusMutation = useChangeScoutingStatus();
  const approveToDbMutation = useApproveToTechnologies();
  const moveToRejectedMutation = useMoveToRejected();

  // User role checks
  const isAnalyst = profile?.role === 'analyst';
  const isSupervisorOrAdmin = profile?.role === 'supervisor' || profile?.role === 'admin';
  const userId = user?.id || '';
  const userEmail = user?.email || '';

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate user has valid ID before operations
  const validateUserId = (): boolean => {
    if (!userId) {
      toast.error('Usuario no identificado', {
        description: 'No se puede completar la operación. Por favor, vuelve a iniciar sesión.',
      });
      return false;
    }
    return true;
  };

  // Handle opening approval dialog for sending to approval
  const handleOpenSendToApproval = (tech: QueueItemUI) => {
    setApprovalEmail(userEmail);
    setApprovalDialog({ tech, action: 'send' });
  };

  // Handle opening approval dialog for final approval
  const handleOpenApproveToDb = (tech: QueueItemUI) => {
    setApprovalEmail(userEmail);
    setApprovalDialog({ tech, action: 'approve' });
  };

  // Handle confirm approval action
  const handleConfirmApproval = () => {
    if (!approvalDialog) return;
    
    if (!approvalEmail || !isValidEmail(approvalEmail)) {
      toast.error('Email inválido', {
        description: 'Por favor, introduce un email válido para continuar.',
      });
      return;
    }

    if (approvalDialog.action === 'send') {
      changeStatusMutation.mutate({
        id: approvalDialog.tech.id,
        status: 'pending_approval',
      }, {
        onSuccess: () => {
          setApprovalDialog(null);
          setApprovalEmail('');
        }
      });
    } else {
      approveToDbMutation.mutate({
        scoutingId: approvalDialog.tech.id,
        approvedBy: userEmail,
        approverId: userId, // UUID del usuario
      }, {
        onSuccess: () => {
          setApprovalDialog(null);
          setApprovalEmail('');
        }
      });
    }
  };

  // Handle rejection confirmation
  const handleConfirmRejection = () => {
    if (!rejectionDialog || !rejectionReason.trim()) {
      toast.error('Debes indicar una razón de rechazo');
      return;
    }
    
    if (!validateUserId()) return;
    
    moveToRejectedMutation.mutate({
      scoutingId: rejectionDialog.tech.id,
      rejectionReason: rejectionReason.trim(),
      rejectionStage: rejectionDialog.stage,
    }, {
      onSuccess: () => {
        setRejectionDialog(null);
        setRejectionReason('');
      }
    });
  };

  // Render technology card
  const renderTechCard = (item: QueueItemUI, sectionId: string) => (
    <Card 
      key={item.id} 
      className="hover:shadow-md transition-all border cursor-pointer"
      onClick={() => {
        setSelectedTech(item);
        setShowFormModal(true);
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {item.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="w-3 h-3" />
              {item.provider || 'Sin proveedor'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {item.trl > 0 && <TRLBadge trl={item.trl} />}
            {item.score > 0 && (
              <Badge className={getScoreColor(item.score)}>
                {item.score}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {item.description || 'Sin descripción'}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {item.country || 'País no especificado'}
        </div>

        {item.suggestedType && (
          <Badge variant="outline" className="text-xs">
            {item.suggestedType}
          </Badge>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
          {sectionId === 'review' && (
            <>
              {(isAnalyst || isSupervisorOrAdmin) && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleOpenSendToApproval(item)}
                  disabled={changeStatusMutation.isPending}
                  className="flex-1"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Enviar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectionDialog({ tech: item, stage: 'analyst' })}
                disabled={moveToRejectedMutation.isPending}
                className="text-destructive"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
          {sectionId === 'pending_approval' && isSupervisorOrAdmin && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleOpenApproveToDb(item)}
                disabled={approveToDbMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectionDialog({ tech: item, stage: 'supervisor' })}
                disabled={moveToRejectedMutation.isPending}
                className="text-destructive"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Radar className="w-8 h-8 text-primary" />
            Cola de Revisión
          </h1>
          <p className="text-muted-foreground mt-1">
            Revisa y aprueba las tecnologías encontradas por el scouting
          </p>
        </div>
        <Button asChild>
          <Link to="/scouting/new">
            <Rocket className="w-4 h-4 mr-2" />
            Nueva Búsqueda
          </Link>
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>En revisión</CardDescription>
            <Eye className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {counts?.review ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pendiente aprobación</CardDescription>
            <Send className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {counts?.pending_approval ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Rechazadas</CardDescription>
            <Ban className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {counts?.rejected ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total activas</CardDescription>
            <Radar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(counts?.review ?? 0) + (counts?.pending_approval ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Content */}
      <div className="space-y-4">
        {/* Session filter banner */}
        {sessionFilter && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-primary" />
              <span className="text-sm">
                Mostrando tecnologías de la sesión: <code className="font-mono bg-muted px-1 rounded">{sessionFilter.slice(0, 8)}...</code>
              </span>
              <Badge variant="secondary">{filteredQueueItems.length} resultado{filteredQueueItems.length !== 1 ? 's' : ''}</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearSessionFilter}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Ver todas
            </Button>
          </div>
        )}

        <div className="mb-4">
          <p className="text-muted-foreground">
            Las tecnologías pasan por un proceso de revisión antes de añadirse a la base de datos principal.
          </p>
        </div>

        {/* Queue Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={queueFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueueFilter('all')}
            className="flex items-center gap-2"
          >
            <Radar className="w-4 h-4" />
            Todas
            <Badge variant="secondary" className="ml-1 text-xs">
              {(counts?.review ?? 0) + (counts?.pending_approval ?? 0)}
            </Badge>
          </Button>
          <Button
            variant={queueFilter === 'review' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueueFilter('review')}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-blue-500" />
            En Revisión
            <Badge variant="secondary" className="ml-1 text-xs bg-blue-500/20 text-blue-600">
              {counts?.review ?? 0}
            </Badge>
          </Button>
          <Button
            variant={queueFilter === 'pending_approval' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueueFilter('pending_approval')}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4 text-orange-500" />
            Pendiente Aprobación
            <Badge variant="secondary" className="ml-1 text-xs bg-orange-500/20 text-orange-600">
              {counts?.pending_approval ?? 0}
            </Badge>
          </Button>
          
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchActive();
              refetchReview();
              refetchPendingApproval();
              refetchCounts();
            }}
            disabled={isQueueLoading}
            className="ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isQueueLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Queue Items Grid */}
        {isQueueLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredQueueItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQueueItems.map((item) => {
              const itemStatus = item.queue_status || item.status || 'review';
              const sectionId = itemStatus === 'pending_approval' ? 'pending_approval' : 'review';
              return renderTechCard(item, sectionId);
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Radar className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin tecnologías pendientes</h3>
              <p className="text-muted-foreground text-center mb-4">
                No hay tecnologías en la cola de revisión.
              </p>
              <Button asChild>
                <Link to="/scouting/new">
                  <Rocket className="w-4 h-4 mr-2" />
                  Nueva Búsqueda
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rejected Technologies Section */}
        {rejectedTechs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Tecnologías Rechazadas ({rejectedTechs.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedTechs.slice(0, 6).map((tech: any) => (
                <Card key={tech.id} className="border-red-200 bg-red-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium truncate">
                      {tech.nombre || tech["Nombre de la tecnología"]}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {tech.proveedor || tech["Proveedor / Empresa"] || 'Sin proveedor'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-red-600 line-clamp-2">
                      <strong>Razón:</strong> {tech.rejection_reason}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Technology Form Modal */}
      {selectedTech && (
        <ScoutingTechFormModal
          technology={selectedTech}
          open={showFormModal}
          onOpenChange={(open) => {
            setShowFormModal(open);
            if (!open) setSelectedTech(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
          }}
        />
      )}

      {/* Approval Dialog with editable email */}
      <AlertDialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog?.action === 'send' ? 'Enviar a aprobación' : 'Aprobar tecnología'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog?.action === 'send' 
                ? <>Vas a enviar <strong>"{approvalDialog?.tech.name}"</strong> para aprobación del supervisor.</>
                : <>Vas a aprobar <strong>"{approvalDialog?.tech.name}"</strong> y añadirla a la base de datos principal.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-medium">
              Email del revisor <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={approvalEmail}
              onChange={(e) => setApprovalEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {approvalEmail && !isValidEmail(approvalEmail) && (
              <p className="text-xs text-destructive">Por favor, introduce un email válido</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalEmail('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApproval}
              disabled={!approvalEmail || !isValidEmail(approvalEmail) || changeStatusMutation.isPending || approveToDbMutation.isPending}
              className={approvalDialog?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {(changeStatusMutation.isPending || approveToDbMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : approvalDialog?.action === 'send' ? (
                <Send className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {approvalDialog?.action === 'send' ? 'Enviar' : 'Aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={!!rejectionDialog} onOpenChange={() => setRejectionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de rechazar <strong>"{rejectionDialog?.tech.name}"</strong>. 
              Esta acción moverá la tecnología a la lista de rechazadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Razón del rechazo <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Indica el motivo por el que se rechaza esta tecnología..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRejection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectionReason.trim() || moveToRejectedMutation.isPending}
            >
              {moveToRejectedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Scouting;
