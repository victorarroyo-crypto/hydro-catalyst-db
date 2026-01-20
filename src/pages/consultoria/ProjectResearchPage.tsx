import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Play, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';
import { ResearchSourcesView, AgentConclusionsView } from '@/components/research';
import { ResearchSource, AgentConclusion } from '@/types/briefing';

interface ResearchStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  current_phase?: string;
  error_message?: string;
  sources_count?: number;
  conclusions_count?: number;
}

interface ResearchData {
  sources: ResearchSource[];
  conclusions: AgentConclusion[];
  status: ResearchStatus;
}

export default function ProjectResearchPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ResearchData>({
    queryKey: ['project-research', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/research`);
      if (!response.ok) {
        if (response.status === 404) {
          return { 
            sources: [], 
            conclusions: [], 
            status: { status: 'idle', progress: 0 } 
          };
        }
        throw new Error('Error al cargar la investigación');
      }
      return response.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status?.status === 'running' ? 3000 : false;
    },
  });

  const startResearchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar investigación');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Investigación iniciada', {
        description: 'Los agentes AI están analizando la información del proyecto',
      });
      queryClient.invalidateQueries({ queryKey: ['project-research', projectId] });
    },
    onError: (error: Error) => {
      toast.error('Error al iniciar investigación', {
        description: error.message,
      });
    },
  });

  const approveConclusionMutation = useMutation({
    mutationFn: async (conclusionId: string) => {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/conclusions/${conclusionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true }),
        }
      );
      if (!response.ok) throw new Error('Error al aprobar conclusión');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Conclusión aprobada');
      queryClient.invalidateQueries({ queryKey: ['project-research', projectId] });
    },
  });

  const rejectConclusionMutation = useMutation({
    mutationFn: async ({ conclusionId, reason }: { conclusionId: string; reason: string }) => {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/conclusions/${conclusionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: false, rejection_reason: reason || 'Sin motivo especificado' }),
        }
      );
      if (!response.ok) throw new Error('Error al rechazar conclusión');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Conclusión rechazada');
      queryClient.invalidateQueries({ queryKey: ['project-research', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/consultoria/projects/${projectId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al proyecto
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error ? error.message : 'Error al cargar la investigación'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const status = data?.status || { status: 'idle', progress: 0 };
  const isRunning = status.status === 'running';
  const isCompleted = status.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/consultoria/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Investigación Preliminar</h1>
            <p className="text-muted-foreground">
              Análisis de fuentes y conclusiones de agentes AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Badge variant="outline" className="text-primary border-primary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completado
            </Badge>
          )}
          <Button
            onClick={() => startResearchMutation.mutate()}
            disabled={isRunning || startResearchMutation.isPending}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Investigando...
              </>
            ) : isCompleted ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reiniciar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Investigación
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {status.current_phase || 'Procesando...'}
                </span>
                <span className="font-medium">{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{status.sources_count || 0} fuentes encontradas</span>
                <span>{status.conclusions_count || 0} conclusiones generadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {status.status === 'failed' && status.error_message && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error en la investigación</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{status.error_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Research Sources */}
      <ResearchSourcesView 
        sources={data?.sources || []} 
        isLoading={isRunning}
      />

      {/* Agent Conclusions */}
      <AgentConclusionsView
        conclusions={data?.conclusions || []}
        isLoading={isRunning}
        onApprove={(id) => approveConclusionMutation.mutate(id)}
        onReject={(id, reason) => rejectConclusionMutation.mutate({ conclusionId: id, reason })}
      />
    </div>
  );
}
