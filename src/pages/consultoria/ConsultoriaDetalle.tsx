import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft, 
  FileText, 
  Lightbulb, 
  AlertTriangle, 
  Euro,
  Droplets,
  Building2,
  MapPin,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { API_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import WorkflowProgress from '@/components/consultoria/WorkflowProgress';

interface ProjectData {
  id: string;
  name: string;
  client_name: string | null;
  plant_name: string | null;
  status: string;
  progress_percentage: number;
}

interface StatsData {
  findings_count: number;
  critical_risks: number;
  quick_wins: number;
  opportunities: number;
  total_potential_savings: number;
  workflows_count: number;
  workflows_completed: number;
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

const fetchDashboard = async (id: string): Promise<DashboardData> => {
  // Fetch project details and dashboard stats in parallel
  const [projectRes, dashboardRes] = await Promise.all([
    fetch(`${API_URL}/api/projects/${id}`),
    fetch(`${API_URL}/api/projects/${id}/dashboard`)
  ]);

  if (!projectRes.ok) {
    if (projectRes.status === 404) {
      throw new Error('Proyecto no encontrado');
    }
    throw new Error('Error al cargar el proyecto');
  }

  const projectData = await projectRes.json();
  const dashboardData: StatsData = dashboardRes.ok ? await dashboardRes.json() : {
    findings_count: 0,
    critical_risks: 0,
    quick_wins: 0,
    opportunities: 0,
    total_potential_savings: 0,
    workflows_count: 0,
    workflows_completed: 0
  };

  // Transform the flat API responses into the expected structure
  const project = projectData.data || projectData;
  
  return {
    project: {
      id: project.id || id,
      name: project.name || 'Proyecto sin nombre',
      client_name: project.client_name || null,
      plant_name: project.plant_name || null,
      status: project.status || 'draft',
      progress_percentage: project.progress_percentage || 0
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
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    active: { label: 'Activo', variant: 'default' },
    completed: { label: 'Completado', variant: 'outline' },
    archived: { label: 'Archivado', variant: 'secondary' },
  };
  const config = statusConfig[status] || { label: status, variant: 'secondary' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getWorkflowStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getWorkflowStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    running: 'Ejecutando',
    completed: 'Completado',
    failed: 'Error',
  };
  return labels[status] || status;
};

const ConsultoriaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Workflow progress state
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  
  const [isStartingDiagnosis, setIsStartingDiagnosis] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultoria-dashboard', id],
    queryFn: () => fetchDashboard(id!),
    enabled: !!id,
  });

  const handleStartDiagnosis = async () => {
    if (!id) return;
    
    setIsStartingDiagnosis(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/workflows/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_type: 'quick_diagnosis' })
      });
      const data = await res.json();
      
      if (data.success && data.workflow_id) {
        setRunningWorkflowId(data.workflow_id);
        setShowProgress(true);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudo iniciar el diagnóstico',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al conectar con el servidor',
        variant: 'destructive',
      });
    } finally {
      setIsStartingDiagnosis(false);
    }
  };

  const handleWorkflowComplete = (results: any) => {
    setShowProgress(false);
    setRunningWorkflowId(null);
    queryClient.invalidateQueries({ queryKey: ['consultoria-dashboard', id] });
    toast({
      title: 'Diagnóstico completado',
      description: 'Los resultados están disponibles',
    });
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error al cargar el proyecto</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Ha ocurrido un error inesperado'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/consultoria')}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.project) return null;

  const { project, stats, water_balance, recent_workflows = [] } = data;
  const safeStats = stats || { documents_count: 0, opportunities_count: 0, critical_risks: 0, total_potential_savings: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/consultoria')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {getStatusBadge(project.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {project.client_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {project.client_name}
                </span>
              )}
              {project.plant_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {project.plant_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/consultoria/${id}/documentos`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documentos
            </Button>
            <Button
              onClick={handleStartDiagnosis}
              disabled={showProgress || isStartingDiagnosis}
            >
              {showProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Diagnóstico en progreso...
                </>
              ) : isStartingDiagnosis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Diagnóstico
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${API_URL}/api/projects/${id}/report/pdf`, '_blank')}
              disabled={!data?.stats || (data.stats.opportunities_count === 0 && data.stats.critical_risks === 0)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Progress */}
      {showProgress && runningWorkflowId && (
        <WorkflowProgress
          projectId={id!}
          workflowId={runningWorkflowId}
          onComplete={handleWorkflowComplete}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Documentos"
          value={safeStats.documents_count}
          icon={FileText}
          variant="default"
        />
        <StatsCard
          title="Oportunidades"
          value={safeStats.opportunities_count}
          icon={Lightbulb}
          variant="primary"
          className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10"
        />
        <StatsCard
          title="Riesgos Críticos"
          value={safeStats.critical_risks}
          icon={AlertTriangle}
          variant="default"
          className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10"
        />
        <StatsCard
          title="Ahorro Potencial"
          value={`€${(safeStats.total_potential_savings || 0).toLocaleString('es-ES')}/año`}
          icon={Euro}
          variant="default"
          className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-500/10"
        />
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Balance Hídrico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {water_balance ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Consumo Total</span>
                  <span className="font-semibold">{water_balance.total_intake_m3_day.toLocaleString('es-ES')} m³/día</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Coste Anual</span>
                  <span className="font-semibold">€{water_balance.total_water_cost_annual.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Eficiencia</span>
                  <span className="font-semibold">{water_balance.water_efficiency_percent}%</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Droplets className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Ejecuta un diagnóstico para calcular el balance hídrico
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Workflows Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_workflows.length > 0 ? (
              <div className="space-y-3">
                {recent_workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {getWorkflowStatusIcon(workflow.status)}
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workflow.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {getWorkflowStatusLabel(workflow.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  No hay workflows ejecutados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultoriaDetalle;
