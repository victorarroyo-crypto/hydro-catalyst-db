import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Building2,
  MapPin,
  Loader2,
  BookPlus,
  BookCheck,
  LayoutDashboard,
  FileText,
  Cpu,
  Droplets,
  Search,
  GitBranch,
  Network,
  FileOutput,
  Settings,
  ClipboardList,
  FlaskConical
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import WorkflowProgress from '@/components/consultoria/WorkflowProgress';
import {
  OverviewTab,
  DocumentsTab,
  WorkflowsTab,
  FindingsTab,
  WaterBalanceTab,
  ScenariosTab,
  DiagramsTab,
  ReportsTab,
  SettingsTab,
} from '@/components/consultoria/tabs';

interface ProjectData {
  id: string;
  name: string;
  client_name: string | null;
  plant_name: string | null;
  status: string;
  progress_percentage: number;
  published_to_kb?: boolean;
}

interface DashboardData {
  project: ProjectData;
  stats: {
    documents_count: number;
    opportunities_count: number;
    critical_risks: number;
    total_potential_savings: number;
  };
  water_balance: {
    total_intake_m3_day: number;
    total_water_cost_annual: number;
    water_efficiency_percent: number;
  } | null;
  recent_workflows: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
  }>;
}

const PROJECT_TABS = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'workflows', label: 'Análisis', icon: Cpu },
  { id: 'water-balance', label: 'Balance', icon: Droplets },
  { id: 'findings', label: 'Hallazgos', icon: Search },
  { id: 'scenarios', label: 'Escenarios', icon: GitBranch },
  { id: 'diagrams', label: 'Diagramas', icon: Network },
  { id: 'reports', label: 'Informes', icon: FileOutput },
  { id: 'settings', label: 'Config', icon: Settings },
];

