import React from 'react';
import { Check, Loader2, Search, Database, Globe, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentState } from '@/hooks/useDeepAdvisorStream';

interface StreamingProgressProps {
  phase: string;
  phaseMessage: string;
  agents: Record<string, AgentState>;
  isStreaming: boolean;
  error: string | null;
}

interface PhaseStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PHASE_STEPS: PhaseStep[] = [
  { id: 'domain', label: 'Analizando dominio', icon: <Search className="h-3.5 w-3.5" /> },
  { id: 'rag', label: 'Buscando en KB', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'web', label: 'Buscando en web', icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'agents', label: 'Ejecutando agentes', icon: <Bot className="h-3.5 w-3.5" /> },
  { id: 'synthesis', label: 'Sintetizando respuesta', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

const PHASE_ORDER: Record<string, number> = {
  starting: -1,
  domain: 0,
  domain_analysis: 0,
  rag: 1,
  rag_search: 1,
  knowledge: 1,
  web: 2,
  web_search: 2,
  agents: 3,
  agent_execution: 3,
  synthesis: 4,
  synthesizing: 4,
  complete: 5,
};

const AGENT_LABELS: Record<string, string> = {
  technical: 'Técnico',
  operative: 'Operativo',
  economic: 'Económico',
  regulatory: 'Regulatorio',
};

export function StreamingProgress({
  phase,
  phaseMessage,
  agents,
  isStreaming,
  error,
}: StreamingProgressProps) {
  const currentPhaseIndex = PHASE_ORDER[phase] ?? -1;
  const agentList = Object.values(agents);
  const hasAgents = agentList.length > 0;

  const getStepStatus = (stepIndex: number): 'pending' | 'running' | 'complete' => {
    if (currentPhaseIndex > stepIndex) return 'complete';
    if (currentPhaseIndex === stepIndex) return 'running';
    return 'pending';
  };

  if (!isStreaming && !error && currentPhaseIndex < 0) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm animate-fade-in">
      <div className="space-y-2">
        {PHASE_STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const isAgentStep = step.id === 'agents';
          
          return (
            <div key={step.id}>
              <div
                className={cn(
                  'flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all text-sm',
                  status === 'complete' && 'text-green-600',
                  status === 'running' && 'text-[#32b4cd] bg-[#32b4cd]/5',
                  status === 'pending' && 'text-muted-foreground/50'
                )}
              >
                {/* Status Icon */}
                <span className="flex-shrink-0">
                  {status === 'complete' && <Check className="h-4 w-4" />}
                  {status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === 'pending' && <span className="h-4 w-4 flex items-center justify-center">○</span>}
                </span>

                {/* Step Icon */}
                <span className="flex-shrink-0">{step.icon}</span>

                {/* Label */}
                <span className={cn(
                  'flex-1',
                  status === 'running' && 'font-medium'
                )}>
                  {step.label}
                  {status === 'running' && '...'}
                </span>
              </div>

              {/* Agent Sub-list */}
              {isAgentStep && hasAgents && status !== 'pending' && (
                <div className="ml-8 mt-1 space-y-1">
                  {agentList.map(agent => (
                    <div
                      key={agent.id}
                      className={cn(
                        'flex items-center gap-2 py-1 px-2 rounded text-xs transition-all',
                        agent.status === 'complete' && 'text-green-600',
                        agent.status === 'running' && 'text-amber-600 bg-amber-50',
                        agent.status === 'failed' && 'text-red-500',
                        agent.status === 'pending' && 'text-muted-foreground/50'
                      )}
                    >
                      {/* Agent Status Icon */}
                      {agent.status === 'complete' && <Check className="h-3 w-3" />}
                      {agent.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {agent.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                      {agent.status === 'pending' && <span className="h-3 w-3 text-center">○</span>}

                      {/* Agent Label */}
                      <span>{AGENT_LABELS[agent.id] || agent.id}</span>

                      {/* Preview text if available */}
                      {agent.preview && agent.status === 'running' && (
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          – {agent.preview}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current phase message */}
      {phaseMessage && isStreaming && (
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-muted-foreground">
          {phaseMessage}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-3 pt-2 border-t border-red-100 text-xs text-red-500 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
