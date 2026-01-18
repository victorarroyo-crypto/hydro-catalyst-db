import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Lightbulb, 
  Zap, 
  Euro, 
  TrendingUp, 
  Search, 
  Loader2, 
  Play,
  Building2,
  MapPin,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  id: string;
  name: string;
  client_name: string;
  plant_name: string;
  status: string;
}

interface Finding {
  id: string;
  type: 'risk' | 'quick_win' | 'opportunity';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_savings_annual?: number;
  estimated_investment?: number;
}

interface WorkflowStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percentage?: number;
  error_message?: string;
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 hover:bg-red-600",
  high: "bg-orange-500 hover:bg-orange-600",
  medium: "bg-yellow-500 hover:bg-yellow-600",
  low: "bg-green-500 hover:bg-green-600"
};

const priorityLabels: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo"
};

const typeIcons: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  risk: { icon: AlertTriangle, color: "text-red-500", label: "Riesgo" },
  quick_win: { icon: Zap, color: "text-yellow-500", label: "Quick Win" },
  opportunity: { icon: Lightbulb, color: "text-green-500", label: "Oportunidad" }
};

const fetchProject = async (id: string): Promise<Project> => {
  const response = await fetch(`${API_URL}/api/projects/${id}`);
  if (!response.ok) throw new Error('Error al cargar proyecto');
  return response.json();
};

const fetchFindings = async (id: string): Promise<Finding[]> => {
  const response = await fetch(`${API_URL}/api/projects/${id}/findings`);
  if (!response.ok) throw new Error('Error al cargar hallazgos');
  const data = await response.json();
  return Array.isArray(data) ? data : (data?.data ?? data?.findings ?? []);
};

export default function ConsultoriaDiagnostico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const { data: findings = [], isLoading: loadingFindings, refetch: refetchFindings } = useQuery({
    queryKey: ['findings', id],
    queryFn: () => fetchFindings(id!),
    enabled: !!id,
  });

  // Polling for workflow status
  useEffect(() => {
    if (!workflowId || !id) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects/${id}/workflows/${workflowId}/status`);
        if (!response.ok) throw new Error('Error al obtener estado');
        
        const status: WorkflowStatus = await response.json();
        setWorkflowStatus(status);

        if (status.status === 'completed') {
          clearInterval(interval);
          setIsRunning(false);
          setWorkflowId(null);
          setWorkflowStatus(null);
          await refetchFindings();
          toast({
            title: "Diagnóstico completado",
            description: "Los hallazgos han sido actualizados",
          });
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setIsRunning(false);
          setWorkflowId(null);
          setWorkflowStatus(null);
          toast({
            title: "Error en el diagnóstico",
            description: status.error_message || "Ha ocurrido un error",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error polling workflow status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [workflowId, id, refetchFindings, toast]);

  const handleRunDiagnosis = async () => {
    if (!id) return;

    setIsRunning(true);
    setWorkflowStatus({ id: '', status: 'pending', progress_percentage: 0 });

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}/workflows/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_type: 'quick_diagnosis' }),
      });

      if (!response.ok) throw new Error('Error al iniciar diagnóstico');

      const data = await response.json();
      setWorkflowId(data.workflow_id);
      setWorkflowStatus({ id: data.workflow_id, status: 'running', progress_percentage: 0 });
    } catch (error) {
      setIsRunning(false);
      setWorkflowStatus(null);
      toast({
        title: "Error",
        description: "No se pudo iniciar el diagnóstico",
        variant: "destructive",
      });
    }
  };

  const sortedFindings = [...findings].sort(
    (a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  if (loadingProject) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/consultoria/${id}`)}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div>
          <h1 className="text-2xl font-bold">{project?.name || 'Proyecto'}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            {project?.client_name && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {project.client_name}
              </span>
            )}
            {project?.plant_name && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {project.plant_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Diagnosis Button Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Diagnóstico IA
          </CardTitle>
          <CardDescription>
            Analiza los documentos con IA para identificar riesgos, oportunidades y quick wins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && workflowStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {workflowStatus.status === 'pending' ? 'Preparando...' : 'Analizando documentos...'}
                </span>
              </div>
              <Progress value={workflowStatus.progress_percentage || 10} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Esto puede tardar unos minutos dependiendo del número de documentos
              </p>
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={handleRunDiagnosis}
              className="gap-2 w-full sm:w-auto"
            >
              <Play className="h-4 w-4" />
              Ejecutar Diagnóstico Rápido
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Findings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Hallazgos {findings.length > 0 && <span className="text-muted-foreground">({findings.length})</span>}
          </h2>
        </div>

        {loadingFindings ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sortedFindings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Ejecuta un diagnóstico para identificar oportunidades
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedFindings.map((finding) => {
              const typeConfig = typeIcons[finding.type] || typeIcons.opportunity;
              const TypeIcon = typeConfig.icon;

              return (
                <Card key={finding.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 ${typeConfig.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold leading-tight">{finding.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                          </div>
                          <Badge className={`shrink-0 text-white ${priorityColors[finding.priority]}`}>
                            {priorityLabels[finding.priority] || finding.priority}
                          </Badge>
                        </div>

                        {(finding.estimated_savings_annual || finding.estimated_investment) && (
                          <div className="flex flex-wrap gap-4 pt-2 border-t">
                            {finding.estimated_savings_annual && (
                              <span className="flex items-center gap-1.5 text-sm text-green-600">
                                <Euro className="h-4 w-4" />
                                Ahorro: {formatCurrency(finding.estimated_savings_annual)}/año
                              </span>
                            )}
                            {finding.estimated_investment && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                Inversión: {formatCurrency(finding.estimated_investment)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
