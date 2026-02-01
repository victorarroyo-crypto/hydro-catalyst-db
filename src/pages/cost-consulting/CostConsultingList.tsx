import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, TrendingDown, Building2, BarChart3, Coins, Loader2, StopCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCostProjects, useCostStats } from '@/hooks/useCostConsultingData';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '€0';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; hasSpinner?: boolean }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    uploading: { label: 'Subiendo...', variant: 'outline', hasSpinner: true },
    extracting: { label: 'Extrayendo...', variant: 'outline', hasSpinner: true },
    review: { label: 'En revisión', variant: 'default' },
    processing: { label: 'Procesando...', variant: 'outline', hasSpinner: true },
    analyzing: { label: 'Analizando...', variant: 'outline', hasSpinner: true },
    completed: { label: 'Completado', variant: 'default' },
    failed: { label: 'Error', variant: 'destructive' },
    archived: { label: 'Archivado', variant: 'secondary' },
  };
  
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };
  
  const colorClasses: Record<string, string> = {
    draft: '',
    uploading: 'bg-blue-500/10 text-blue-600 border-blue-200',
    extracting: 'bg-blue-500/10 text-blue-600 border-blue-200',
    review: 'bg-orange-500/10 text-orange-600 border-orange-200',
    processing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    analyzing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    failed: '',
    archived: '',
  };
  
  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${colorClasses[status] || ''}`}>
      {config.hasSpinner && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </Badge>
  );
};

const CostConsultingList = () => {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useCostProjects(user?.id);
  const { data: stats } = useCostStats(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCancelWork = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCancellingId(projectId);
    try {
      // Cancel all pending/processing documents for this project
      await externalSupabase
        .from('cost_project_documents')
        .update({ status: 'cancelled' })
        .eq('project_id', projectId)
        .in('status', ['pending', 'processing']);
      
      // Update project status to draft
      await externalSupabase
        .from('cost_consulting_projects')
        .update({ status: 'draft' })
        .eq('id', projectId);
      
      toast.success('Trabajo cancelado');
      queryClient.invalidateQueries({ queryKey: ['cost-projects'] });
    } catch (error) {
      toast.error('Error al cancelar el trabajo');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      // CASCADE DELETE in correct order:
      // 1. Delete chunks first (no FK cascade from external DB)
      await externalSupabase
        .from('cost_document_chunks')
        .delete()
        .eq('project_id', projectId);
      
      // 2. Delete documents
      await externalSupabase
        .from('cost_project_documents')
        .delete()
        .eq('project_id', projectId);
      
      // 3. Delete contracts
      await externalSupabase
        .from('cost_project_contracts')
        .delete()
        .eq('project_id', projectId);
      
      // 4. Delete invoices
      await externalSupabase
        .from('cost_project_invoices')
        .delete()
        .eq('project_id', projectId);
      
      // 5. Delete suppliers
      await externalSupabase
        .from('cost_project_suppliers')
        .delete()
        .eq('project_id', projectId);
      
      // 6. Finally delete the project
      await externalSupabase
        .from('cost_consulting_projects')
        .delete()
        .eq('id', projectId);
      
      toast.success('Análisis eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['cost-projects'] });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Error al eliminar el análisis');
    } finally {
      setDeletingId(null);
    }
  };

  const hasProjects = projects.length > 0;

  // Calculate quick wins from projects
  const totalQuickWins = projects.reduce((sum, p) => sum + (p.quick_wins_count || 0), 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consultoría de Costes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona análisis de costes y optimización para tus clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/cost-consulting/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Análisis
          </Link>
        </Button>
      </div>

      {/* Stats Cards - only show if there are projects */}
      {hasProjects && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análisis Activos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.projects || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorro Identificado</CardTitle>
              <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats?.savings || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.suppliers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Wins</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuickWins}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!hasProjects && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-6 mb-6">
              <Coins className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Aún no tienes análisis de costes
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Sube tus contratos y facturas para identificar oportunidades de ahorro
            </p>
            <Button size="lg" asChild>
              <Link to="/cost-consulting/new">
                <Plus className="h-5 w-5 mr-2" />
                Crear primer análisis
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {hasProjects && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isProcessing = ['processing', 'uploading', 'analyzing'].includes(project.status);
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow h-full">
                <Link to={`/cost-consulting/${project.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription>{project.client_name || 'Sin cliente'}</CardDescription>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Gasto analizado</p>
                        <p className="font-semibold">{formatCurrency(project.total_spend_analyzed)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ahorro identificado</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(project.total_savings_identified)}
                          {project.savings_pct && ` (${project.savings_pct.toFixed(1)}%)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {project.opportunities_count || 0} oportunidades
                        {project.quick_wins_count ? ` (${project.quick_wins_count} quick wins)` : ''}
                      </span>
                    </div>
                    {project.cost_verticals && (
                      <Badge variant="outline" className="w-fit">
                        {project.cost_verticals.icon} {project.cost_verticals.name}
                      </Badge>
                    )}
                  </CardContent>
                </Link>
                
                {/* Action Buttons */}
                <CardContent className="pt-0 pb-4">
                  <div className="flex gap-2">
                    {isProcessing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleCancelWork(project.id, e)}
                        disabled={cancellingId === project.id}
                        className="text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300"
                      >
                        {cancellingId === project.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <StopCircle className="h-4 w-4 mr-1" />
                        )}
                        Cancelar
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Borrar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar análisis?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará el análisis "{project.name}" y todos sus documentos asociados. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProject(project.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === project.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CostConsultingList;
