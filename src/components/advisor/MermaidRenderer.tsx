import { useEffect, useState, useRef, useCallback } from 'react';
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
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

// Counter for unique IDs across all instances
let renderCounter = 0;

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const renderIdRef = useRef<number>(0);

  // Initialize mermaid when theme changes
  useEffect(() => {
    initializeMermaid(theme);
  }, [theme]);

  const renderDiagram = useCallback(async () => {
    if (!content.trim() || !containerRef.current) return;

    // Track this render to avoid race conditions
    renderIdRef.current += 1;
    const currentRenderId = renderIdRef.current;

    // Ensure mermaid is initialized
    if (!mermaidInitialized) {
      initializeMermaid(theme);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate truly unique ID for this render
      renderCounter += 1;
      const id = `mermaid-${renderCounter}-${Date.now()}`;
      
      // Clean up content
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
      }
      
      // Render to SVG string
      const { svg: renderedSvg } = await mermaid.render(id, cleanContent);
      
      // Only update if this is still the latest render request
      if (currentRenderId === renderIdRef.current && containerRef.current) {
        // Safely clear and update the container
        containerRef.current.innerHTML = renderedSvg;
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('Mermaid render error:', err);
      
      // Only update if this is still the latest render request
      if (currentRenderId === renderIdRef.current) {
        setError('Error al renderizar diagrama');
        setIsLoading(false);
      }
    }
  }, [content, theme]);

  // Render diagram when content changes
  useEffect(() => {
    renderDiagram();
    
    // Cleanup function - clear container when unmounting
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "my-4 pt-6 pb-4 px-4 bg-card rounded-lg border border-border overflow-x-auto",
        "[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto",
        isLoading && "min-h-32 animate-pulse bg-muted/30",
        className
      )}
    />
  );
}
