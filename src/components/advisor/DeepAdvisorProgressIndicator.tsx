import React, { useEffect, useState } from 'react';
import { Brain, Loader2, FlaskConical, Settings, DollarSign, ScrollText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  complete: boolean;
}

interface DeepAdvisorProgressIndicatorProps {
  isProcessing: boolean;
  onComplete?: () => void;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'technical', name: 'Técnico', icon: <FlaskConical className="h-3 w-3" />, color: 'text-blue-400', complete: false },
  { id: 'operational', name: 'Operativo', icon: <Settings className="h-3 w-3" />, color: 'text-orange-400', complete: false },
  { id: 'economic', name: 'Económico', icon: <DollarSign className="h-3 w-3" />, color: 'text-green-400', complete: false },
  { id: 'regulatory', name: 'Regulatorio', icon: <ScrollText className="h-3 w-3" />, color: 'text-purple-400', complete: false },
];

export function DeepAdvisorProgressIndicator({ isProcessing, onComplete }: DeepAdvisorProgressIndicatorProps) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [synthesizing, setSynthesizing] = useState(false);

  const completedCount = agents.filter(a => a.complete).length;

  useEffect(() => {
    if (!isProcessing) {
      setAgents(INITIAL_AGENTS);
      setSynthesizing(false);
      return;
    }

    const timers = [
      setTimeout(() => setAgents(prev => prev.map(a => a.id === 'economic' ? { ...a, complete: true } : a)), 1800 + Math.random() * 800),
      setTimeout(() => setAgents(prev => prev.map(a => a.id === 'technical' ? { ...a, complete: true } : a)), 2200 + Math.random() * 1000),
      setTimeout(() => setAgents(prev => prev.map(a => a.id === 'operational' ? { ...a, complete: true } : a)), 2600 + Math.random() * 800),
      setTimeout(() => setAgents(prev => prev.map(a => a.id === 'regulatory' ? { ...a, complete: true } : a)), 3000 + Math.random() * 1000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  useEffect(() => {
    if (completedCount === 4 && !synthesizing) {
      setSynthesizing(true);
      onComplete?.();
    }
  }, [completedCount, synthesizing, onComplete]);

  if (!isProcessing) return null;

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground py-2 animate-fade-in">
      <Brain className={cn("h-4 w-4 text-[#32b4cd]", !synthesizing && "animate-pulse")} />
      
      <div className="flex items-center gap-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
              agent.complete ? "bg-green-500/10 text-green-400" : "bg-muted/30"
            )}
          >
            <span className={agent.complete ? "text-green-400" : agent.color}>
              {agent.complete ? <Check className="h-3 w-3" /> : agent.icon}
            </span>
            <span className="hidden sm:inline">{agent.name}</span>
          </div>
        ))}
      </div>

      {!synthesizing ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : (
        <span className="text-xs text-[#32b4cd]">Sintetizando...</span>
      )}
    </div>
  );
}

export default DeepAdvisorProgressIndicator;
