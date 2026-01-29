import React from 'react';
import { Brain, Check, Loader2, X, AlertCircle, FlaskConical, Settings, DollarSign, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DeepAdvisorProgressProps {
  phase?: string;
  phaseDetail?: string;
  progress: number;
  agentStatus: Record<string, 'pending' | 'running' | 'complete' | 'failed'>;
  onCancel?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  starting: 'Inicializando...',
  init: 'Inicializando...',
  context: 'Recopilando contexto...',
  domain: 'Analizando dominio...',
  rag: 'Buscando en Knowledge Base...',
  web: 'Buscando en web...',
  agents: 'Analizando con agentes especializados...',
  synthesis: 'Sintetizando respuesta...',
  synthesizing: 'Sintetizando respuesta...',
  saving: 'Guardando en historial...',
  complete: 'Completado',
};

const AGENT_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  technical: { label: 'Técnico', icon: <FlaskConical className="h-3.5 w-3.5" /> },
  operative: { label: 'Operativo', icon: <Settings className="h-3.5 w-3.5" /> },
  economic: { label: 'Económico', icon: <DollarSign className="h-3.5 w-3.5" /> },
  regulatory: { label: 'Regulatorio', icon: <ScrollText className="h-3.5 w-3.5" /> },
};

export function DeepAdvisorProgress({
  phase,
  phaseDetail,
  progress,
  agentStatus,
  onCancel,
}: DeepAdvisorProgressProps) {
  const hasAgents = Object.keys(agentStatus).length > 0;
  const isAgentsPhase = phase === 'agents';

  return (
    <div className="p-4 bg-gradient-to-br from-[#32b4cd]/5 to-[#307177]/5 rounded-xl border border-[#32b4cd]/20 animate-fade-in">
      {/* Header with phase label and progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#32b4cd] animate-pulse" />
          <span className="font-medium text-[#307177]">
            {PHASE_LABELS[phase || 'init'] || phase || 'Procesando...'}
          </span>
        </div>
        <span className="text-sm font-medium text-[#32b4cd]">{progress}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#307177] to-[#32b4cd] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
      
      {/* Phase detail */}
      {phaseDetail && (
        <p className="text-sm text-muted-foreground mb-3">{phaseDetail}</p>
      )}
      
      {/* Agent status grid (when in agents phase or when agents have status) */}
      {hasAgents && (isAgentsPhase || Object.values(agentStatus).some(s => s !== 'pending')) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(agentStatus).map(([agentId, status]) => {
            const config = AGENT_CONFIG[agentId] || { label: agentId, icon: null };
            
            return (
              <div 
                key={agentId}
                className={cn(
                  'flex items-center gap-2 text-sm p-2 rounded-lg transition-all',
                  status === 'complete' && 'bg-green-50 text-green-700 border border-green-200',
                  status === 'running' && 'bg-amber-50 text-amber-700 border border-amber-200',
                  status === 'failed' && 'bg-red-50 text-red-700 border border-red-200',
                  status === 'pending' && 'bg-slate-50 text-slate-500 border border-slate-200'
                )}
              >
                {/* Status icon */}
                {status === 'complete' && <Check className="h-3.5 w-3.5" />}
                {status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {status === 'failed' && <AlertCircle className="h-3.5 w-3.5" />}
                {status === 'pending' && <span className="h-3.5 w-3.5 flex items-center justify-center text-xs">○</span>}
                
                {/* Agent icon and label */}
                {config.icon}
                <span className="font-medium">{config.label}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Cancel button */}
      {onCancel && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

export default DeepAdvisorProgress;
