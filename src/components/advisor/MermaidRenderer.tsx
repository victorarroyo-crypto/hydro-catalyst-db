import { useEffect, useState, useId, useCallback } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface MermaidRendererProps {
  content: string;
  className?: string;
}

// Initialize mermaid once at module level
let mermaidInitialized = false;

function initializeMermaid(theme: string | undefined) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
    },
    // Suppress console errors for invalid diagrams
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { theme } = useTheme();
  const uniqueId = useId().replace(/:/g, '-');

  // Initialize/reinitialize mermaid when theme changes
  useEffect(() => {
    initializeMermaid(theme);
  }, [theme]);

  const renderDiagram = useCallback(async () => {
    if (!content.trim()) return;

    // Ensure mermaid is initialized
    if (!mermaidInitialized) {
      initializeMermaid(theme);
    }

    try {
      // Generate unique ID for this render
      const id = `mermaid${uniqueId}${Math.random().toString(36).substr(2, 9)}`;
      
      // Clean up content - remove any stray backticks or fence markers
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
      }
      
      const { svg: renderedSvg } = await mermaid.render(id, cleanContent);
      setSvg(renderedSvg);
      setError(null);
    } catch (err) {
      console.warn('Mermaid render error:', err);
      
      // Retry up to 2 times with a small delay (helps with race conditions)
      if (retryCount < 2) {
        setTimeout(() => setRetryCount(prev => prev + 1), 100);
      } else {
        setError('Error al renderizar diagrama');
      }
    }
  }, [content, uniqueId, theme, retryCount]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

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
        "my-4 pt-6 pb-4 px-4 bg-card rounded-lg border border-border overflow-x-auto",
        "[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto",
        className
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
