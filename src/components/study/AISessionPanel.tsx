import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIStudySessionState } from '@/hooks/useAIStudySession';
import { useLLMModels } from '@/hooks/useLLMModels';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AISessionPanelProps {
  state: AIStudySessionState;
  onStart: (provider: string, model: string) => void;
  onCancel: () => void;
  isStarting?: boolean;
  title?: string;
  description?: string;
  showModelSelector?: boolean;
}

const STATUS_CONFIG = {
  idle: { label: 'Inactivo', icon: Sparkles, color: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pendiente', icon: Loader2, color: 'bg-amber-500/20 text-amber-700' },
  running: { label: 'En ejecución', icon: Loader2, color: 'bg-blue-500/20 text-blue-700' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'bg-green-500/20 text-green-700' },
  failed: { label: 'Error', icon: XCircle, color: 'bg-red-500/20 text-red-700' },
  cancelled: { label: 'Cancelado', icon: AlertCircle, color: 'bg-muted text-muted-foreground' },
};

const LOG_LEVEL_COLORS = {
  info: 'text-blue-600',
  warn: 'text-amber-600',
  error: 'text-red-600',
  debug: 'text-muted-foreground',
};

export default function AISessionPanel({
  state,
  onStart,
  onCancel,
  isStarting = false,
  title = 'Análisis con IA',
  description = 'Ejecuta análisis automatizado con inteligencia artificial',
  showModelSelector = true,
}: AISessionPanelProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch LLM models
  const { data: llmModelsData, isLoading: llmModelsLoading, isError: llmModelsError, refetch: refetchLLMModels } = useLLMModels();

  const modelsByProvider = llmModelsData ?? {};

  const availableModelValues = useMemo(() => {
    const values: string[] = [];
    for (const [providerKey, providerData] of Object.entries(modelsByProvider)) {
      for (const model of providerData.models) values.push(`${providerKey}/${model.id}`);
    }
    return values;
  }, [modelsByProvider]);

  // Ensure selectedModel is valid
  useEffect(() => {
    if (llmModelsLoading) return;
    if (availableModelValues.length === 0) return;
    if (selectedModel && availableModelValues.includes(selectedModel)) return;
    // Prefer groq or openai as default
    const preferred = availableModelValues.find((v) => v.startsWith('groq/')) 
      ?? availableModelValues.find((v) => v.startsWith('openai/')) 
      ?? availableModelValues[0];
    setSelectedModel(preferred);
  }, [llmModelsLoading, availableModelValues, selectedModel]);

  const handleStartClick = () => {
    if (!selectedModel) return;
    const [provider, ...modelParts] = selectedModel.split('/');
    const model = modelParts.join('/');
    onStart(provider, model);
  };

  const statusConfig = STATUS_CONFIG[state.status] || STATUS_CONFIG.idle;
  const StatusIcon = statusConfig.icon;

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.logs, showLogs]);

  // Auto-expand logs when running
  useEffect(() => {
    if (state.isActive && !showLogs) {
      setShowLogs(true);
    }
  }, [state.isActive]);

  return (
    <Card className={cn(
      'transition-all duration-300',
      state.isActive && 'ring-2 ring-primary/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge className={cn('gap-1', statusConfig.color)}>
            <StatusIcon className={cn(
              'w-3 h-3',
              (state.status === 'pending' || state.status === 'running') && 'animate-spin'
            )} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar for active sessions */}
        {state.isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {state.currentPhase || 'Iniciando...'}
              </span>
              <span className="font-medium">{state.progress}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <strong>Error:</strong> {state.error}
          </div>
        )}

        {/* Model selector */}
        {showModelSelector && !state.isActive && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Modelo LLM</label>
            {llmModelsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando modelos...
              </div>
            ) : llmModelsError ? (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="w-4 h-4" />
                Error al cargar modelos
                <Button variant="ghost" size="sm" onClick={() => refetchLLMModels()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un modelo" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {Object.entries(modelsByProvider).map(([providerKey, providerData]) => (
                    <SelectGroup key={providerKey}>
                      <SelectLabel className="capitalize">{providerData.name}</SelectLabel>
                      {providerData.models.map((model) => (
                        <SelectItem
                          key={`${providerKey}/${model.id}`}
                          value={`${providerKey}/${model.id}`}
                          className="py-2"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {model.description} • ${model.cost_per_1m_tokens}/1M tokens
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!state.isActive ? (
              <Button
                onClick={handleStartClick}
                disabled={isStarting || (showModelSelector && (!selectedModel || llmModelsLoading || llmModelsError))}
                size="sm"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isStarting ? 'Iniciando...' : 'Iniciar Análisis'}
              </Button>
            ) : (
              <Button
                onClick={onCancel}
                variant="destructive"
                size="sm"
              >
                <Square className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>

          {state.logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Ocultar logs
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Ver logs ({state.logs.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Logs section */}
        {showLogs && state.logs.length > 0 && (
          <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1 font-mono text-xs">
              {state.logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {format(new Date(log.created_at), 'HH:mm:ss', { locale: es })}
                  </span>
                  <span className={cn(
                    'shrink-0 uppercase w-12',
                    LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || 'text-muted-foreground'
                  )}>
                    [{log.level}]
                  </span>
                  {log.phase && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                      {log.phase}
                    </Badge>
                  )}
                  <span className="text-foreground break-all">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
