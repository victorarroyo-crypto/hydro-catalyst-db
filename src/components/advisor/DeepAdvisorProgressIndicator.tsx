import React, { useEffect, useState } from 'react';
import { Brain, Loader2, FlaskConical, Settings, DollarSign, ScrollText, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  status: string;
  complete: boolean;
  weight: number;
}

interface DeepAdvisorProgressIndicatorProps {
  isProcessing: boolean;
  onComplete?: () => void;
}

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'technical',
    name: 'Experto Técnico',
    icon: <FlaskConical className="h-4 w-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    status: 'Evaluando tecnologías y procesos',
    complete: false,
    weight: 40,
  },
  {
    id: 'operational',
    name: 'Experto Operativo',
    icon: <Settings className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    status: 'Analizando operación y mantenimiento',
    complete: false,
    weight: 30,
  },
  {
    id: 'economic',
    name: 'Experto Económico',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    status: 'Calculando costes y ROI',
    complete: false,
    weight: 15,
  },
  {
    id: 'regulatory',
    name: 'Experto Regulatorio',
    icon: <ScrollText className="h-4 w-4" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    status: 'Verificando normativa aplicable',
    complete: false,
    weight: 15,
  },
];

export function DeepAdvisorProgressIndicator({ isProcessing, onComplete }: DeepAdvisorProgressIndicatorProps) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [synthesizing, setSynthesizing] = useState(false);

  // Calculate overall progress
  const overallProgress = agents.reduce((acc, agent) => {
    return acc + (agent.complete ? agent.weight : 0);
  }, 0);

  // Simulate agent completion
  useEffect(() => {
    if (!isProcessing) {
      // Reset state when not processing
      setAgents(INITIAL_AGENTS);
      setSynthesizing(false);
      return;
    }

    // Random completion times for each agent (simulated)
    const timers = [
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.id === 'economic' ? { ...a, complete: true } : a));
      }, 1800 + Math.random() * 800),
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.id === 'technical' ? { ...a, complete: true } : a));
      }, 2200 + Math.random() * 1000),
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.id === 'operational' ? { ...a, complete: true } : a));
      }, 2600 + Math.random() * 800),
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.id === 'regulatory' ? { ...a, complete: true } : a));
      }, 3000 + Math.random() * 1000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  // Trigger synthesizing phase when all complete
  useEffect(() => {
    if (overallProgress === 100 && !synthesizing) {
      setSynthesizing(true);
      onComplete?.();
    }
  }, [overallProgress, synthesizing, onComplete]);

  if (!isProcessing) return null;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 my-4 border border-slate-700/50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className={cn("h-5 w-5 text-[#32b4cd]", !synthesizing && "animate-pulse")} />
        <div>
          <span className="font-medium text-white">
            {synthesizing ? 'Sintetizando respuesta...' : 'Analizando con expertos...'}
          </span>
          <p className="text-xs text-slate-400">
            Consultando múltiples perspectivas para una respuesta completa
          </p>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
              agent.complete ? "bg-green-900/20 border border-green-500/30" : "bg-slate-700/40 border border-slate-600/30"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              agent.complete ? "bg-green-500/20" : agent.bgColor
            )}>
              <span className={agent.complete ? "text-green-400" : agent.color}>
                {agent.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{agent.name}</div>
              <div className={cn(
                "text-xs truncate",
                agent.complete ? "text-green-400" : "text-slate-400"
              )}>
                {agent.complete ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Completado
                  </span>
                ) : (
                  agent.status
                )}
              </div>
            </div>
            {!agent.complete && (
              <Loader2 className={cn("h-4 w-4 animate-spin", agent.color)} />
            )}
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <Progress 
          value={synthesizing ? 100 : overallProgress} 
          className="h-2 bg-slate-700"
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {synthesizing 
              ? '✨ Generando respuesta final...' 
              : `${agents.filter(a => a.complete).length}/4 expertos completados`
            }
          </span>
          <span>{synthesizing ? '100' : overallProgress}%</span>
        </div>
      </div>
    </div>
  );
}

export default DeepAdvisorProgressIndicator;
