import React from 'react';
import { ChevronDown, Beaker, Wrench, DollarSign, Scale } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface AgentAnalysis {
  agent: string;
  analysis: string;
  confidence?: number;
}

interface AgentAnalysesAccordionProps {
  analyses: AgentAnalysis[];
  className?: string;
}

const agentConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  tecnico: { 
    icon: <Beaker className="h-4 w-4" />, 
    label: 'Experto Técnico',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  operativo: { 
    icon: <Wrench className="h-4 w-4" />, 
    label: 'Experto Operativo',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  economico: { 
    icon: <DollarSign className="h-4 w-4" />, 
    label: 'Experto Económico',
    color: 'text-green-400 bg-green-500/10 border-green-500/30'
  },
  regulatorio: { 
    icon: <Scale className="h-4 w-4" />, 
    label: 'Experto Regulatorio',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
};

export const AgentAnalysesAccordion: React.FC<AgentAnalysesAccordionProps> = ({
  analyses,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!analyses || analyses.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("mt-4", className)}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
        <span>Ver análisis de {analyses.length} expertos</span>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3 space-y-3">
        {analyses.map((item, index) => {
          const config = agentConfig[item.agent.toLowerCase()] || {
            icon: <Beaker className="h-4 w-4" />,
            label: item.agent,
            color: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
          };

          return (
            <div 
              key={index}
              className={cn(
                "rounded-lg border p-3",
                config.color
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {config.icon}
                <span className="font-medium text-sm">{config.label}</span>
                {item.confidence && (
                  <span className="ml-auto text-xs opacity-70">
                    {Math.round(item.confidence * 100)}% confianza
                  </span>
                )}
              </div>
              <div className="text-sm prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{item.analysis}</ReactMarkdown>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AgentAnalysesAccordion;
