import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClassificationResult {
  id: string;
  success: boolean;
  reasoning?: string;
  error?: string;
}

interface ClassificationResponse {
  message: string;
  classified: number;
  remaining: number;
  results?: ClassificationResult[];
  error?: string;
}

export const AIClassificationPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResults, setLastResults] = useState<ClassificationResult[]>([]);
  const [totalClassified, setTotalClassified] = useState(0);

  // Get count of unclassified technologies
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['unclassified-count'],
    queryFn: async () => {
      const { count: unclassifiedCount, error } = await supabase
        .from('technologies')
        .select('id', { count: 'exact', head: true })
        .is('tipo_id', null);
      
      if (error) throw error;

      const { count: totalCount } = await supabase
        .from('technologies')
        .select('id', { count: 'exact', head: true });

      const unclassified = unclassifiedCount ?? 0;
      const total = totalCount ?? 0;

      return {
        unclassified,
        total,
        classified: total - unclassified,
      };
    },
  });

  const classifyMutation = useMutation({
    mutationFn: async (): Promise<ClassificationResponse> => {
      const { data, error } = await supabase.functions.invoke('classify-technologies', {
        body: { batchSize: 15 },
      });

      if (error) throw error;
      return data as ClassificationResponse;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        setIsRunning(false);
        return;
      }

      setTotalClassified(prev => prev + data.classified);
      setLastResults(data.results || []);
      
      toast.success(data.message);
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['technologies'] });

      // Continue if there are more to classify
      if (data.remaining > 0 && isRunning) {
        setTimeout(() => {
          classifyMutation.mutate();
        }, 1000); // Small delay between batches
      } else {
        setIsRunning(false);
        if (data.remaining === 0) {
          toast.success('¡Clasificación completada! Todas las tecnologías han sido clasificadas.');
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
      setIsRunning(false);
    },
  });

  const handleStart = () => {
    setIsRunning(true);
    setTotalClassified(0);
    setLastResults([]);
    classifyMutation.mutate();
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const progress = stats ? ((stats.classified / stats.total) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Clasificación con IA
        </CardTitle>
        <CardDescription>
          Clasifica automáticamente las tecnologías según la taxonomía usando inteligencia artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso de clasificación</span>
            <span className="font-medium">
              {stats?.classified.toLocaleString() || 0} / {stats?.total.toLocaleString() || 0}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats?.unclassified?.toLocaleString() || 0} tecnologías pendientes de clasificar
          </p>
        </div>

        {/* Session Stats */}
        {totalClassified > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium text-primary">
              Sesión actual: {totalClassified} tecnologías clasificadas
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button 
              onClick={handleStart} 
              disabled={!stats?.unclassified || stats.unclassified === 0}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Clasificación
            </Button>
          ) : (
            <Button 
              onClick={handleStop} 
              variant="destructive"
              className="flex-1"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Detener
            </Button>
          )}
        </div>

        {/* Last Results */}
        {lastResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Último lote procesado:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {lastResults.map((result) => (
                <div 
                  key={result.id}
                  className={`flex items-start gap-2 text-xs p-2 rounded ${
                    result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate">
                    {result.success ? result.reasoning : result.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {isRunning && (
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Procesando lote... No cierres esta ventana
          </p>
        )}
      </CardContent>
    </Card>
  );
};
