import { useEffect, useState, useId } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface MermaidRendererProps {
  content: string;
  className?: string;
}

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const uniqueId = useId().replace(/:/g, '-');

  useEffect(() => {
    // Re-initialize mermaid with theme
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, [theme]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!content.trim()) return;

      try {
        const id = `mermaid${uniqueId}${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, content);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Error al renderizar diagrama');
      }
    };

    renderDiagram();
  }, [content, uniqueId, theme]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
        <p className="text-sm text-destructive">{error}</p>
        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-4 bg-muted/30 rounded-lg border border-border animate-pulse">
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "my-4 p-4 bg-card rounded-lg border border-border overflow-x-auto",
        "[&_svg]:max-w-full [&_svg]:h-auto",
        className
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
