import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Settings, 
  Cpu, 
  DollarSign,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { API_URL } from '@/lib/api';

interface LLMUsage {
  total_cost: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  by_model: Array<{
    model: string;
    cost: number;
    tokens: number;
  }>;
  by_agent: Array<{
    agent: string;
    cost: number;
    tokens: number;
  }>;
}

interface SettingsTabProps {
  projectId: string;
  onDeleteProject: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ projectId, onDeleteProject }) => {
  const { data: llmUsage, isLoading } = useQuery({
    queryKey: ['llm-usage', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/llm-usage`);
      if (!res.ok) return null;
      return res.json() as Promise<LLMUsage>;
    },
    enabled: !!projectId,
  });

  return (
    <div className="space-y-6">
      {/* LLM Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Consumo de IA
          </CardTitle>
          <CardDescription>
            Uso de modelos de lenguaje en este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          ) : llmUsage ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Costo Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(llmUsage.total_cost ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Tokens Totales</p>
                  <p className="text-2xl font-bold">
                    {(llmUsage.total_tokens ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Input Tokens</p>
                  <p className="text-lg font-semibold">
                    {(llmUsage.input_tokens ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Output Tokens</p>
                  <p className="text-lg font-semibold">
                    {(llmUsage.output_tokens ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* By Model */}
              {llmUsage.by_model && llmUsage.by_model.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Por Modelo</h4>
                  <div className="space-y-2">
                    {llmUsage.by_model.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <span className="font-medium">{item.model || 'Desconocido'}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {(item.tokens ?? 0).toLocaleString()} tokens
                          </span>
                          <span className="text-green-600 font-medium">
                            ${(item.cost ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Agent */}
              {llmUsage.by_agent && llmUsage.by_agent.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Por Agente</h4>
                  <div className="space-y-2">
                    {llmUsage.by_agent.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <span className="font-medium">{item.agent || 'Desconocido'}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {(item.tokens ?? 0).toLocaleString()} tokens
                          </span>
                          <span className="text-green-600 font-medium">
                            ${(item.cost ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                No hay datos de consumo de IA disponibles
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div>
              <p className="font-medium">Eliminar Proyecto</p>
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer. Se eliminarán todos los datos del proyecto.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán permanentemente todos los
                    documentos, análisis, escenarios y datos asociados a este proyecto.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteProject}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar Proyecto
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
