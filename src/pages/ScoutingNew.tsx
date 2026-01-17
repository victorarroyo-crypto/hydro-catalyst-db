import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Rocket,
  Loader2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLLMModels, getDefaultModel, formatModelCost } from '@/hooks/useLLMModels';

// Proxy helper - calls to Railway backend
async function proxyFetch<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('scouting-proxy', {
    body: { endpoint, method, body },
  });

  if (error) throw new Error(error.message);

  if (!data?.success) {
    const err = new Error(data?.error || 'Error en proxy') as Error & { details?: unknown };
    err.details = data?.details;
    throw err;
  }

  return data.data as T;
}

// API functions via proxy
const runScouting = async (params: { 
  config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string };
  model: string;
}) => {
  return proxyFetch<{ job_id: string }>('/api/scouting/run', 'POST', {
    config: params.config,
    model: params.model,
  });
};

const ScoutingNew = () => {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState('');
  const [tipo, setTipo] = useState('all');
  const [trlMin, setTrlMin] = useState('none');
  const [instructions, setInstructions] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // LLM Models from Railway
  const { data: llmData, isLoading: llmModelsLoading, isError: llmModelsError, refetch: refetchLLMModels } = useLLMModels();
  const models = llmData?.models ?? [];

  // Set default model when models load
  useEffect(() => {
    if (llmModelsLoading || models.length === 0) return;
    if (selectedModel && models.some(m => m.key === selectedModel)) return;
    
    const defaultModel = getDefaultModel(models);
    if (defaultModel) setSelectedModel(defaultModel.key);
  }, [llmModelsLoading, models, selectedModel]);

  // Scouting mutation
  const scoutingMutation = useMutation({
    mutationFn: runScouting,
    onMutate: () => {
      toast.loading('Iniciando scouting...', { id: 'scouting-start' });
    },
    onSuccess: async (data) => {
      const jobId = data.job_id;
      toast.success(`Scouting iniciado (Job ID: ${jobId?.slice(0, 8)}...)`, { id: 'scouting-start' });

      // Ensure it appears in the Monitor immediately (even if webhooks are delayed)
      if (jobId) {
        try {
          await supabase.functions.invoke('scouting-start-session', {
            body: {
              session_id: jobId,
              config: {
                keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                tipo: tipo === 'all' ? '' : tipo,
                trl_min: trlMin === 'none' ? null : parseInt(trlMin),
                instructions: instructions || undefined,
                model: selectedModel,
              },
            },
          });
        } catch {
          // Non-blocking: monitor can still work with webhooks
        }
      }

      setKeywords('');
      setTipo('all');
      setTrlMin('none');
      setInstructions('');
      // Navigate to monitor to see progress
      navigate('/scouting-monitor');
    },
    onError: async (error: Error & { details?: unknown }) => {
      const errorMessage = error.message || '';
      if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('ya hay un scouting')) {
        // Extract details from enhanced error response
        const detailsAny = (error as any)?.details;
        const jobId = detailsAny?.active_job_id || detailsAny?.job_id || detailsAny?.data?.job_id;
        const cooldownSeconds = detailsAny?.cooldown_seconds;
        const specificMessage = detailsAny?.message;

        // Try to ensure the active job appears in Monitor
        if (jobId) {
          try {
            await supabase.functions.invoke('scouting-start-session', { body: { session_id: jobId } });
          } catch {
            // ignore
          }
        }

        // Show more informative error message
        let toastMessage = 'Ya hay un scouting en ejecución. Revisa el Monitor.';
        if (cooldownSeconds) {
          toastMessage = `Espera ${cooldownSeconds} segundos antes de lanzar otro scouting.`;
        } else if (jobId) {
          toastMessage = `Scouting activo (${jobId.slice(0, 8)}...). Revisa el Monitor.`;
        } else if (specificMessage) {
          toastMessage = specificMessage;
        }

        toast.error(toastMessage, { id: 'scouting-start', duration: 8000 });
        navigate('/scouting-monitor');
      } else if (errorMessage.includes('429')) {
        toast.error('Límite semanal alcanzado.', { id: 'scouting-start', duration: 8000 });
      } else {
        toast.error(`Error: ${errorMessage}`, { id: 'scouting-start' });
      }
    },
  });

  const handleStartScouting = () => {
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywordList.length === 0) {
      toast.error('Introduce al menos una keyword');
      return;
    }
    if (!selectedModel) {
      toast.error('Selecciona un modelo LLM');
      return;
    }
    
    scoutingMutation.mutate({
      config: {
        keywords: keywordList,
        tipo: tipo === 'all' ? '' : tipo,
        trl_min: trlMin === 'none' ? null : parseInt(trlMin),
        instructions: instructions || undefined,
      },
      model: selectedModel,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Rocket className="w-8 h-8 text-primary" />
            Nuevo Scouting
          </h1>
          <p className="text-muted-foreground mt-1">
            Configura y lanza un nuevo proceso de scouting automático
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Configuración del Scouting
          </CardTitle>
          <CardDescription>
            Define los parámetros para buscar nuevas tecnologías.
            Una vez iniciado, podrás seguir el progreso en el <a href="/scouting-monitor" className="text-primary underline">Monitor de Scouting</a>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Keywords <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ej: water treatment, desalination, membrane technology"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separa múltiples keywords con comas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de tecnología</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Cualquier tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquier tipo</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="process">Proceso</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">TRL mínimo</label>
              <Select value={trlMin} onValueChange={setTrlMin}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin mínimo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin mínimo</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((trl) => (
                    <SelectItem key={trl} value={trl.toString()}>
                      TRL {trl}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Instrucciones adicionales</label>
            <Textarea
              placeholder="Instrucciones específicas para el agente de scouting..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Modelo LLM <span className="text-destructive">*</span>
            </label>
            {llmModelsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando modelos...
              </div>
            ) : llmModelsError ? (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                Error al cargar modelos
                <Button variant="ghost" size="sm" onClick={() => refetchLLMModels()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem
                      key={model.key}
                      value={model.key}
                      className="py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.is_recommended && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Recomendado
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatModelCost(model.cost_per_query)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleStartScouting}
            disabled={scoutingMutation.isPending || llmModelsLoading || !!llmModelsError}
          >
            {scoutingMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Iniciando scouting...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" />
                Iniciar Scouting
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoutingNew;
