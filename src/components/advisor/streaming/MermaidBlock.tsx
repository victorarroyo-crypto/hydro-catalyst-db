import { useState } from 'react';
import { MermaidRenderer } from '../MermaidRenderer';
import { cn } from '@/lib/utils';
import { AlertTriangle, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidBlockProps {
  content: string;
  className?: string;
}

/**
 * Safe wrapper for MermaidRenderer with error boundary behavior.
 * Shows source code as fallback if rendering fails.
 */
export function MermaidBlock({ content, className }: MermaidBlockProps) {
  const [hasError, setHasError] = useState(false);
  const [showSource, setShowSource] = useState(false);

  if (!content?.trim()) {
    return null;
  }

  // If there was an error or user wants to see source
  if (hasError || showSource) {
    return (
      <div className={cn(
        "my-4 rounded-lg border border-border overflow-hidden",
        hasError && "border-destructive/50",
        className
      )}>
        {hasError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              No se pudo renderizar el diagrama
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => {
                setHasError(false);
                setShowSource(false);
              }}
            >
              Reintentar
            </Button>
          </div>
        )}
        <div className="relative">
          {!hasError && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-7 text-xs gap-1"
              onClick={() => setShowSource(false)}
            >
              <Code className="h-3 w-3" />
              Ver diagrama
            </Button>
          )}
          <pre className="p-4 bg-muted/30 overflow-x-auto">
            <code className="text-xs font-mono text-muted-foreground whitespace-pre">
              {content}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={() => setShowSource(true)}
      >
        <Code className="h-3 w-3" />
        Ver código
      </Button>
      <MermaidRenderer 
        content={content} 
        onError={() => setHasError(true)}
      />
    </div>
  );
}
