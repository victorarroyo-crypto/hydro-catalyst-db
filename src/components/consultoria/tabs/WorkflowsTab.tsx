import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Cpu,
  Zap,
  Search,
  Target,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api';
import WorkflowProgress from '@/components/consultoria/WorkflowProgress';

interface WorkflowsTabProps {
  projectId: string;
  onWorkflowComplete: () => void;
}

interface WorkflowHistory {
  id: string;
  name: string;
  workflow_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
  agents_count?: number;
  llm_cost?: number;
}

const WORKFLOW_TYPES = [
  {
    id: 'full',
    name: 'Análisis Completo',
    description: 'Ejecuta los 22 agentes de IA para un análisis exhaustivo',
    agents: 22,
    time: '~15 min',
    icon: Cpu,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'baseline',
    name: 'Solo Baseline',
    description: 'Balance hídrico + Costos + Marco regulatorio',
    agents: 3,
    time: '~3 min',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'diagnostic',
    name: 'Solo Diagnóstico',
    description: 'PTAR + Torres + Calderas + RO',
    agents: 4,
    time: '~5 min',
    icon: Search,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'opportunities',
    name: 'Oportunidades',
    description: 'Finder + TechMatcher + QuickWins',
    agents: 3,
    time: '~4 min',
    icon: Zap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    running: 'Ejecutando',
    completed: 'Completado',
    failed: 'Error',
  };
  return labels[status] || status;
};

export const WorkflowsTab: React.FC<WorkflowsTabProps> = ({ projectId, onWorkflowComplete }) => {
  const { toast } = useToast();
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [startingWorkflow, setStartingWorkflow] = useState<string | null>(null);

  // Fetch workflow history
  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['workflow-history', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/workflows`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.workflows || data || []) as WorkflowHistory[];
    },
    enabled: !!projectId,
  });

  const handleStartWorkflow = async (workflowType: string) => {
    setStartingWorkflow(workflowType);
    
    try {
      const endpoint = workflowType === 'full' 
        ? `${API_URL}/api/projects/${projectId}/workflows/run`
        : `${API_URL}/api/projects/${projectId}/workflows/${workflowType}`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_type: workflowType })
      });
      
      const data = await res.json();
      
      if (data.success && data.workflow_id) {
        setRunningWorkflowId(data.workflow_id);
        toast({
          title: 'Workflow iniciado',
          description: `${WORKFLOW_TYPES.find(w => w.id === workflowType)?.name} en progreso`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudo iniciar el workflow',
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
      setStartingWorkflow(null);
    }
  };

  const handleWorkflowComplete = (results: any) => {
    setRunningWorkflowId(null);
    refetch();
    onWorkflowComplete();
    toast({
      title: 'Workflow completado',
      description: 'Los resultados están disponibles',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Progress (if running) */}
      {runningWorkflowId && (
        <WorkflowProgress
          projectId={projectId}
          workflowId={runningWorkflowId}
          onComplete={handleWorkflowComplete}
        />
      )}

      {/* Workflow Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Ejecutar Análisis
          </CardTitle>
          <CardDescription>
            Selecciona el tipo de análisis a ejecutar. Los agentes de IA procesarán los documentos del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WORKFLOW_TYPES.map((workflow) => {
              const Icon = workflow.icon;
              const isStarting = startingWorkflow === workflow.id;
              const isRunning = !!runningWorkflowId;
              
              return (
                <Card 
                  key={workflow.id} 
                  className={`relative overflow-hidden transition-all ${
                    isRunning ? 'opacity-50' : 'hover:shadow-md cursor-pointer'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${workflow.bgColor}`}>
                        <Icon className={`h-6 w-6 ${workflow.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workflow.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{workflow.agents} agentes</span>
                          <span>•</span>
                          <span>{workflow.time}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartWorkflow(workflow.id)}
                        disabled={isStarting || isRunning}
                      >
                        {isStarting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Cpu className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                No hay análisis ejecutados. Inicia uno para ver el historial.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(workflow.status)}
                    <div>
                      <p className="font-medium">{workflow.name || workflow.workflow_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(workflow.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {workflow.llm_cost && (
                      <span className="text-sm text-muted-foreground">
                        ${workflow.llm_cost.toFixed(2)}
                      </span>
                    )}
                    <Badge variant="outline">
                      {getStatusLabel(workflow.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
