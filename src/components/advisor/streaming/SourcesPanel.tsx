import React from 'react';
import { BookOpen, Database, Globe, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreamSource } from '@/hooks/useDeepAdvisorStream';

interface SourcesPanelProps {
  sources: StreamSource[];
  className?: string;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  knowledge: <Database className="h-4 w-4" />,
  kb: <Database className="h-4 w-4" />,
  rag: <Database className="h-4 w-4" />,
  web: <Globe className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  regulation: <BookOpen className="h-4 w-4" />,
};

const SOURCE_LABELS: Record<string, string> = {
  knowledge: 'Base de Conocimiento',
  kb: 'Base de Conocimiento',
  rag: 'Documentos técnicos',
  web: 'Búsqueda web',
  document: 'Documentos',
  regulation: 'Normativa',
};

export function SourcesPanel({ sources, className }: SourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'mt-4 pt-4 border-t border-slate-200/60 animate-fade-in',
      className
    )}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
        <BookOpen className="h-4 w-4 text-[#307177]" />
        Fuentes utilizadas
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const icon = SOURCE_ICONS[source.type] || <FileText className="h-4 w-4" />;
          const label = source.name || SOURCE_LABELS[source.type] || source.type;

          return (
            <div
              key={`${source.type}-${index}`}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs',
                'bg-slate-100/80 text-slate-700 border border-slate-200/60',
                source.url && 'cursor-pointer hover:bg-slate-200/80 transition-colors'
              )}
              onClick={() => {
                if (source.url) {
                  window.open(source.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <span className="text-[#307177]">{icon}</span>
              <span>{label}</span>
              {source.count !== undefined && source.count > 0 && (
                <span className="bg-white/80 px-1.5 py-0.5 rounded-full font-medium">
                  {source.count}
                </span>
              )}
              {source.url && (
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
