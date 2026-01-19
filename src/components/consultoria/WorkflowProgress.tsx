import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Bot,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  agent: string;
  message: string;
  timestamp: string;
}

interface WorkflowProgressProps {
  projectId: string;
  workflowId: string | null;
  onComplete: (results: any) => void;
}

type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed';

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  projectId,
  workflowId,
  onComplete,
}) => {
  const [connected, setConnected] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentAgent, setCurrentAgent] = useState('');
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((agent: string, message: string) => {
    setMessages(prev => [
      ...prev,
      {
        agent,
        message,
        timestamp: new Date().toISOString(),
      }
    ]);
  }, []);

  useEffect(() => {
    if (!workflowId) return;

    setStatus('running');
    setMessages([]);
    setCurrentStep(0);
    setTotalSteps(0);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/projects/${projectId}/ws`);

    ws.onopen = () => {
      setConnected(true);
      addMessage('Sistema', 'Conexión establecida');
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
      setStatus('failed');
      addMessage('Sistema', 'Error de conexión');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.event) {
          case 'step_started':
            setCurrentStep(data.step);
            setTotalSteps(data.total_steps);
            setCurrentAgent(data.agent_name);
            addMessage(data.agent_name, `Iniciando: ${data.description || 'Procesando...'}`);
            break;
            
          case 'step_completed':
            addMessage(data.agent_name, data.result_summary || 'Completado');
            break;
            
          case 'workflow_completed':
            setStatus('completed');
            setCurrentAgent('');
            addMessage('Sistema', 'Diagnóstico completado exitosamente');
            onComplete(data.results);
            break;
            
          case 'workflow_failed':
            setStatus('failed');
            setCurrentAgent('');
            addMessage('Sistema', data.error || 'Error en el diagnóstico');
            break;
            
          case 'agent_message':
            addMessage(data.agent_name, data.message);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [projectId, workflowId, onComplete, addMessage]);

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Ejecutando
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Esperando
          </Badge>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!workflowId && status === 'idle') {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Progreso del Diagnóstico
          </CardTitle>
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Paso {currentStep} de {totalSteps || '?'}
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress 
            value={progressPercent} 
            className={cn(
              "h-2 transition-all duration-500",
              status === 'completed' && "[&>div]:bg-green-500",
              status === 'failed' && "[&>div]:bg-red-500"
            )}
          />
        </div>

        {/* Current Agent */}
        {currentAgent && status === 'running' && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="relative">
              <Bot className="h-5 w-5 text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{currentAgent}</p>
              <p className="text-xs text-muted-foreground">Procesando...</p>
            </div>
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actividad
            </p>
            <div className="space-y-1">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded text-sm",
                    "animate-in fade-in slide-in-from-bottom-1 duration-300",
                    msg.agent === 'Sistema' 
                      ? 'bg-muted/50' 
                      : 'bg-background border'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(msg.timestamp)}
                  </span>
                  <span className="font-medium text-xs text-primary whitespace-nowrap">
                    {msg.agent}:
                  </span>
                  <span className="text-muted-foreground flex-1 text-xs">
                    {msg.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed State */}
        {status === 'completed' && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-sm text-green-700 dark:text-green-400">
                Diagnóstico completado
              </p>
              <p className="text-xs text-muted-foreground">
                Los resultados están disponibles
              </p>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-sm text-red-700 dark:text-red-400">
                Error en el diagnóstico
              </p>
              <p className="text-xs text-muted-foreground">
                Revisa los logs para más detalles
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowProgress;
