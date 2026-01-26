import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExtractedFact } from '@/hooks/useDeepAdvisorStream';

interface SessionContextIndicatorProps {
  hasContext: boolean;
  factsExtracted?: ExtractedFact[];
  className?: string;
}

const FACT_ICONS: Record<string, string> = {
  parameter: '💧',
  technology: '⚙️',
  location: '📍',
  company: '🏢',
  regulation: '📜',
  capacity: '📊',
  cost: '💰',
  default: '📌',
};

export function SessionContextIndicator({ 
  hasContext, 
  factsExtracted = [],
  className 
}: SessionContextIndicatorProps) {
  if (!hasContext && factsExtracted.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Context indicator */}
      {hasContext && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <BookOpen className="w-3 h-3" />
          <span>Usando contexto de conversación anterior</span>
        </div>
      )}

      {/* Extracted facts */}
      {factsExtracted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            Datos extraídos:
          </span>
          {factsExtracted.map((fact, index) => {
            const icon = FACT_ICONS[fact.type] || FACT_ICONS.default;
            return (
              <span
                key={`${fact.key}-${index}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground text-xs"
                title={`${fact.type}: ${fact.key}`}
              >
                <span>{icon}</span>
                <span className="font-medium">{fact.key}:</span>
                <span className="text-muted-foreground">{fact.value}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