const fetchDashboard = async (id: string): Promise<DashboardData> => {
  const [projectRes, dashboardRes] = await Promise.all([
    fetch(`${API_URL}/api/projects/${id}`),
    fetch(`${API_URL}/api/projects/${id}/dashboard`)
  ]);

  if (!projectRes.ok) {
    if (projectRes.status === 404) throw new Error('Proyecto no encontrado');
    throw new Error('Error al cargar el proyecto');
  }

  const projectData = await projectRes.json();
  const dashboardData = dashboardRes.ok ? await dashboardRes.json() : {};
  const project = projectData.data || projectData;
  
  return {
    project: {
      id: project.id || id,
      name: project.name || 'Proyecto sin nombre',
      client_name: project.client_name || null,
      plant_name: project.plant_name || null,
      status: project.status || 'draft',
      progress_percentage: project.progress_percentage || 0,
      published_to_kb: project.published_to_kb || false,
    },
    stats: {
      documents_count: dashboardData.findings_count || 0,
      opportunities_count: dashboardData.opportunities || dashboardData.quick_wins || 0,
      critical_risks: dashboardData.critical_risks || 0,
      total_potential_savings: dashboardData.total_potential_savings || 0
    },
    water_balance: null,
    recent_workflows: []
  };
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    active: { label: 'Activo', variant: 'default' },
    completed: { label: 'Completado', variant: 'outline' },
    archived: { label: 'Archivado', variant: 'secondary' },
  };
  const config = statusConfig[status] || { label: status, variant: 'secondary' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const ConsultoriaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [isStartingDiagnosis, setIsStartingDiagnosis] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishedToKB, setIsPublishedToKB] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultoria-dashboard', id],
    queryFn: () => fetchDashboard(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.project) {
      setIsPublishedToKB(data.project.published_to_kb || false);
    }
  }, [data?.project]);

  const handleStartDiagnosis = async () => {
    if (!id) return;
    setIsStartingDiagnosis(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/workflows/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_type: 'quick_diagnosis' })
      });
      const result = await res.json();
      if (result.success && result.workflow_id) {
        setRunningWorkflowId(result.workflow_id);
        setShowProgress(true);
      } else {
        toast({ title: 'Error', description: result.message || 'No se pudo iniciar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error al conectar', variant: 'destructive' });
    } finally {
      setIsStartingDiagnosis(false);
    }
  };

  const handleWorkflowComplete = () => {
    setShowProgress(false);
    setRunningWorkflowId(null);
    queryClient.invalidateQueries({ queryKey: ['consultoria-dashboard', id] });
    toast({ title: 'Diagnóstico completado' });
  };

  const handlePublishToKB = async () => {
    if (!id) return;
    setIsPublishing(true);
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}/publish-to-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        setIsPublishedToKB(true);
        setShowPublishDialog(false);
        toast({ title: 'Publicado correctamente' });
        queryClient.invalidateQueries({ queryKey: ['consultoria-dashboard', id] });
      } else {
        toast({ title: 'Error', description: result.detail || 'No se pudo publicar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    try {
      await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
      toast({ title: 'Proyecto eliminado' });
      navigate('/consultoria');
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error al cargar el proyecto</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Error inesperado'}
            </p>
            <Button variant="outline" onClick={() => navigate('/consultoria')}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, stats, water_balance, recent_workflows = [] } = data;
  const safeStats = stats || { documents_count: 0, opportunities_count: 0, critical_risks: 0, total_potential_savings: 0 };
  const hasFindings = safeStats.opportunities_count > 0 || safeStats.critical_risks > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/consultoria')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {getStatusBadge(project.status)}
              {isPublishedToKB && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <BookCheck className="h-3 w-3 mr-1" />
                  En KB
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {project.client_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />{project.client_name}
                </span>
              )}
              {project.plant_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />{project.plant_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={`/consultoria/projects/${id}/briefing`}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Completar Briefing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/consultoria/projects/${id}/research`}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Ver Investigación
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(true)}
              disabled={!hasFindings || isPublishedToKB || isPublishing}
            >
              {isPublishedToKB ? <BookCheck className="h-4 w-4 mr-2" /> : <BookPlus className="h-4 w-4 mr-2" />}
              {isPublishedToKB ? 'Publicado' : 'Publicar a KB'}
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Progress */}
      {showProgress && runningWorkflowId && (
        <WorkflowProgress projectId={id!} workflowId={runningWorkflowId} onComplete={handleWorkflowComplete} />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {PROJECT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab projectId={id!} stats={safeStats} waterBalance={water_balance} recentWorkflows={recent_workflows} onStartDiagnosis={handleStartDiagnosis} isStartingDiagnosis={isStartingDiagnosis} showProgress={showProgress} />
          </TabsContent>
          <TabsContent value="documents"><DocumentsTab projectId={id!} /></TabsContent>
          <TabsContent value="workflows"><WorkflowsTab projectId={id!} onWorkflowComplete={handleWorkflowComplete} /></TabsContent>
          <TabsContent value="water-balance"><WaterBalanceTab projectId={id!} /></TabsContent>
          <TabsContent value="findings"><FindingsTab projectId={id!} /></TabsContent>
          <TabsContent value="scenarios"><ScenariosTab projectId={id!} /></TabsContent>
          <TabsContent value="diagrams"><DiagramsTab projectId={id!} /></TabsContent>
          <TabsContent value="reports"><ReportsTab projectId={id!} projectName={project.name} hasFindings={hasFindings} /></TabsContent>
          <TabsContent value="settings"><SettingsTab projectId={id!} onDeleteProject={handleDeleteProject} /></TabsContent>
        </div>
      </Tabs>

      {/* Publish Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar a Base de Conocimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción compilará todos los hallazgos en un caso de estudio y lo añadirá a la base de conocimiento global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishToKB} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookPlus className="h-4 w-4 mr-2" />}
              {isPublishing ? 'Publicando...' : 'Publicar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConsultoriaDetalle;
