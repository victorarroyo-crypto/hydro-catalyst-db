import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Rocket,
  Loader2,
  XCircle,
} from 'lucide-react';
// Edge Functions are in Lovable Cloud, use local supabase client
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

// Generate unique UUID for idempotency
function generateRequestId(): string {
  return crypto.randomUUID();
}

// Proxy helper - calls to Railway backend via Lovable Cloud Edge Function
// Now includes requestId for idempotency
async function proxyFetch<T>(endpoint: string, method = 'GET', body?: unknown, requestId?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (requestId) {
    headers['X-Idempotency-Key'] = requestId;
  }

  const { data, error } = await supabase.functions.invoke('scouting-proxy', {
    body: { endpoint, method, body, requestId },
    headers,
  });

  if (error) throw new Error(error.message);

  if (!data?.success) {
    const err = new Error(data?.error || 'Error en proxy') as Error & { details?: unknown };
    err.details = data?.details;
    throw err;
  }

  return data.data as T;
}

// API functions via proxy - now with requestId for /run endpoint
const runScouting = async (params: { 
  config: { keywords: string[]; tipo: string; trl_min: number | null; instructions?: string };
  model: string;
  requestId: string;
}) => {
  return proxyFetch<{ job_id: string }>('/api/scouting/run', 'POST', {
    config: params.config,
    model: params.model,
  }, params.requestId);
};

const cancelScouting = async (jobId: string) => {
  // Railway puede exponer cancelación por path o por body; intentamos ambos.
  try {
    await proxyFetch(`/api/scouting/cancel/${jobId}`, 'POST', {});
    return;
  } catch {
    await proxyFetch('/api/scouting/cancel', 'POST', { job_id: jobId });
  }
};

const ScoutingNew = () => {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState('');
  const [tipo, setTipo] = useState('all');
  const [trlMin, setTrlMin] = useState('none');
  const [instructions, setInstructions] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  
  // === ANTI-DOUBLE-CLICK REFS ===
  // Synchronous lock that blocks immediately (before React state updates)
  const submitLockRef = useRef(false);
  // Store the requestId for the current submission attempt
  const currentRequestIdRef = useRef<string | null>(null);
  // Timestamp of last submission to add extra debounce
  const lastSubmitTimeRef = useRef<number>(0);

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
      setActiveJobId(null);
      setCooldownSeconds(null);
      toast.loading('Iniciando scouting...', { id: 'scouting-start' });
    },
    onSuccess: (data) => {
      const jobId = data.job_id;
      toast.success(`Scouting iniciado (Job ID: ${jobId?.slice(0, 8)}...)`, { id: 'scouting-start' });

      // NO llamamos a scouting-start-session aquí porque Railway ya crea la sesión
      // via webhook. Llamarlo de nuevo causa entradas duplicadas en scouting_sessions.

      setKeywords('');
      setTipo('all');
      setTrlMin('none');
      setInstructions('');
      // Navigate to monitor to see progress
      navigate('/scouting-monitor');
    },
    onError: (error: Error & { details?: unknown }) => {
      const errorMessage = error.message || '';
      if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('ya hay un scouting')) {
        const detailsAny = (error as any)?.details;
        const cooldown = detailsAny?.cooldown_seconds as number | undefined;
        const jobId = (detailsAny?.active_job_id || detailsAny?.job_id) as string | undefined;
        const specificMessage = detailsAny?.message as string | undefined;

        if (jobId) setActiveJobId(jobId);
        if (typeof cooldown === 'number') setCooldownSeconds(cooldown);

        let toastMessage = 'Ya hay un scouting en ejecución.';
        if (cooldown) {
          toastMessage = `Ya hay un scouting en ejecución. Espera ${cooldown} segundos o cancélalo.`;
        } else if (jobId) {
          toastMessage = `Scouting activo (${jobId.slice(0, 8)}...). Puedes cancelarlo o ir al Monitor.`;
        } else if (specificMessage) {
          toastMessage = specificMessage;
        }

        toast.error(toastMessage, { id: 'scouting-start', duration: 9000 });
        return;
      }

      if (errorMessage.includes('429')) {
        toast.error('Límite semanal alcanzado.', { id: 'scouting-start', duration: 8000 });
        return;
      }

      toast.error(`Error: ${errorMessage}`, { id: 'scouting-start' });
    },
    onSettled: () => {
      // Release all locks after mutation completes
      setIsSubmitting(false);
      submitLockRef.current = false;
      currentRequestIdRef.current = null;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelScouting,
    onMutate: () => {
      toast.loading('Cancelando scouting...', { id: 'scouting-cancel' });
    },
    onSuccess: () => {
      toast.success('Scouting cancelado', { id: 'scouting-cancel' });
      setActiveJobId(null);
      setCooldownSeconds(null);
      // El monitor mostrará la transición; no asumimos timings
    },
    onError: (error: Error) => {
      toast.error('No se pudo cancelar', { id: 'scouting-cancel', description: error.message });
    },
  });

  // Counter to track submission attempts for debugging
  const attemptCounterRef = useRef(0);

  const handleStartScouting = useCallback(() => {
    const attemptNumber = ++attemptCounterRef.current;
    const now = Date.now();
    
    // === DETAILED INSTRUMENTATION FOR DEBUG ===
    console.log(`[ScoutingNew] 📊 ATTEMPT #${attemptNumber}:`, {
      timestamp: new Date().toISOString(),
      msSinceLastSubmit: now - lastSubmitTimeRef.current,
      submitLockRef: submitLockRef.current,
      isSubmitting,
      mutationPending: scoutingMutation.isPending,
      currentRequestIdRef: currentRequestIdRef.current,
    });

    // === SYNCHRONOUS LOCK CHECK (before React state) ===
    // This fires immediately, blocking any double-click in the same frame
    if (submitLockRef.current) {
      console.warn(`[ScoutingNew] ❌ BLOCKED #${attemptNumber}: synchronous lock active`);
      return;
    }
    
    // Hybrid debounce: 500ms window blocks duplicates (~200ms) while allowing intentional retries
    if (now - lastSubmitTimeRef.current < 500) {
      console.warn(`[ScoutingNew] ❌ BLOCKED #${attemptNumber}: time debounce (${now - lastSubmitTimeRef.current}ms)`);
      return;
    }
    
    // Also check React state (belt and suspenders)
    if (isSubmitting || scoutingMutation.isPending) {
      console.warn(`[ScoutingNew] ❌ BLOCKED #${attemptNumber}: React state lock`);
      return;
    }
    
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywordList.length === 0) {
      toast.error('Introduce al menos una keyword');
      return;
    }
    if (!selectedModel) {
      toast.error('Selecciona un modelo LLM');
      return;
    }
    
    // === ACQUIRE LOCKS IMMEDIATELY ===
    submitLockRef.current = true;
    lastSubmitTimeRef.current = now;
    setIsSubmitting(true);
    
    // Generate a new requestId UNIQUE for this attempt
    const requestId = generateRequestId();
    currentRequestIdRef.current = requestId;
    
    console.log(`[ScoutingNew] ✅ AUTHORIZED #${attemptNumber}:`, {
      requestId,
      keywords: keywordList,
      model: selectedModel,
      timestamp: new Date().toISOString(),
    });
    
    scoutingMutation.mutate({
      config: {
        keywords: keywordList,
        tipo: tipo === 'all' ? '' : tipo,
        trl_min: trlMin === 'none' ? null : parseInt(trlMin),
        instructions: instructions || undefined,
      },
      model: selectedModel,
      requestId,
    });
  }, [keywords, selectedModel, tipo, trlMin, instructions, isSubmitting, scoutingMutation]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {activeJobId && (
        <Card>
          <CardHeader>
            <CardTitle>Ya hay un scouting en ejecución</CardTitle>
            <CardDescription>
              {cooldownSeconds
                ? `El backend indica un cooldown de ${cooldownSeconds} segundos.`
                : 'Puedes ir al Monitor para ver el progreso o cancelar el job activo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => navigate('/scouting-monitor')} className="w-full sm:w-auto">
              Ver monitor
            </Button>
            <Button
              variant="destructive"
              onClick={() => activeJobId && cancelMutation.mutate(activeJobId)}
              disabled={cancelMutation.isPending}
              className="w-full sm:w-auto"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Cancelar scouting activo'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

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
            disabled={isSubmitting || scoutingMutation.isPending || llmModelsLoading || !!llmModelsError}
          >
            {(isSubmitting || scoutingMutation.isPending) ? (
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
